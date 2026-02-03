import cv2
import numpy as np
import os

# Using Haar Cascade for ultra-fast CPU detection
# In a real app, you'd download the xml, but OpenCV often has it bundled or we can use a simpler method
cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(cascade_path)

def get_face_embedding(image_path_or_bytes):
    """
    Ultra-lightweight face processing for CPU-bound college projects.
    1. Detect face using Haar Cascades
    2. Crop and resize to 64x64
    3. Flatten and normalize as a 128D 'pseudo-embedding'
    (Alternatively, uses a simple mean-block feature extraction)
    """
    if isinstance(image_path_or_bytes, str):
        img = cv2.imread(image_path_or_bytes)
    else:
        nparr = np.frombuffer(image_path_or_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return None

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) == 0:
        return None

    # Get the largest face
    (x, y, w, h) = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
    face_roi = gray[y:y+h, x:x+w]
    
    # Resize to 32x32 for a 1024D vector, then downsample to 128D via pooling
    # This is a 'Classic' computer vision approach suitable for CPU
    resized = cv2.resize(face_roi, (32, 32))
    
    # Simple feature extraction: Block means (8x8 blocks -> 4x4 blocks -> 16 regions)
    # To keep it compatible with our 128D vector requirement, let's just resize to 16x8 and flatten
    feature_vector = cv2.resize(face_roi, (16, 8)).flatten().astype(float)
    
    # Normalize
    norm = np.linalg.norm(feature_vector)
    if norm > 0:
        feature_vector = feature_vector / norm
        
    return feature_vector.tolist()
