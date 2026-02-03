FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Add current dir to python path
ENV PYTHONPATH=/app

COPY services/recognition-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy common first
COPY services/common ./common
# Copy service app
COPY services/recognition-service/app ./app

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
