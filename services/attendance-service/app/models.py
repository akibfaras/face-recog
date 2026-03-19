from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    department = Column(String)
    employee_id = Column(String)

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    status = Column(String) # CHECK_IN, CHECK_OUT
    method = Column(String) # FACE, FINGERPRINT
    device = Column(String, nullable=True) # e.g. MFS110, FRONT_CAMERA
    confidence_score = Column(Float, nullable=True) # L2 Distance from AI model
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
