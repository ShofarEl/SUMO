# Machine Learning Prediction Models

This module implements traffic prediction models using LSTM and Random Forest algorithms.

## Models

### 1. LSTM Traffic Predictor (`lstm_model.py`)

Long Short-Term Memory neural network for time-series traffic prediction.

**Features:**
- Predicts traffic conditions based on 15-minute historical sequences
- Outputs predictions for 5-15 minutes ahead
- Uses TensorFlow/Keras for deep learning
- Includes data preprocessing and normalization
- Supports model saving/loading

**Architecture:**
- Input: (sequence_length, features) - default (15, 4)
- LSTM layers: Configurable units (default [64, 32])
- Dropout for regularization
- Dense output layer for predictions

**Target Performance:**
- RMSE: < 0.0263
- MAE: < 0.02

### 2. Random Forest Traffic Predictor (`random_forest_model.py`)

Ensemble decision tree model with feature engineering.

**Features:**
- Feature engineering from raw traffic data
- Lagged features (historical values)
- Rolling statistics (mean, std)
- Rate of change features
- Time-based features (peak hours)
- Hyperparameter optimization with GridSearchCV

**Target Performance:**
- RMSE: < 0.0352
- MAE: < 0.025

### 3. Model Evaluator (`evaluation.py`)

Comprehensive evaluation and comparison framework.

**Features:**
- Calculate RMSE, MAE, R², MAPE
- Compare with baseline models
- Evaluate prediction intervals
- Compare multiple models
- Generate accuracy reports
- Store evaluation results

## API Endpoints

### Training Endpoints

**Train LSTM Model**
```
POST /api/ml/lstm/train
```

Request body:
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

**Train Random Forest Model**
```
POST /api/ml/rf/train
```

Request body:
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

### Prediction Endpoints

**LSTM Prediction**
```
POST /api/ml/lstm/predict
```

Request body:
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

**Random Forest Prediction**
```
POST /api/ml/rf/predict
```

Request body:
```json
{
  "model_name": "rf_georgetown_v1",
  "input_sequence": [...]
}
```

### Evaluation Endpoints

**Evaluate Model**
```
POST /api/ml/evaluate
```

**Compare Models**
```
POST /api/ml/compare
```

**List Models**
```
GET /api/ml/models
```

**Get Model Info**
```
GET /api/ml/models/{model_name}
```

## Backend Integration

The Node.js backend provides proxy endpoints for ML predictions:

- `POST /api/predictions/lstm/train` - Train LSTM model
- `POST /api/predictions/lstm` - Get LSTM prediction
- `POST /api/predictions/rf/train` - Train Random Forest model
- `POST /api/predictions/rf` - Get Random Forest prediction
- `POST /api/predictions/compare` - Compare models
- `GET /api/predictions/history` - Get model history
- `GET /api/predictions/models/:id` - Get model details
- `DELETE /api/predictions/models/:id` - Delete model

## Data Format

### Training Data Point
```python
{
  "queue_length": float,      # Queue length in meters (>= 0)
  "vehicle_arrivals": float,  # Vehicle arrivals per minute (>= 0)
  "time_of_day": float,       # Normalized time (0-1)
  "weather": float            # Weather code (0=clear, 1=rain, 2=flood)
}
```

### Input Features
- **queue_length**: Current queue length at intersection
- **vehicle_arrivals**: Number of vehicles arriving per minute
- **time_of_day**: Time normalized to 0-1 (0 = midnight, 0.5 = noon)
- **weather**: Weather condition encoded as integer

## Model Storage

Models are saved to the configured storage path:
- LSTM: `.keras` format with scaler and config
- Random Forest: `.pkl` format with scaler and config
- Evaluations: JSON format with metrics and reports

## Usage Example

```python
from app.services.ml.lstm_model import LSTMTrafficPredictor
import numpy as np

# Initialize model
model = LSTMTrafficPredictor(
    sequence_length=15,
    prediction_horizon=10,
    features=4
)

# Prepare training data
data = np.array([...])  # Shape: (timesteps, 4)

# Train model
results = model.train(data, epochs=50, batch_size=32)

# Save model
model.save_model("./models", "my_lstm_model")

# Make predictions
input_sequence = np.array([...])  # Shape: (15, 4)
predictions, confidence = model.predict(input_sequence)
```

## Requirements

- TensorFlow >= 2.15.0
- scikit-learn >= 1.3.2
- NumPy >= 1.26.2
- Pandas >= 2.1.3
- SciPy (for evaluation)

## Performance Targets

Based on requirements 4.1 and 4.2:

| Model | RMSE Target | MAE Target |
|-------|-------------|------------|
| LSTM | < 0.0263 | < 0.02 |
| Random Forest | < 0.0352 | < 0.025 |

## Notes

- Models are stored in memory in the Python service (use database in production)
- Training data should have at least 100 samples
- LSTM requires sequential data with consistent timesteps
- Random Forest performs feature engineering automatically
- Both models support incremental training and fine-tuning
