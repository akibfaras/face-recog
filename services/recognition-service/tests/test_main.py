import pytest
from fastapi.testclient import TestClient
from app.main import app, get_db
import io
from unittest.mock import patch, MagicMock
from app import models

client = TestClient(app)

class MockDB:
    def __init__(self):
        self.mock_user = MagicMock()
        self.mock_user.user_id = 1
        self.mock_user.embedding = MagicMock()
        self.mock_user.embedding.l2_distance.return_value = 0.1
        
        self.query_mock = MagicMock()
        self.query_mock.order_by.return_value = self.query_mock
        self.query_mock.first.return_value = self.mock_user
        
    def query(self, *args, **kwargs):
        return self.query_mock
        
    def scalar(self, *args, **kwargs):
        return 0.1
        
    def commit(self): pass
    def refresh(self, obj): pass
    def add(self, obj): pass

def override_get_db():
    yield MockDB()

app.dependency_overrides[get_db] = override_get_db

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200

@patch("app.main.get_face_embedding")
def test_recognize_no_face(mock_embedding):
    mock_embedding.return_value = None
    response = client.post("/recognize", files={"file": ("test.jpg", b"fake", "image/jpeg")})
    assert response.status_code == 400

@patch("app.main.get_face_embedding")
def test_recognize_success(mock_embedding):
    mock_embedding.return_value = [0.1] * 128
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": 1})
        mock_post.return_value.raise_for_status = MagicMock()
        response = client.post("/recognize", files={"file": ("test.jpg", b"fake", "image/jpeg")})
        assert response.status_code == 200

def test_recognize_vision_fingerprint():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": 1})
        mock_post.return_value.raise_for_status = MagicMock()
        # Mock the query specifically for this test
        with patch.object(MockDB, 'query') as mock_query:
            mock_query.return_value.first.return_value = MagicMock(user_id=1)
            response = client.post("/recognize/vision-fingerprint", files={"file": ("finger.jpg", b"fake", "image/jpeg")})
            assert response.status_code == 200

def test_recognize_usb_fingerprint():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": 1})
        mock_post.return_value.raise_for_status = MagicMock()
        response = client.post("/recognize/usb-fingerprint?user_id=1")
        assert response.status_code == 200
