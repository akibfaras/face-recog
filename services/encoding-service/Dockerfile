FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONPATH=/app

COPY services/encoding-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy common into app/common to match the .common import in worker.py
COPY services/common ./app/common
COPY services/encoding-service/app ./app

CMD ["python", "-m", "app.worker"]
