from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from . import models, database
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Attendance Service")

@app.get("/")
def read_root():
    return {"service": "Attendance Service", "status": "online"}

@app.post("/attendance/log")
def log_attendance(user_id: int, status: str = "CHECK_IN", method: str = "FACE", db: Session = Depends(get_db)):
    # In a real app, we might check if the user exists via User Service API
    # but for simplicity we log directly.
    new_record = models.Attendance(user_id=user_id, status=status, method=method)
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@app.get("/attendance/{user_id}", response_model=List[dict])
def get_user_attendance(user_id: int, db: Session = Depends(get_db)):
    records = db.query(models.Attendance).filter(models.Attendance.user_id == user_id).all()
    return [{"id": r.id, "timestamp": r.timestamp, "status": r.status} for r in records]
