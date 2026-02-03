FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONPATH=/app

COPY services/attendance-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/attendance-service/app ./app

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

