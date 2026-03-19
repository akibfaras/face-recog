from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import numpy as np
import httpx
import os
import io
from .common.biometrics import get_face_embedding

from . import models, database
from .database import get_db

app = FastAPI(title="Recognition Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ATTENDANCE_SERVICE_URL = os.getenv("ATTENDANCE_SERVICE_URL", "http://attendance-service:8000")
RECOGNITION_THRESHOLD = 0.5 # Adjusted for simpler feature vectors

@app.get("/")
def read_root():
    return {"service": "Recognition Service", "status": "online"}

@app.post("/recognize")
async def recognize_face(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Load image and get encoding using lightweight CPU method
    contents = await file.read()
    target_encoding = get_face_embedding(contents)
    
    if not target_encoding:
        raise HTTPException(status_code=400, detail="No face detected in image")
    
    # 2. Vector search using pgvector
    # <-> is the L2 distance operator in pgvector
    match = db.query(models.FaceEmbedding).order_by(
        models.FaceEmbedding.embedding.l2_distance(target_encoding)
    ).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="No users registered in system")
    
    # Check distance
    distance = db.scalar(match.embedding.l2_distance(target_encoding))
    
    if distance > RECOGNITION_THRESHOLD:
        return {"match": False, "distance": float(distance), "message": "Face not recognized"}
    
    # 3. If match found, log attendance
    user_id = match.user_id
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ATTENDANCE_SERVICE_URL}/attendance/log",
                params={
                    "user_id": user_id, 
                    "status": "CHECK_IN",
                    "confidence_score": float(distance)
                }
            )
            resp.raise_for_status()
            attendance_data = resp.json()
    except Exception as e:
        print(f"Error calling Attendance Service: {e}")
        return {"match": True, "user_id": user_id, "distance": float(distance), "attendance_error": str(e)}

    return {
        "match": True,
        "user_id": user_id,
        "distance": float(distance),
        "attendance": attendance_data
    }

@app.post("/recognize/vision-fingerprint")
async def recognize_vision_fingerprint(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    AI Research Approach:
    Uses laptop camera to take a macro shot of the finger.
    In a real system, this would use OpenCV to enhance ridges and CNN to match.
    For this prototype, we simulate a successful match after 'processing' the image.
    """
    contents = await file.read()
    # Dummy processing simulation
    processing_score = 0.98 # high confidence mock
    
    # Just grab the first user for the demo
    user = db.query(models.FaceEmbedding).first()
    if not user:
         raise HTTPException(status_code=404, detail="No users registered in system")
         
    user_id = user.user_id
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ATTENDANCE_SERVICE_URL}/attendance/log",
                params={
                    "user_id": user_id, 
                    "status": "CHECK_IN",
                    "confidence_score": processing_score
                }
            )
            resp.raise_for_status()
            attendance_data = resp.json()
    except Exception as e:
        return {"match": True, "user_id": user_id, "distance": processing_score, "attendance_error": str(e)}

    return {
        "match": True,
        "user_id": user_id,
        "distance": processing_score,
        "attendance": attendance_data,
        "method": "VISION_FINGERPRINT"
    }

@app.post("/recognize/usb-fingerprint")
async def recognize_usb_fingerprint(user_id: int, db: Session = Depends(get_db)):
    """
    Standard USB Scanner Approach (e.g. DigitalPersona / Mantra)
    This endpoint assumes the hardware has already sent the template and we matched it.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ATTENDANCE_SERVICE_URL}/attendance/log",
                params={
                    "user_id": user_id, 
                    "status": "CHECK_IN",
                    "confidence_score": 1.0 # Hardware match is absolute
                }
            )
            resp.raise_for_status()
            attendance_data = resp.json()
    except Exception as e:
        return {"match": True, "user_id": user_id, "distance": 1.0, "attendance_error": str(e)}

    return {
        "match": True,
        "user_id": user_id,
        "distance": 1.0,
        "attendance": attendance_data,
        "method": "USB_FINGERPRINT"
    }
