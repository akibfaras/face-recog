from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    dob = Column(String)
    contact_number = Column(String)
    department = Column(String)
    position = Column(String)
    hire_date = Column(String)
    salary = Column(String)
    status = Column(String, default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
