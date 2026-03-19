import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from app.common.biometrics import get_face_embedding

@patch("cv2.imread")
@patch("cv2.CascadeClassifier.detectMultiScale")
@patch("cv2.cvtColor")
@patch("cv2.resize")
def test_get_face_embedding_success(mock_resize, mock_cvt, mock_detect, mock_imread):
    # Mock image
    mock_imread.return_value = np.zeros((100, 100, 3), dtype=np.uint8)
    mock_cvt.return_value = np.zeros((100, 100), dtype=np.uint8)
    mock_detect.return_value = [[10, 10, 50, 50]]
    mock_resize.return_value = np.zeros((16, 8), dtype=np.uint8)
    
    result = get_face_embedding("fake.jpg")
    assert result is not None
    assert len(result) == 128

@patch("cv2.imdecode")
@patch("cv2.CascadeClassifier.detectMultiScale")
def test_get_face_embedding_no_face(mock_detect, mock_decode):
    mock_decode.return_value = np.zeros((100, 100, 3), dtype=np.uint8)
    mock_detect.return_value = []
    
    result = get_face_embedding(b"fake-bytes")
    assert result is None

def test_get_face_embedding_invalid_input():
    with patch("cv2.imread", return_value=None):
        result = get_face_embedding("invalid.jpg")
        assert result is None
