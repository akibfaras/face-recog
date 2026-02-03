from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import numpy as np
import httpx
import os
import io
from .common.biometrics import get_face_embedding

from . import models, database
from .database import get_db

app = FastAPI(title="Recognition Service")

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
                params={"user_id": user_id, "status": "CHECK_IN"}
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
