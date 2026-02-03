import redis
import json
import os
import time
import numpy as np
from .common.biometrics import get_face_embedding
from sqlalchemy import text
from .database import engine, SessionLocal
from .models import Base, FaceEmbedding

# Ensure pgvector extension is enabled
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

Base.metadata.create_all(bind=engine)

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
pubsub = redis_client.pubsub()
pubsub.subscribe("face_events")

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

print("Encoding Service Worker started. Listening for events...")

def process_event(event_data):
    try:
        data = json.loads(event_data)
        user_id = data.get("user_id")
        action = data.get("action")
        filename = data.get("file_path")
        
        if action == "ENCODE_FACE" and filename:
            print(f"Processing encoding for user {user_id}")
            
            file_path = os.path.join(UPLOAD_DIR, filename)
            if not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                return

            # Use lightweight CPU-bound embedding
            encoding_vector = get_face_embedding(file_path)
            
            if not encoding_vector:
                print(f"No face found in image for user {user_id}")
                return
                
            db = SessionLocal()
            try:
                # Check if user already has an embedding, or add new one
                # For this prototype, we'll just add. In production, we might update.
                new_embedding = FaceEmbedding(user_id=user_id, embedding=encoding_vector)
                db.add(new_embedding)
                db.commit()
                print(f"Saved real embedding for user {user_id}")
            except Exception as e:
                print(f"DB Error: {e}")
            finally:
                db.close()
                
    except Exception as e:
        print(f"Error processing event: {e}")

if __name__ == "__main__":
    for message in pubsub.listen():
        if message['type'] == 'message':
            process_event(message['data'])
