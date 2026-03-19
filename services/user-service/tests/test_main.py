import pytest
from fastapi.testclient import TestClient
from app.main import app, get_db
from unittest.mock import patch, MagicMock

client = TestClient(app)

class MockUser:
    def __init__(self, **kwargs):
        for k, v in kwargs.items(): setattr(self, k, v)
        self.id = 1

class MockDB:
    def __init__(self):
        self.query_mock = MagicMock()
        self.query_mock.filter.return_value = self.query_mock
        self.query_mock.offset.return_value = self.query_mock
        self.query_mock.limit.return_value = self.query_mock
        self.query_mock.all.return_value = []
        # Return None by default for 'first' to simulate 'not found'
        self.query_mock.first.return_value = None
        
    def query(self, *args, **kwargs): return self.query_mock
    def add(self, obj): pass
    def commit(self): pass
    def refresh(self, obj): obj.id = 1
    def delete(self, obj): pass

def override_get_db():
    yield MockDB()

app.dependency_overrides[get_db] = override_get_db

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200

def test_create_user():
    data = {
        "employee_id": "NEW001",
        "full_name": "John Doe",
        "department": "Engineering"
    }
    # first() returns None, so user doesn't exist
    response = client.post("/users/", json=data)
    assert response.status_code == 200
    assert response.json()["full_name"] == "John Doe"

def test_link_device():
    # Setup mock to find user
    db = MockDB()
    db.query_mock.first.return_value = MockUser(employee_id="EMP001", full_name="John Doe")
    app.dependency_overrides[get_db] = lambda: db
    
    data = {"employee_id": "EMP001", "device_id": "DEV123"}
    response = client.post("/users/link-device", json=data)
    assert response.status_code == 200
    assert response.json()["message"] == "Device linked successfully"

def test_get_me():
    db = MockDB()
    db.query_mock.first.return_value = MockUser(employee_id="EMP001", device_id="DEV123")
    app.dependency_overrides[get_db] = lambda: db
    
    response = client.get("/users/me?device_id=DEV123")
    assert response.status_code == 200

@patch("app.main.redis_client")
def test_enroll_face(mock_redis):
    db = MockDB()
    db.query_mock.first.return_value = MockUser(id=1)
    app.dependency_overrides[get_db] = lambda: db
    
    files = {"file": ("face.jpg", b"fake-data", "image/jpeg")}
    response = client.post("/users/1/enroll", files=files)
    assert response.status_code == 200

def test_upload_profile_photo():
    db = MockDB()
    db.query_mock.first.return_value = MockUser(id=1)
    app.dependency_overrides[get_db] = lambda: db
    
    files = {"file": ("profile.jpg", b"fake-data", "image/jpeg")}
    response = client.post("/users/1/profile-photo", files=files)
    assert response.status_code == 200

def test_upload_fingerprint():
    response = client.post("/users/1/fingerprint", json={"data": "template"})
    assert response.status_code == 200
