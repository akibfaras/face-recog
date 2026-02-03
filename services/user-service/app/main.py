from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
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

@app.post("/users/{user_id}/enroll")
async def enroll_face(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Save the file locally
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{user_id}_{uuid.uuid4()}{file_extension}"
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