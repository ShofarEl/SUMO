# Prediction Accuracy Evaluation API

This document describes the prediction accuracy evaluation endpoints for assessing ML model performance.

## Overview

The evaluation API provides endpoints to:
- Calculate RMSE and MAE metrics for predictions
- Compare predictions against actual simulation data
- Store performance metrics in the database
- Generate accuracy reports
- Compare multiple models

## Endpoints

### 1. Evaluate Model

Evaluate a prediction model against test data.

**Endpoint:** `POST /api/evaluations/:modelName`

**Authentication:** Required (Researcher, Admin)

**Request Body:**
```json
{
  "testData": [
    {
      "queue_length": 15.5,
      "vehicle_arrivals": 12,
      "time_of_day": 0.35,
      "weather": 0
    }
  ],
  "actualValues": [18.2, 19.5, 20.1],
  "simulationId": "optional_simulation_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "evaluationId": "eval_id",
    "modelName": "lstm_traffic_v1",
    "modelType": "lstm",
    "metrics": {
      "rmse": 0.0245,
      "mae": 0.0189,
      "mse": 0.0006,
      "r2_score": 0.95,
      "mean_error": -0.002,
      "std_error": 0.024,
      "median_error": -0.001,
      "mape": 2.5
    },
    "baselineComparison": {
      "modelRmse": 0.0245,
      "modelMae": 0.0189,
      "baselineRmse": 0.0352,
      "baselineMae": 0.0275,
      "rmseImprovementPercent": 30.4,
      "maeImprovementPercent": 31.3,
      "isBetterThanBaseline": true
    },
    "targetAchievement": {
      "targetRmse": 0.0263,
      "targetMae": 0.02,
      "meetsRmseTarget": true,
      "meetsMaeTarget": true,
      "meetsAllTargets": true
    },
    "summary": {
      "overallPerformance": "excellent",
      "recommendation": "Deploy"
    },
    "reportPath": "/path/to/evaluation/report.json"
  }
}
```

### 2. Evaluate Against Simulation

Evaluate model accuracy against actual simulation results.

**Endpoint:** `POST /api/evaluations/:modelName/simulation/:simulationId`

**Authentication:** Required (Researcher, Admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "evaluationId": "eval_id",
    "modelName": "rf_traffic_v1",
    "simulationId": "sim_id",
    "metrics": { ... },
    "baselineComparison": { ... },
    "targetAchievement": { ... },
    "summary": { ... }
  }
}
```

### 3. Compare Models

Compare multiple models on the same test data.

**Endpoint:** `POST /api/evaluations/compare`

**Authentication:** Required (Researcher, Admin)

**Request Body:**
```json
{
  "modelNames": ["lstm_v1", "rf_v1", "lstm_v2"],
  "testData": [ ... ],
  "actualValues": [ ... ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comparison": [
      {
        "model_name": "lstm_v2",
        "rmse": 0.0235,
        "mae": 0.0180,
        "rank": 1
      },
      {
        "model_name": "lstm_v1",
        "rmse": 0.0245,
        "mae": 0.0189,
        "rank": 2
      },
      {
        "model_name": "rf_v1",
        "rmse": 0.0310,
        "mae": 0.0220,
        "rank": 3
      }
    ],
    "bestModel": "lstm_v2",
    "numModelsCompared": 3,
    "numTestSamples": 100
  }
}
```

### 4. Get All Evaluations

Get all evaluations with filtering and pagination.

**Endpoint:** `GET /api/evaluations`

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `modelType` (optional): Filter by model type (lstm, random_forest, etc.)
- `meetsTargets` (optional): Filter by target achievement (true/false)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "evaluations": [ ... ],
    "totalPages": 5,
    "currentPage": 1,
    "total": 47
  }
}
```

### 5. Get Model Evaluations

Get evaluation history for a specific model.

