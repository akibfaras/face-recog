from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status = Column(String) # e.g., "CHECK_IN", "CHECK_OUT"
    method = Column(String, default="FACE") # "FACE" or "FINGERPRINT"
