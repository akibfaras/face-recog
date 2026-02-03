from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
import numpy as np
import httpx
import os

from . import models, database
from .database import engine, get_db

# Ensure pgvector extension is enabled
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fingerprint Service")

ATTENDANCE_SERVICE_URL = os.getenv("ATTENDANCE_SERVICE_URL", "http://attendance-service:8000")

@app.get("/")
def read_root():
    return {"service": "Fingerprint Service", "status": "online"}

from pydantic import BaseModel

class TemplateData(BaseModel):
    raw_template: str

@app.post("/fingerprint/enroll/{user_id}")
async def enroll_fingerprint(user_id: int, data: TemplateData, db: Session = Depends(get_db)):
    # In a real Morpho setup, you'd store the minutiae string
    # For matching with pgvector, we'd ideally convert the template to a feature vector
    # But for a college project, we can store the raw template and use string matching 
    # or a simplified hash.
    
    # Let's keep the vector simulation but seed it with the raw template hash 
    # to make it "deterministic" for the same finger.
    import hashlib
    seed = int(hashlib.sha256(data.raw_template.encode()).hexdigest(), 16) % (2**32)
    np.random.seed(seed)
    template_vector = np.random.rand(64).tolist()
    
    new_template = models.FingerprintTemplate(user_id=user_id, template=template_vector)
    db.add(new_template)
    db.commit()
    
    return {"message": "Fingerprint hardware data enrolled", "user_id": user_id}

@app.post("/fingerprint/verify")
async def verify_fingerprint(data: TemplateData, db: Session = Depends(get_db)):
    import hashlib
    seed = int(hashlib.sha256(data.raw_template.encode()).hexdigest(), 16) % (2**32)
    np.random.seed(seed)
    search_vector = np.random.rand(64).tolist()
    
    # Match using pgvector similarity
    match = db.query(models.FingerprintTemplate).order_by(
        models.FingerprintTemplate.template.l2_distance(search_vector)
    ).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="No match found")

    user_id = match.user_id
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ATTENDANCE_SERVICE_URL}/attendance/log",
                params={"user_id": user_id, "status": "CHECK_IN", "method": "FINGERPRINT"}
            )
            resp.raise_for_status()
            attendance_data = resp.json()
    except Exception as e:
        return {"match": True, "user_id": user_id, "error": str(e)}

    return {
        "match": True, 
        "user_id": user_id, 
        "method": "FINGERPRINT",
        "attendance": attendance_data
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ATTENDANCE_SERVICE_URL}/attendance/log",
                params={"user_id": user_id, "status": "CHECK_IN", "method": "FINGERPRINT"}
            )
            resp.raise_for_status()
            attendance_data = resp.json()
    except Exception as e:
        return {"match": True, "user_id": user_id, "error": str(e)}

    return {
        "match": True, 
        "user_id": user_id, 
        "method": "FINGERPRINT",
        "attendance": attendance_data
    }
