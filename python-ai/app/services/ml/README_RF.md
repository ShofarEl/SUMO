# Random Forest Traffic Prediction Model

## Overview

The Random Forest traffic prediction model is a fully implemented ensemble machine learning model that predicts short-term traffic conditions using decision trees with comprehensive feature engineering.

## Implementation Status

✅ **COMPLETE** - All components implemented and verified

## Features Implemented

### 1. Core Model Implementation
- **File**: `random_forest_model.py`
- **Class**: `RandomForestTrafficPredictor`
- scikit-learn `RandomForestRegressor` with configurable hyperparameters
- Supports n_estimators, max_depth, min_samples_split, min_samples_leaf, max_features
- StandardScaler for feature normalization
- Random state for reproducibility

### 2. Feature Engineering
The model implements comprehensive feature engineering including:

#### Lagged Features
- Historical queue lengths (lag 1-5)
- Historical vehicle arrivals (lag 1-5)

#### Rolling Statistics
- Rolling mean and std for windows of 3, 5, and 10 time steps
- Applied to both queue length and vehicle arrivals

#### Rate of Change
- First and second order differences for queue length
- First order difference for vehicle arrivals

#### Time-Based Features
- Hour of day extraction
- Peak hour indicators (morning 7-9am, evening 4-6:30pm)
- Separate morning and evening peak flags

#### Interaction Features
- Queue-to-vehicle ratio
- Congestion index (queue × arrivals)

### 3. Hyperparameter Optimization
- GridSearchCV implementation for automated hyperparameter tuning
- Optimizes: n_estimators, max_depth, min_samples_split, min_samples_leaf
- Cross-validation with configurable folds
- Negative MSE scoring for best model selection

### 4. Training Pipeline
- Train/validation split with configurable ratio (default 20%)
- Feature scaling with StandardScaler
- Progress logging during training
- Comprehensive metrics calculation:
  - RMSE (Root Mean Squared Error)
  - MAE (Mean Absolute Error)
  - R² Score
  - Separate metrics for training and validation sets

### 5. Prediction with Confidence
- Predictions using all trained trees
- Confidence intervals calculated from tree ensemble variance
- Returns:
  - Mean prediction
  - Standard deviation
  - Min/max predictions
  - 95% confidence interval

### 6. Feature Importance
- Automatic calculation of feature importance scores
- Sorted by importance (highest to lowest)
- Stored with model for interpretability
- Top features returned in training results

### 7. Model Persistence
- Save/load functionality using pickle
- Saves three files:
  - Model file (.pkl)
  - Scaler file (_scaler.pkl)
  - Config file (_config.pkl) with hyperparameters and feature names
- Preserves all model state for reproducibility

### 8. Model Evaluation
- Separate evaluation method for test data
- Calculates RMSE, MAE, MSE, R² on test set
- Error statistics (mean error, std error)
- Number of test samples tracked

## API Endpoints

### Training Endpoint
**POST** `/api/ml/rf/train`

Request body:
```json
{
  "model_name": "georgetown_rf_v1",
  "training_data": [
    {
      "queue_length": 25.5,
      "vehicle_arrivals": 12.3,
      "time_of_day": 0.35,
      "weather": 0
    }
  ],
  "n_estimators": 100,
  "max_depth": 20,
  "validation_split": 0.2,
  "prediction_steps": 10,
  "optimize_hyperparams": false
}
```

Response:
```json
{
  "model_id": "rf_georgetown_rf_v1_1234567890",
  "model_name": "georgetown_rf_v1",
  "model_type": "random_forest",
  "training_rmse": 2.45,
  "training_mae": 1.82,
  "validation_rmse": 2.67,
  "validation_mae": 1.95,
  "model_path": "./models/georgetown_rf_v1.pkl",
  "training_time": 12.34,
  "additional_metrics": {
    "n_estimators": 100,
    "max_depth": 20,
    "num_features": 45,
    "r2_score": 0.89,
    "top_features": {
      "queue_length_current": 0.234,
      "queue_length_lag_1": 0.187,
      "vehicle_arrivals_current": 0.145
    }
  }
}
```

### Prediction Endpoint
**POST** `/api/ml/rf/predict`

