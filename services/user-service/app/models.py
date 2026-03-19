from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    full_name = Column(String)
    email = Column(String)
    dob = Column(String)
    contact_number = Column(String)
    department = Column(String)
    position = Column(String)
    hire_date = Column(String)
    salary = Column(String)
    status = Column(String, default="Active")
    device_id = Column(String, unique=True, nullable=True) # Unique token for Mobile Linking
    credential_public_key = Column(TEXT, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    credential_id = Column(String, unique=True, index=True)
    public_key = Column(TEXT)
    sign_count = Column(Integer, default=0)
    transports = Column(String, nullable=True) # e.g. "internal,nfc"
