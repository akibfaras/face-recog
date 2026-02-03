@echo off
set DATABASE_URL=postgresql://user:password@localhost:5432/face_recog
set REDIS_URL=redis://localhost:6379/0
set UPLOAD_DIR=../../data/uploads
set ATTENDANCE_SERVICE_URL=http://localhost:9002

if not exist "data\uploads" mkdir data\uploads

echo Starting User Service on 9001...
cd services\user-service
start /B uvicorn app.main:app --host 0.0.0.0 --port 9001
cd ..\..

echo Starting Attendance Service on 9002...
cd services\attendance-service
start /B uvicorn app.main:app --host 0.0.0.0 --port 9002
cd ..\..

echo Starting Recognition Service on 9003...
cd services\recognition-service
start /B uvicorn app.main:app --host 0.0.0.0 --port 9003
cd ..\..

echo Starting Fingerprint Service on 9004...
cd services\fingerprint-service
start /B uvicorn app.main:app --host 0.0.0.0 --port 9004
cd ..\..

echo Starting Encoding Worker...
cd services\encoding-service
start /B python -m app.worker
cd ..\..

echo All backend services are starting in the background.
pause