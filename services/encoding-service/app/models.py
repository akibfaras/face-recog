from sqlalchemy import Column, Integer, ForeignKey
from pgvector.sqlalchemy import Vector
from .database import Base

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Linking to User ID from User Service
    embedding = Column(Vector(128)) # dlib face_recognition produces 128D vectors
