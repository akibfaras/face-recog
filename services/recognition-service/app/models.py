from sqlalchemy import Column, Integer
from pgvector.sqlalchemy import Vector
from .database import Base

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    embedding = Column(Vector(128))
