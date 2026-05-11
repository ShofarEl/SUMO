# Prediction API Documentation

This document describes the Machine Learning prediction endpoints for the Georgetown Traffic AI system.

## Overview

The prediction API provides endpoints for training and using LSTM and Random Forest models to predict traffic conditions. The backend acts as a proxy to the Python AI service, storing model metadata in MongoDB.

## Authentication

All prediction endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Train LSTM Model

Train a new LSTM traffic prediction model.

**Endpoint:** `POST /api/predictions/lstm/train`

**Access:** Researcher, Admin

**Request Body:**
```json
{
  "model_name": "lstm_georgetown_v1",
  "training_data": [
    {
      "queue_length": 45.5,
      "vehicle_arrivals": 12.3,
      "time_of_day": 0.35,
      "weather": 0
    }
  ],
  "epochs": 50,
  "batch_size": 32,
  "validation_split": 0.2,
  "sequence_length": 15,
  "prediction_horizon": 10,
  "lstm_units": [64, 32],
  "dropout_rate": 0.2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modelId": "507f1f77bcf86cd799439011",
    "pythonModelId": "lstm_georgetown_v1_1234567890",
    "model_name": "lstm_georgetown_v1",
    "model_type": "lstm",
    "training_rmse": 0.0245,
    "training_mae": 0.0189,
    "validation_rmse": 0.0258,
    "validation_mae": 0.0195,
    "model_path": "/models/lstm_georgetown_v1.keras",
    "training_time": 45.3,
    "additional_metrics": {
      "epochs_trained": 50,
      "sequence_length": 15,
      "prediction_horizon": 10
    }
  }
}
```

### 2. Get LSTM Prediction

Make predictions using a trained LSTM model.

**Endpoint:** `POST /api/predictions/lstm`

**Access:** All authenticated users

**Request Body:**
```json
{
  "model_name": "lstm_georgetown_v1",
  "input_sequence": [
    {
      "queue_length": 45.5,
      "vehicle_arrivals": 12.3,
      "time_of_day": 0.35,
      "weather": 0
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "model_name": "lstm_georgetown_v1",
    "model_type": "lstm",
    "predictions": [46.2, 47.1, 48.5, 49.2, 50.1, 51.3, 52.0, 52.8, 53.5, 54.1],
    "confidence": {
      "mean": 50.38,
      "std": 2.45,
      "min": 46.2,
      "max": 54.1
    },
    "prediction_time": 0.0234
  }
}
```

### 3. Train Random Forest Model

Train a new Random Forest traffic prediction model.

**Endpoint:** `POST /api/predictions/rf/train`

**Access:** Researcher, Admin

**Request Body:**
```json
{
  "model_name": "rf_georgetown_v1",
  "training_data": [...],
  "n_estimators": 100,
  "max_depth": 20,
  "validation_split": 0.2,
  "prediction_steps": 10,
  "optimize_hyperparams": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modelId": "507f1f77bcf86cd799439012",
    "pythonModelId": "rf_georgetown_v1_1234567890",
    "model_name": "rf_georgetown_v1",
    "model_type": "random_forest",
    "training_rmse": 0.0312,
    "training_mae": 0.0221,
    "validation_rmse": 0.0345,
    "validation_mae": 0.0238,
    "model_path": "/models/rf_georgetown_v1.pkl",
    "training_time": 12.7,
    "topFeatures": {
      "queue_length_current": 0.234,
      "queue_length_lag_1": 0.189,
      "vehicle_arrivals_rolling_mean_5": 0.156
    }
  }
}
```

### 4. Get Random Forest Prediction

Make predictions using a trained Random Forest model.

**Endpoint:** `POST /api/predictions/rf`

**Access:** All authenticated users

**Request Body:**
```json
{
  "model_name": "rf_georgetown_v1",
  "input_sequence": [...]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "model_name": "rf_georgetown_v1",
    "model_type": "random_forest",
    "predictions": [48.5],
    "confidence": {
      "mean": 48.5,
      "std": 3.2,
      "min": 42.1,
      "max": 54.9,
      "prediction_interval_95": [42.2, 54.8]
    },
    "prediction_time": 0.0089
  }
}
```

