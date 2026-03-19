import pytest
from fastapi.testclient import TestClient
from app.main import app, get_db
from unittest.mock import patch, MagicMock
import json

client = TestClient(app)

class MockDB:
    def __init__(self):
        self.query_mock = MagicMock()
        self.query_mock.filter.return_value = self.query_mock
        self.query_mock.distinct.return_value = self.query_mock
        self.query_mock.count.return_value = 1
        self.query_mock.scalar.return_value = 0.5
        self.query_mock.all.return_value = []
        self.query_mock.join.return_value = self.query_mock
        self.query_mock.group_by.return_value = self.query_mock
        
    def query(self, *args, **kwargs): return self.query_mock
    def add(self, obj): pass
    def commit(self): pass
    def refresh(self, obj): obj.id = 1

def override_get_db():
    yield MockDB()

app.dependency_overrides[get_db] = override_get_db

@patch("app.main.redis_client")
def test_create_session(mock_redis):
    response = client.post("/attendance/session/create")
    assert response.status_code == 200
    assert "session_id" in response.json()

@patch("app.main.redis_client")
def test_get_session_status(mock_redis):
    mock_redis.get.return_value = json.dumps({"status": "PENDING", "type": "VERIFY"})
    response = client.get("/attendance/session/fake-id")
    assert response.status_code == 200

@patch("app.main.redis_client")
def test_verify_session(mock_redis):
    mock_redis.get.return_value = json.dumps({"captured_data": {}})
    response = client.post("/attendance/session/fake-id/verify?user_id=1")
    assert response.status_code == 200

def test_log_attendance():
    response = client.post("/attendance/log?user_id=1&status=CHECK_IN")
    assert response.status_code == 200

def test_get_stats_overview():
    response = client.get("/attendance/stats/overview")
    assert response.status_code == 200
    assert "present_today" in response.json()
