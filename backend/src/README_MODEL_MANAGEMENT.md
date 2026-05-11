# Model Management System

## Overview

The Model Management System provides comprehensive functionality for managing trained ML models, including versioning, deployment, and performance tracking.

## Features

### 1. Model Versioning
- Automatic version generation (v1.0.0, v1.0.1, etc.)
- Track multiple versions of the same model
- Compare performance across versions
- View version history

### 2. Model Storage
- Centralized model file storage
- Metadata tracking in MongoDB
- File-based storage in Python service
- Organized by model type (lstm, random_forest, dqn, ppo, marl)

### 3. Deployment Management
- Deploy/undeploy models
- Only one version can be deployed at a time
- Deployment history tracking
- Role-based deployment permissions

### 4. Performance Tracking
- Store training and validation metrics
- Track RMSE, MAE, R² scores
- Compare models and versions
- Performance visualization

## API Endpoints

### List Models
```
GET /api/ml/models
Query Parameters:
  - type: Filter by model type (lstm, random_forest, dqn, ppo, marl)
  - isDeployed: Filter by deployment status (true/false)
  - trainedBy: Filter by user ID
  - page: Page number (default: 1)
  - limit: Items per page (default: 20)
```

### Get Model Details
```
GET /api/ml/models/:id
```

### Get Model Versions
```
GET /api/ml/models/versions/:name/:type
```

### Deploy Model
```
POST /api/ml/models/:id/deploy
```

### Undeploy Model
```
POST /api/ml/models/:id/undeploy
```

### Delete Model
```
DELETE /api/ml/models/:id
Note: Cannot delete deployed models
```

### Compare Model Versions
```
GET /api/ml/models/compare/:name/:type
Query Parameters:
  - metric: Comparison metric (rmse, mae, r2_score)
```

### Get Storage Statistics
```
GET /api/ml/models/storage/stats
Access: Admin only
```

## Python Service Integration

### Model Manager
The Python service includes a `ModelManager` class that handles:
- Model registration and metadata storage
- Version generation
- File management
- Deployment tracking

### Storage Structure
```
models/
├── lstm/
│   ├── model_name.keras
│   ├── model_name_scaler.pkl
│   └── model_name_config.pkl
├── random_forest/
│   ├── model_name.pkl
│   ├── model_name_scaler.pkl
│   └── model_name_config.pkl
├── dqn/
├── ppo/
├── marl/
└── model_registry.json
```

### Model Registry
The `model_registry.json` file stores metadata for all models:
```json
{
  "model_id": {
    "model_id": "lstm_traffic_predictor_v1.0.0_20260509_143022",
    "name": "traffic_predictor",
    "type": "lstm",
    "version": "v1.0.0",
    "model_path": "/path/to/model.keras",
    "training_config": {...},
    "performance": {...},
    "trained_by": "user_id",
    "dataset_id": "dataset_id",
    "created_at": "2026-05-09T14:30:22",
    "is_deployed": false,
    "deployment_history": []
  }
}
```

## Frontend Interface

### Model Management Page
Location: `/models`

Features:
- List all models with filtering
- View model details and performance metrics
- Deploy/undeploy models
- Delete models (if not deployed)
- View version history
- Compare model versions
- Storage statistics (admin only)

### Filters
- Model Type: Filter by LSTM, Random Forest, DQN, PPO, MARL
- Deployment Status: All, Deployed, Undeployed

### Model Card
Each model displays:
- Name and version
- Type and deployment status
- Creation date and trainer
- Performance metrics (RMSE, MAE, R²)
- Action buttons (View Versions, Compare, Deploy/Undeploy, Delete)

### Version Comparison
- Compare all versions of a model
- Sort by performance metric
- Highlight best performing version
- View deployment status

## Permissions

### Researcher Role
- View all models
- Deploy/undeploy own models
- Delete own models (if not deployed)
- Compare model versions

### Admin Role
- All researcher permissions
- Deploy/undeploy any model
- Delete any model (if not deployed)
- View storage statistics

## Usage Examples

### Training and Registering a Model

```python
# In Python service
from app.services.ml.lstm_model import LSTMTrafficPredictor
from app.services.ml.model_manager import model_manager

# Train model
model = LSTMTrafficPredictor()
training_results = model.train(data)

# Save model
model_path = model.save_model(
    model_path="/path/to/models",
    model_name="traffic_predictor"
)

# Register with model manager
model_id = model_manager.register_model(
    model_name="traffic_predictor",
    model_type="lstm",
    model_path=model_path,
    training_config={...},
    performance_metrics={...},
    trained_by="user_id"
)
```

### Deploying a Model

```javascript
// Frontend
const deployModel = async (modelId) => {
  const response = await axios.post(
    `${API_URL}/api/ml/models/${modelId}/deploy`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log('Model deployed:', response.data);
};
```

### Comparing Model Versions

```javascript
// Frontend
const compareVersions = async (modelName, modelType) => {
  const response = await axios.get(
    `${API_URL}/api/ml/models/compare/${modelName}/${modelType}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { metric: 'rmse' }
    }
  );
  console.log('Comparison:', response.data);
};
```

## Best Practices

1. **Version Control**: Always create a new version when retraining with different hyperparameters or data
2. **Deployment**: Only deploy models that have been thoroughly evaluated
3. **Cleanup**: Regularly delete old, unused model versions to save storage
4. **Documentation**: Include detailed training configuration in model metadata
5. **Testing**: Test models before deployment using the evaluation endpoints

## Troubleshooting

### Model Not Found
- Ensure model is registered in both MongoDB and Python service
- Check model_registry.json for model metadata
- Verify model files exist in storage directory

### Deployment Fails
- Check user permissions
- Ensure model is not already deployed
- Verify Python service is running

### Storage Issues
- Monitor storage statistics regularly
- Clean up old models
- Check file permissions in storage directory

## Future Enhancements

- Model rollback functionality
- A/B testing support
- Automated model retraining
- Model performance monitoring
- Integration with MLflow or similar tools
