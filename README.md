# Multimodal Biometric Attendance System

A comprehensive, microservices-based attendance system utilizing **Face Recognition** and **Fingerprint Authentication**. Optimized for CPU-bound performance, making it ideal for college projects and standard hardware.

## 🚀 One-Click Deployment

If you have **Docker Desktop** and **Node.js** installed, simply:

1.  **Clone** this repository.
2.  Double-click the `deploy.bat` file in the root directory.

This script will automatically:
*   Build and start all 5 backend microservices in Docker.
*   Configure persistent storage for your database and images.
*   Install frontend dependencies.
*   Launch the React dashboard in your browser.

## 🛠 Tech Stack

*   **Frontend**: React (Tailwind CSS, Lucide Icons).
*   **Backend**: Python (FastAPI).
*   **AI/Biometrics**: OpenCV (Haar Cascades for Face), deterministic vector hashing for Fingerprints.
*   **Database**: PostgreSQL with `pgvector` for high-speed similarity search.
*   **Broker**: Redis for asynchronous task queuing.
*   **Containerization**: Docker & Docker Compose.

## 🏗 Microservices Architecture

*   **User Service (9001)**: Comprehensive employee profile management.
*   **Attendance Service (9002)**: Logs check-in/out events with method tracking.
*   **Recognition Service (9003)**: Real-time face matching pipeline.
*   **Fingerprint Service (9004)**: Hardware-ready template enrollment and matching.
*   **Encoding Service**: Background worker for generating face embeddings.

## 🔌 Hardware Integration (Safran Morpho)

For physical fingerprint integration:
1.  Ensure Morpho drivers are installed on the host machine.
2.  The `Fingerprint Service` is ready to receive raw minutiae from a local agent script.
3.  A sample `morpho_agent.py` can be used to bridge the USB hardware to the Dockerized backend.

## 📝 Requirements

*   **Windows 10/11**
*   **Docker Desktop** (with Linux Containers enabled)
*   **Node.js** (v16 or higher)