**Endpoint:** `GET /api/evaluations/model/:modelName`

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "evaluations": [
      {
        "_id": "eval_id",
        "modelName": "lstm_v1",
        "modelType": "lstm",
        "metrics": { ... },
        "targetAchievement": { ... },
        "createdAt": "2024-01-15T10:30:00Z",
        "evaluatedBy": {
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "totalPages": 3,
    "currentPage": 1,
    "total": 25
  }
}
```

### 6. Get Evaluation by ID

Get detailed information about a specific evaluation.

**Endpoint:** `GET /api/evaluations/:evaluationId`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "eval_id",
    "modelId": { ... },
    "modelName": "lstm_v1",
    "modelType": "lstm",
    "evaluatedBy": { ... },
    "simulationId": { ... },
    "metrics": { ... },
    "baselineComparison": { ... },
    "targetAchievement": { ... },
    "summary": { ... },
    "numSamples": 100,
    "evaluationData": {
      "testDataSource": "simulation",
      "actualValues": [ ... ]
    },
    "reportPath": "/path/to/report.json",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 7. Generate Accuracy Report

Generate a formatted accuracy report for an evaluation.

**Endpoint:** `GET /api/evaluations/:evaluationId/report`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Prediction Accuracy Report - lstm_v1",
    "generatedAt": "2024-01-15T11:00:00Z",
    "model": {
      "name": "lstm_v1",
      "type": "lstm",
      "version": "1.0.0"
    },
    "evaluation": {
      "date": "2024-01-15T10:30:00Z",
      "numSamples": 100,
      "dataSource": "simulation"
    },
    "metrics": { ... },
    "baselineComparison": { ... },
    "targetAchievement": { ... },
    "summary": { ... },
    "recommendations": [
      "Deploy",
      "Model meets all accuracy targets and is ready for deployment"
    ]
  }
}
```

## Evaluation Metrics

### Core Metrics

- **RMSE (Root Mean Square Error)**: Square root of average squared differences
  - Target for LSTM: ≤ 0.0263
  - Target for Random Forest: ≤ 0.0352

- **MAE (Mean Absolute Error)**: Average absolute differences
  - Target for LSTM: ≤ 0.02
  - Target for Random Forest: ≤ 0.025

- **MSE (Mean Square Error)**: Average squared differences

- **R² Score**: Coefficient of determination (0-1, higher is better)

- **Mean Error**: Average prediction error (bias indicator)

- **Std Error**: Standard deviation of errors (consistency indicator)

- **MAPE (Mean Absolute Percentage Error)**: Average percentage error

### Baseline Comparison

Compares model performance against a persistence baseline (last known value):
- RMSE improvement percentage
- MAE improvement percentage
- Better than baseline indicator

### Target Achievement

Evaluates whether model meets predefined accuracy targets:
- Meets RMSE target
- Meets MAE target
- Meets all targets (both RMSE and MAE)

### Performance Rating

- **Excellent**: Meets all targets
- **Good**: Within 1.5x of targets
- **Acceptable**: Within 2x of targets
- **Needs Improvement**: Exceeds 2x of targets

## Database Schema

Evaluations are stored in the `PredictionEvaluation` collection:

```javascript
{
  modelId: ObjectId,
  modelName: String,
  modelType: String,
  evaluatedBy: ObjectId,
  simulationId: ObjectId (optional),
  metrics: {
    rmse: Number,
    mae: Number,
    mse: Number,
    r2Score: Number,
    meanError: Number,
    stdError: Number,
    medianError: Number,
    mape: Number,
    directionalAccuracy: Number
  },
  baselineComparison: { ... },
  targetAchievement: { ... },
  summary: { ... },
  numSamples: Number,
  evaluationData: { ... },
  reportPath: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Usage Examples

### Example 1: Evaluate LSTM Model

```javascript
const response = await fetch('/api/evaluations/lstm_traffic_v1', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    testData: testSequences,
    actualValues: actualQueueLengths
  })
});

const result = await response.json();
console.log(`RMSE: ${result.data.metrics.rmse}`);
console.log(`Meets targets: ${result.data.targetAchievement.meetsAllTargets}`);
```

### Example 2: Compare Models

```javascript
const response = await fetch('/api/evaluations/compare', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    modelNames: ['lstm_v1', 'rf_v1'],
    testData: testData,
    actualValues: actualValues
  })
});

const result = await response.json();
console.log(`Best model: ${result.data.bestModel}`);
```

### Example 3: Get Evaluation History

```javascript
const response = await fetch('/api/evaluations/model/lstm_v1?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
result.data.evaluations.forEach(eval => {
  console.log(`${eval.createdAt}: RMSE=${eval.metrics.rmse}`);
});
```

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

Common error codes:
- `MODEL_NOT_FOUND`: Model doesn't exist
- `SIMULATION_NOT_FOUND`: Simulation doesn't exist
- `SIMULATION_NOT_COMPLETED`: Simulation not finished
- `NO_SIMULATION_DATA`: No data available for evaluation
- `EVALUATION_NOT_FOUND`: Evaluation doesn't exist
- `VALIDATION_ERROR`: Invalid request data

## Requirements Satisfied

This implementation satisfies the following requirements from task 7.4:

✅ Calculate RMSE and MAE metrics
✅ Compare predictions against actual simulation data
✅ Store performance metrics in database
✅ Generate accuracy reports

Related requirements:
- Requirement 4.2: Prediction accuracy targets (RMSE, MAE)
- Requirement 4.4: Display predicted vs actual with charts
- Requirement 4.5: Model comparison with performance metrics
