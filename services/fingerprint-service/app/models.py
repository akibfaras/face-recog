from sqlalchemy import Column, Integer
from pgvector.sqlalchemy import Vector
from .database import Base

class FingerprintTemplate(Base):
    __tablename__ = "fingerprint_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    template = Column(Vector(64)) # Simulating fingerprint template as a 64D vector
