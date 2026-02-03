# GEMINI.md

## Project Overview
This project is in its initial planning phase for a **Python-based Face Recognition Attendance System**. The intended architecture is microservices-oriented, requiring careful planning of databases, schemas, and service boundaries.

## Directory Overview
The current directory contains the foundational requirements and planning documents for the system. It serves as the starting point for architectural design and subsequent implementation.

## Key Files
- **plan.txt**: Outlines the core requirements.
- **ARCHITECTURE.md**: Detailed technical stack, microservices definitions, and data schema.
- **GEMINI.md**: This file, providing context and instructions for AI-assisted development.
- **dev_logs/**: Directory containing historical development logs and session summaries.

## Usage
**CRITICAL**: At the start of every session, you MUST read the latest log files in the `dev_logs/` directory to understand the current state of the project, recent changes, and pending tasks.

Future interactions should focus on:
1.  **Database Implementation**: Setting up PostgreSQL with pgvector.
2.  **Service Development**: Implementing the User and Face Encoding services first.
3.  **Integration**: Connecting services via Redis/REST.

## Development Goals (TODO)
- [x] Create detailed Architecture Document.
- [x] Define Database Schema (SQL models in each service).
- [x] Initialize Microservices (Docker setup and scaffolding).
- [ ] Implement robust error handling and logging.
- [ ] Add Frontend or CLI for system interaction.
