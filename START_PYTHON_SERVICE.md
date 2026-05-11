# Starting the Python AI Service

The backend is trying to connect to the Python AI service but it's not running. You need to start it.

## Quick Start

Open a new terminal in the `python-ai` directory and run:

```bash
cd python-ai
python app/main.py
```

Or using uvicorn directly:

```bash
cd python-ai
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Prerequisites

Make sure you have:
1. Python 3.9+ installed
2. All dependencies installed: `pip install -r requirements.txt`
3. Environment variables configured (check `.env` file)

## Verify It's Running

Once started, you should see:
- Server running on http://localhost:8000
- API docs available at http://localhost:8000/docs

## Alternative: Use Docker

If you prefer to use Docker for all services:

```bash
# From the project root
docker-compose up -d python-ai
```

This will start just the Python AI service in Docker.

## Current Issue

The error you're seeing:
```
Error importing network: POST /api/map/import-network 500
Error fetching network: GET /api/map/network/latest 500
```

This happens because the backend (running on port 5000) is trying to call the Python service (port 8000), but the Python service isn't running.

## After Starting

Once the Python service is running, refresh your browser and the map page should work correctly.