Request body:
```json
{
  "model_name": "georgetown_rf_v1",
  "input_sequence": [
    {
      "queue_length": 25.5,
      "vehicle_arrivals": 12.3,
      "time_of_day": 0.35,
      "weather": 0
    }
  ]
}
```

Response:
```json
{
  "model_name": "georgetown_rf_v1",
  "model_type": "random_forest",
  "predictions": [26.8, 27.2, 28.1],
  "confidence": {
    "mean": 27.37,
    "std": 1.23,
    "min": 24.5,
    "max": 30.2,
    "prediction_interval_95": [24.96, 29.78]
  },
  "prediction_time": 0.0234
}
```

## Performance Requirements

According to Requirements 4.1 and 4.2:

- **Target RMSE**: < 0.0352 (normalized)
- **Target MAE**: < 0.025 (normalized)

The model is designed to meet these targets through:
1. Comprehensive feature engineering
2. Hyperparameter optimization
3. Ensemble learning with multiple trees
4. Proper train/validation split

## Usage Example

```python
from app.services.ml.random_forest_model import RandomForestTrafficPredictor
import pandas as pd

# Initialize model
model = RandomForestTrafficPredictor(
    n_estimators=100,
    max_depth=20,
    random_state=42
)

# Prepare training data
data = pd.DataFrame({
    'queue_length': [...],
    'vehicle_arrivals': [...],
    'time_of_day': [...],
    'weather': [...]
})

# Train model
results = model.train(
    data=data,
    target_column='queue_length',
    prediction_steps=10,
    validation_split=0.2,
    optimize_hyperparams=True  # Enable hyperparameter optimization
)

print(f"Validation RMSE: {results['validation_rmse']:.4f}")
print(f"Validation MAE: {results['validation_mae']:.4f}")
print(f"R² Score: {results['validation_r2']:.4f}")

# Save model
model.save_model(
    model_path="./models",
    model_name="my_rf_model"
)

# Make predictions
predictions, confidence = model.predict(test_data)
print(f"Predictions: {predictions}")
print(f"95% CI: {confidence['prediction_interval_95']}")
```

## Backend Integration

The Random Forest model is fully integrated with the Node.js backend:

### Routes
- `POST /api/predictions/rf/train` - Train model
- `POST /api/predictions/rf` - Make predictions
- `POST /api/predictions/compare` - Compare with other models
- `GET /api/predictions/history` - Get model history

### Controllers
- `trainRandomForest()` - Handles training requests
- `predictRandomForest()` - Handles prediction requests
- Stores model metadata in MongoDB

### Services
- `pythonAIService.trainRandomForest()` - Calls Python API
- `pythonAIService.predictRandomForest()` - Calls Python API

### Validators
- `rfTrainSchema` - Validates training requests
- `predictionSchema` - Validates prediction requests

## Model Storage

Models are stored in the `MODEL_STORAGE_PATH` directory (default: `./models`):

```
models/
├── georgetown_rf_v1.pkl           # Model file
├── georgetown_rf_v1_scaler.pkl    # Scaler file
└── georgetown_rf_v1_config.pkl    # Configuration file
```

## Advantages Over LSTM

1. **No sequence requirement**: Can predict from single data points
2. **Feature interpretability**: Feature importance scores show what matters
3. **Faster training**: No backpropagation or epochs
4. **Robust to outliers**: Tree-based methods handle outliers well
5. **No vanishing gradients**: Not affected by gradient issues
6. **Confidence intervals**: Natural uncertainty quantification from tree ensemble

## Next Steps

The Random Forest model is complete and ready for use. Future enhancements could include:

1. **Online learning**: Update model with new data without full retraining
2. **Feature selection**: Automatic feature selection based on importance
3. **Ensemble stacking**: Combine with LSTM predictions
4. **Temporal validation**: Time-series cross-validation
5. **Explainability**: SHAP values for individual predictions

## Testing

Run verification script:
```bash
python verify_rf_implementation.py
```

All checks should pass with ✓ indicators.

## References

- Requirements: 4.1, 4.2 (Traffic Prediction with Machine Learning)
- Design Document: Section on ML Prediction Models
- scikit-learn documentation: https://scikit-learn.org/stable/modules/ensemble.html#random-forests
