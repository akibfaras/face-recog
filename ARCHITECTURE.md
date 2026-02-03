# Architecture & Tech Stack

## 1. Tech Stack Overview
- **Backend**: Python (FastAPI)
- **Face Processing**: `face_recognition` (dlib), OpenCV
- **Database**: PostgreSQL with `pgvector` (for vector similarity search)
- **Message Broker**: Redis (for task queuing and inter-service events)
- **Containerization**: Docker, Docker Compose

## 2. Microservices Architecture

### A. API Gateway (Entry Point)
- **Responsibility**: Routing requests, Authentication (JWT), and Rate Limiting.
- **Tech**: Nginx or a FastAPI-based gateway.

### B. User & Enrollment Service
- **Responsibility**: Manage user profiles, upload initial "base" photos.
- **Dependencies**: PostgreSQL.
- **Actions**: Triggers "Encoding Task" when a new user is added.

### C. Face Encoding Service (Worker)
- **Responsibility**: Process images to extract 128D or 512D face embeddings.
- **Tech**: `face_recognition` / `InsightFace`.
- **Dependencies**: Redis (Task Queue).

### D. Recognition Service
- **Responsibility**: Receive real-time images, extract embeddings, and query the Database for matches using vector similarity.
- **Dependencies**: PostgreSQL (pgvector).

### E. Attendance Service
- **Responsibility**: Log check-in/check-out times, generate reports.
- **Dependencies**: PostgreSQL.

### F. Fingerprint Service
- **Responsibility**: Manage fingerprint template enrollment and matching.
- **Dependencies**: PostgreSQL (pgvector).

## 3. Data Schema (Draft)
- **Users Table**: `id`, `name`, `employee_id`, `created_at`
- **Face_Embeddings Table**: `id`, `user_id`, `embedding` (vector type), `metadata`
- **Fingerprint_Templates Table**: `id`, `user_id`, `template` (vector type)
- **Attendance Table**: `id`, `user_id`, `timestamp`, `status` (IN/OUT), `method` (FACE/FINGERPRINT)

## 4. Communication Flow
1. **Enrollment**: Client -> API Gateway -> User Service -> (Async) -> Face Encoding Service -> DB.
2. **Attendance**: Camera/Client -> API Gateway -> Recognition Service -> DB (match found) -> Attendance Service -> DB.