### 5. Compare Models

Compare multiple prediction models on the same test data.

**Endpoint:** `POST /api/predictions/compare`

**Access:** All authenticated users

**Request Body:**
```json
{
  "model_names": ["lstm_georgetown_v1", "rf_georgetown_v1"],
  "test_data": [...],
  "actual_values": [45.2, 46.8, 48.1, ...]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comparison": [
      {
        "model_name": "lstm_georgetown_v1",
        "rmse": 0.0258,
        "mae": 0.0195,
        "rank": 1
      },
      {
        "model_name": "rf_georgetown_v1",
        "rmse": 0.0345,
        "mae": 0.0238,
        "rank": 2
      }
    ],
    "best_model": "lstm_georgetown_v1",
    "num_models_compared": 2,
    "num_test_samples": 100
  }
}
```

### 6. Get Prediction History

Get list of trained models.

**Endpoint:** `GET /api/predictions/history`

**Access:** All authenticated users (users see only their models, admins see all)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by model type (lstm, random_forest)

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "lstm_georgetown_v1",
        "type": "lstm",
        "version": "1.0",
        "trainedBy": {
          "_id": "507f1f77bcf86cd799439010",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "performance": {
          "rmse": 0.0258,
          "mae": 0.0195
        },
        "isDeployed": false,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "totalPages": 5,
    "currentPage": 1,
    "total": 87
  }
}
```

### 7. Get Model Details

Get detailed information about a specific model.

**Endpoint:** `GET /api/predictions/models/:id`

**Access:** Model owner or Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "lstm_georgetown_v1",
    "type": "lstm",
    "version": "1.0",
    "trainedBy": {...},
    "trainingConfig": {
      "hyperparameters": {...},
      "epochs": 50,
      "batchSize": 32,
      "architecture": {...}
    },
    "performance": {
      "rmse": 0.0258,
      "mae": 0.0195,
      "trainingLoss": [...],
      "validationLoss": [...],
      "convergenceEpoch": 45
    },
    "modelPath": "/models/lstm_georgetown_v1.keras",
    "isDeployed": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### 8. Delete Model

Delete a trained model.

**Endpoint:** `DELETE /api/predictions/models/:id`

**Access:** Model owner or Admin

**Response:**
```json
{
  "success": true,
  "message": "Model deleted successfully"
}
```

## Data Format

### Training Data Point

```typescript
{
  queue_length: number;      // Queue length in meters (>= 0)
  vehicle_arrivals: number;  // Vehicle arrivals per minute (>= 0)
  time_of_day: number;       // Normalized time 0-1 (0=midnight, 0.5=noon, 1=midnight)
  weather: number;           // Weather code (0=clear, 1=rain, 2=flood)
}
```

### Input Sequence

For LSTM: Array of 15 data points (15-minute history)
For Random Forest: Array of data points (minimum 5 for feature engineering)

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request data
- `MODEL_NOT_FOUND` - Requested model doesn't exist
- `ACCESS_DENIED` - Insufficient permissions
- `TRAINING_FAILED` - Model training failed
- `PREDICTION_FAILED` - Prediction generation failed
- `SERVICE_UNAVAILABLE` - Python AI service unavailable

## Performance Targets

Based on requirements 4.1 and 4.2:

| Model | RMSE Target | MAE Target |
|-------|-------------|------------|
| LSTM | < 0.0263 | < 0.02 |
| Random Forest | < 0.0352 | < 0.025 |

## Notes

- Training data must have at least 100 samples
- LSTM requires sequential data with consistent timesteps
- Random Forest performs automatic feature engineering
- Models are stored in the Python service and metadata in MongoDB
- Training can take several minutes depending on data size and epochs
- Predictions are typically returned in < 100ms

## Related Documentation

- [Authentication API](./README_AUTH.md)
- [Simulation API](./README_SIMULATION_API.md)
- [Python ML Service](../../python-ai/app/services/ml/README.md)
