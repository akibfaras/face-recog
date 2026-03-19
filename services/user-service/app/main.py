from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import List
import redis
import os
import json
import uuid
import shutil

from . import models, database
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="User & Enrollment Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis for event-driven triggers
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class UserCreate(BaseModel):
    employee_id: str
    full_name: str
    email: str = None
    dob: str = None
    contact_number: str = None
    department: str = None
    position: str = None
    hire_date: str = None
    salary: str = None
    status: str = "Active"

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import RegistrationCredential, AuthenticationCredential
from webauthn.helpers.cos_to_json import options_to_json

RP_ID = os.getenv("RP_ID", "localhost")
RP_NAME = "Aayam Face-Recog"
ORIGIN = os.getenv("ORIGIN", f"https://{RP_ID}")

# --- Passkey Registration ---

@app.get("/users/{user_id}/passkey/register/options")
def get_passkey_register_options(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check existing credentials
    existing_creds = db.query(models.WebAuthnCredential).filter(
        models.WebAuthnCredential.user_id == user_id
    ).all()
    
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=str(user.id),
        user_name=user.employee_id,
        exclude_credentials=[{
            "id": bytes.fromhex(c.credential_id),
            "type": "public-key"
        } for c in existing_creds],
        authenticator_selection={"authenticator_attachment": "platform"}
    )
    
    # Store challenge in Redis for 5 mins
    redis_client.setex(f"passkey_reg_challenge:{user.id}", 300, options.challenge)
    
    return json.loads(options_to_json(options))

@app.post("/users/{user_id}/passkey/register/verify")
async def verify_passkey_register(user_id: int, data: dict, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    challenge = redis_client.get(f"passkey_reg_challenge:{user_id}")
    
    if not challenge:
        raise HTTPException(status_code=400, detail="Challenge expired or not found")
    
    try:
        verification = verify_registration_response(
            credential=data,
            expected_challenge=challenge,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
        )
        
        # Save credential
        new_cred = models.WebAuthnCredential(
            user_id=user.id,
            credential_id=verification.credential_id.hex(),
            public_key=verification.credential_public_key.hex(),
            sign_count=verification.sign_count
        )
        db.add(new_cred)
        db.commit()
        
        return {"status": "Success", "credential_id": new_cred.credential_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Passkey Authentication ---

@app.get("/users/{user_id}/passkey/login/options")
def get_passkey_login_options(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    creds = db.query(models.WebAuthnCredential).filter(models.WebAuthnCredential.user_id == user_id).all()
    
    if not creds:
        raise HTTPException(status_code=400, detail="No passkeys registered for this user")
        
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=[{
            "id": bytes.fromhex(c.credential_id),
            "type": "public-key"
        } for c in creds]
    )
    
    redis_client.setex(f"passkey_auth_challenge:{user.id}", 300, options.challenge)
    return json.loads(options_to_json(options))

@app.post("/users/{user_id}/passkey/login/verify")
async def verify_passkey_login(user_id: int, data: dict, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    challenge = redis_client.get(f"passkey_auth_challenge:{user_id}")
    
    # Find the credential
    credential_id = data.get("id")
    db_cred = db.query(models.WebAuthnCredential).filter(
        models.WebAuthnCredential.credential_id == credential_id
    ).first()
    
    try:
        verification = verify_authentication_response(
            credential=data,
            expected_challenge=challenge,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
            credential_public_key=bytes.fromhex(db_cred.public_key),
            credential_current_sign_count=db_cred.sign_count
        )
        
        # Update sign count
        db_cred.sign_count = verification.new_sign_count
        db.commit()
        
        return {"status": "Verified", "user_id": user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
def read_root():
    return {"service": "User Service", "status": "online"}

@app.post("/users/")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.employee_id == user.employee_id).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Employee ID already registered")
    
    new_user = models.User(
        employee_id=user.employee_id, 
        full_name=user.full_name, 
        email=user.email,
        dob=user.dob,
        contact_number=user.contact_number,
        department=user.department,
        position=user.position,
        hire_date=user.hire_date,
        salary=user.salary,
        status=user.status
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[dict])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return [{
        "id": u.id, 
        "employee_id": u.employee_id, 
        "full_name": u.full_name,
        "department": u.department,
        "position": u.position,
        "status": u.status
    } for u in users]

@app.get("/users/me")
def get_user_by_device(device_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.device_id == device_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Device not linked")
    return user

class LinkDeviceRequest(BaseModel):
    employee_id: str
    device_id: str

@app.post("/users/link-device")
def link_device(data: LinkDeviceRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.employee_id == data.employee_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee ID not found")
    
    # Check if device is already linked to someone else
    existing = db.query(models.User).filter(models.User.device_id == data.device_id).first()
    if existing and existing.id != user.id:
        raise HTTPException(status_code=400, detail="Device already linked to another employee")
    
    user.device_id = data.device_id
    db.commit()
    db.refresh(user)
    return {"message": "Device linked successfully", "full_name": user.full_name, "user_id": user.id}

@app.post("/users/{user_id}/enroll")
async def enroll_face(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Save the file locally
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"face_{user_id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    event = {
        "user_id": user.id,
        "action": "ENCODE_FACE",
        "file_path": filename,
        "timestamp": str(func.now())
    }

    redis_client.publish("face_events", json.dumps(event))

    return {"message": "Enrollment triggered", "user_id": user.id, "filename": filename}

@app.post("/users/{user_id}/profile-photo")
async def upload_profile_photo(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    filename = f"profile_{user_id}_{uuid.uuid4()}.jpg"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"message": "Profile photo saved", "filename": filename}

@app.post("/users/{user_id}/fingerprint")
async def upload_fingerprint(user_id: int, data: dict, db: Session = Depends(get_db)):
    # In a real system, this would save raw template data
    return {"message": "Biometric template registered", "user_id": user_id}