# Multimodal Biometric Attendance System

A comprehensive, microservices-based attendance system utilizing **Face Recognition** and **Mobile Biometric Authentication**. Optimized for CPU-bound performance, making it ideal for college projects and standard hardware.

## 🚀 One-Click Deployment

If you have **Docker Desktop** and **Node.js** installed, simply:

1.  **Clone** this repository.
2.  Double-click the `deploy.bat` file in the root directory.

This script will automatically:
*   Build and start all backend microservices in Docker.
*   Configure persistent storage for your database and images.
*   Install frontend dependencies.
*   Launch the React dashboard in your browser.

## 🛠 Tech Stack

*   **Frontend**: React (Tailwind CSS, Lucide Icons, QR Code generation).
*   **Backend**: Python (FastAPI).
*   **AI/Biometrics**: OpenCV (Haar Cascades for Face), WebAuthn (Simulated via Mobile-as-Scanner).
*   **Database**: PostgreSQL with `pgvector` for high-speed similarity search.
*   **Broker**: Redis for asynchronous task queuing and real-time mobile session tracking.
*   **Containerization**: Docker & Docker Compose.

## 🏗 Microservices Architecture

*   **User Service (9001)**: Comprehensive employee profile management.
*   **Attendance Service (9002)**: Logs check-in/out events and manages short-lived mobile verification sessions via Redis.
*   **Recognition Service (9003)**: Real-time face matching pipeline.
*   **Encoding Service**: Background worker for generating face embeddings.

## 🔌 Hardware Integration (Mobile-as-Scanner)

This system uses a modern "Bring Your Own Device" (BYOD) approach, eliminating the need for finicky USB fingerprint scanners:
1.  The Laptop dashboard generates a dynamic, session-backed QR code.
2.  Users scan the code with their smartphone camera.
3.  The phone opens a secure verification link, simulating native biometric authentication.
4.  Success is instantly reflected on the main dashboard via real-time polling.

## 📝 Requirements

*   **Windows 10/11**
*   **Docker Desktop** (with Linux Containers enabled)
*   **Node.js** (v16 or higher)
