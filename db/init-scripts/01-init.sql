-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Optional: Create schemas if we want to separate service data more strictly
-- CREATE SCHEMA IF NOT EXISTS users_schema;
-- CREATE SCHEMA IF NOT EXISTS face_schema;
-- CREATE SCHEMA IF NOT EXISTS attendance_schema;
