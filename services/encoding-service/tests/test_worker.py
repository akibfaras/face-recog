import pytest
import json
from unittest.mock import patch, MagicMock
from app.worker import process_event

@patch("app.worker.SessionLocal")
@patch("app.worker.get_face_embedding")
@patch("os.path.exists")
def test_process_event_success(mock_exists, mock_embedding, mock_session):
    mock_exists.return_value = True
    mock_embedding.return_value = [0.1] * 128
    
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    
    event = {
        "user_id": 1,
        "action": "ENCODE_FACE",
        "file_path": "test.jpg"
    }
    
    process_event(json.dumps(event))
    
    assert mock_db.add.called
    assert mock_db.commit.called
    assert mock_db.close.called

def test_process_event_invalid_json():
    # Should not crash
    process_event("invalid-json")

@patch("os.path.exists")
def test_process_event_file_not_found(mock_exists):
    mock_exists.return_value = False
    event = {
        "user_id": 1,
        "action": "ENCODE_FACE",
        "file_path": "missing.jpg"
    }
    process_event(json.dumps(event))
    # Should return early
