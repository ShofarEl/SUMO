# Georgetown Traffic AI - Python Service

This is the Python-based AI microservice for the Georgetown Traffic AI Management System. It handles SUMO traffic simulation, machine learning prediction models, and reinforcement learning-based signal control.

## Technology Stack

- **FastAPI**: Modern web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI
- **Pydantic**: Data validation using Python type annotations
- **SUMO**: Simulation of Urban Mobility for traffic simulation
- **PyTorch**: Deep learning framework for RL agents
- **TensorFlow/Keras**: For LSTM models
- **scikit-learn**: For Random Forest models
- **OSMnx**: For OpenStreetMap data processing

## Project Structure

```
python-ai/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── health.py          # Health check endpoints
│   │   ├── sumo.py            # SUMO simulation endpoints
│   │   ├── ml.py              # Machine learning endpoints
│   │   ├── rl.py              # Reinforcement learning endpoints
│   │   └── data.py            # Data processing endpoints
│   ├── core/                   # Core configuration
│   │   ├── config.py          # Application settings
│   │   ├── logging.py         # Logging configuration
│   │   └── middleware.py      # FastAPI middleware
│   ├── models/                 # Pydantic models
│   │   └── schemas.py         # Request/response schemas
│   ├── services/               # Business logic
│   │   ├── sumo/              # SUMO simulation services
│   │   ├── ml/                # ML model services
│   │   └── rl/                # RL agent services
│   ├── utils/                  # Utility functions
│   │   └── helpers.py         # Helper functions
│   └── main.py                # FastAPI application entry point
├── logs/                       # Application logs
├── models/                     # Trained model storage
├── tests/                      # Unit and integration tests
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker configuration
└── README.md                   # This file
```

## Installation

### Prerequisites

- Python 3.9+
- SUMO (Simulation of Urban Mobility)

### Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Configure SUMO_HOME environment variable:
```bash
# Linux/Mac
export SUMO_HOME=/usr/share/sumo

# Windows
set SUMO_HOME=C:\Program Files\SUMO
```

## Running the Service

### Development Mode

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or simply:
```bash
python app/main.py
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Using Docker

```bash
docker build -t georgetown-traffic-ai-python .
docker run -p 8000:8000 georgetown-traffic-ai-python
```

## API Documentation

Once the service is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Check
- `GET /health/` - Basic health check
- `GET /health/detailed` - Detailed health check with service status

### SUMO Simulation
- `GET /api/sumo/` - SUMO service information
- (Additional endpoints will be implemented in future tasks)

### Machine Learning
- `GET /api/ml/` - ML service information
- (Additional endpoints will be implemented in future tasks)

### Reinforcement Learning
- `GET /api/rl/` - RL service information
- (Additional endpoints will be implemented in future tasks)

### Data Processing
- `GET /api/data/` - Data processing service information
- (Additional endpoints will be implemented in future tasks)

## Testing

Run the test script to verify the service is working:

```bash
python test_service.py
```

## Configuration

Configuration is managed through environment variables defined in `.env`:

- `ENVIRONMENT`: Development or production mode
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `MONGODB_URI`: MongoDB connection string
- `SUMO_HOME`: Path to SUMO installation
- `MODEL_STORAGE_PATH`: Path for storing trained models
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)

## Logging

Logs are written to:
- `logs/app.log` - All application logs
- `logs/error.log` - Error logs only
- Console output - Formatted log messages

## Development

### Adding New Endpoints

1. Create a new router in `app/api/`
2. Define Pydantic models in `app/models/schemas.py`
3. Implement business logic in `app/services/`
4. Register the router in `app/main.py`

### Code Style

- Follow PEP 8 style guide
- Use type hints for all functions
- Document functions with docstrings
- Keep functions focused and modular

## Next Steps

The following features will be implemented in future tasks:
- SUMO simulation integration with OSMnx
- LSTM traffic prediction model
- Random Forest prediction model
- DQN reinforcement learning agent
- Multi-agent RL coordination
- Real-time WebSocket updates

## License

This project is part of the Georgetown Traffic AI Management System research platform.
