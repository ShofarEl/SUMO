"""
Machine Learning prediction API endpoints
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
import numpy as np
import pandas as pd
import time
import os
from datetime import datetime
from typing import Dict, List, Optional
from app.models.schemas import (
    LSTMTrainRequest,
    RFTrainRequest,
    PredictionInput,
    TrainingResponse,
    PredictionResponse,
    ModelListResponse,
    ModelInfo
)
from app.services.ml.lstm_model import LSTMTrafficPredictor
from app.services.ml.random_forest_model import RandomForestTrafficPredictor
from app.services.ml.evaluation import ModelEvaluator
from app.services.ml.model_manager import model_manager
from app.core.logging import logger
from app.core.config import settings

router = APIRouter()

# In-memory model registry for active models (in production, use database)
model_registry: Dict[str, Dict] = {}


@router.get("/")
async def ml_info():
    """Get ML service information"""
    return {
        "service": "Machine Learning Prediction",
        "status": "ready",
        "models": ["LSTM", "Random Forest"],
        "available_models": len(model_registry),
        "endpoints": {
            "lstm_train": "POST /api/ml/lstm/train",
            "lstm_predict": "POST /api/ml/lstm/predict",
            "rf_train": "POST /api/ml/rf/train",
            "rf_predict": "POST /api/ml/rf/predict",
            "list_models": "GET /api/ml/models"
        }
    }


@router.post("/lstm/train", response_model=TrainingResponse, status_code=status.HTTP_201_CREATED)
async def train_lstm_model(request: LSTMTrainRequest):
    """
    Train an LSTM traffic prediction model
    
    Args:
        request: Training configuration and data
        
    Returns:
        Training results and model information
    """
    try:
        logger.info(f"Starting LSTM training for model: {request.model_name}")
        start_time = time.time()
        
        # Convert training data to numpy array
        data = np.array([
            [point.queue_length, point.vehicle_arrivals, point.time_of_day, point.weather]
            for point in request.training_data
        ])
        
        # Initialize model
        model = LSTMTrafficPredictor(
            sequence_length=request.sequence_length,
            prediction_horizon=request.prediction_horizon,
            features=4,
            lstm_units=request.lstm_units,
            dropout_rate=request.dropout_rate
        )
        
        # Train model
        training_results = model.train(
            data=data,
            epochs=request.epochs,
            batch_size=request.batch_size,
            validation_split=request.validation_split
        )
        
        # Save model
        model_path = model.save_model(
            model_path=settings.MODEL_STORAGE_PATH,
            model_name=request.model_name
        )
        
        training_time = time.time() - start_time
        
        # Register model with model manager
        model_id = model_manager.register_model(
            model_name=request.model_name,
            model_type="lstm",
            model_path=model_path,
            training_config={
                "sequence_length": request.sequence_length,
                "prediction_horizon": request.prediction_horizon,
                "lstm_units": request.lstm_units,
                "dropout_rate": request.dropout_rate,
                "epochs": request.epochs,
                "batch_size": request.batch_size,
                "validation_split": request.validation_split
            },
            performance_metrics={
                "training_rmse": training_results["training_rmse"],
                "training_mae": training_results["training_mae"],
                "validation_rmse": training_results["validation_rmse"],
                "validation_mae": training_results["validation_mae"],
                "epochs_trained": training_results["epochs_trained"]
            }
        )
        
        # Keep in-memory reference for active use
        model_registry[request.model_name] = {
            "model_id": model_id,
            "model_type": "lstm",
            "model_instance": model,
            "model_path": model_path,
            "created_at": datetime.now(),
            "performance": {
                "rmse": training_results["validation_rmse"],
                "mae": training_results["validation_mae"]
            }
        }
        
        logger.info(f"LSTM training completed in {training_time:.2f}s")
        
        return TrainingResponse(
            model_id=model_id,
            model_name=request.model_name,
            model_type="lstm",
            training_rmse=training_results["training_rmse"],
            training_mae=training_results["training_mae"],
            validation_rmse=training_results["validation_rmse"],
            validation_mae=training_results["validation_mae"],
            model_path=model_path,
            training_time=training_time,
            additional_metrics={
                "epochs_trained": training_results["epochs_trained"],
                "sequence_length": request.sequence_length,
                "prediction_horizon": request.prediction_horizon
            }
        )
        
    except Exception as e:
        logger.error(f"LSTM training failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LSTM training failed: {str(e)}"
        )


@router.post("/lstm/predict", response_model=PredictionResponse)
async def predict_lstm(request: PredictionInput):
    """
    Make predictions using trained LSTM model
    
    Args:
        request: Model name and input sequence
        
    Returns:
        Predictions and confidence metrics
    """
    try:
        # Check if model exists
        if request.model_name not in model_registry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{request.model_name}' not found"
            )
        
        model_info = model_registry[request.model_name]
        
        if model_info["model_type"] != "lstm":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model '{request.model_name}' is not an LSTM model"
            )
        
        start_time = time.time()
        
        # Convert input to numpy array
        input_data = np.array([
            [point.queue_length, point.vehicle_arrivals, point.time_of_day, point.weather]
            for point in request.input_sequence
        ])
        
        # Get model
        model: LSTMTrafficPredictor = model_info["model_instance"]
        
        # Make prediction
        predictions, confidence = model.predict(input_data)
        
        prediction_time = time.time() - start_time
        
        logger.info(f"LSTM prediction completed in {prediction_time:.4f}s")
        
        return PredictionResponse(
            model_name=request.model_name,
            model_type="lstm",
            predictions=predictions.tolist(),
            confidence=confidence,
            prediction_time=prediction_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LSTM prediction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LSTM prediction failed: {str(e)}"
        )


@router.post("/rf/train", response_model=TrainingResponse, status_code=status.HTTP_201_CREATED)
async def train_rf_model(request: RFTrainRequest):
    """
    Train a Random Forest traffic prediction model
    
    Args:
        request: Training configuration and data
        
    Returns:
        Training results and model information
    """
    try:
        logger.info(f"Starting Random Forest training for model: {request.model_name}")
        start_time = time.time()
        
        # Convert training data to DataFrame
        data = pd.DataFrame([
            {
                "queue_length": point.queue_length,
                "vehicle_arrivals": point.vehicle_arrivals,
                "time_of_day": point.time_of_day,
                "weather": point.weather
            }
            for point in request.training_data
        ])
        
        # Initialize model
        model = RandomForestTrafficPredictor(
            n_estimators=request.n_estimators,
            max_depth=request.max_depth
        )
        
        # Train model
        training_results = model.train(
            data=data,
            target_column='queue_length',
            prediction_steps=request.prediction_steps,
            validation_split=request.validation_split,
            optimize_hyperparams=request.optimize_hyperparams
        )
        
        # Save model
        model_path = model.save_model(
            model_path=settings.MODEL_STORAGE_PATH,
            model_name=request.model_name
        )
        
        training_time = time.time() - start_time
        
        # Register model with model manager
        model_id = model_manager.register_model(
            model_name=request.model_name,
            model_type="random_forest",
            model_path=model_path,
            training_config={
                "n_estimators": training_results["n_estimators"],
                "max_depth": training_results["max_depth"],
                "prediction_steps": request.prediction_steps,
                "validation_split": request.validation_split,
                "optimize_hyperparams": request.optimize_hyperparams
            },
            performance_metrics={
                "training_rmse": training_results["training_rmse"],
                "training_mae": training_results["training_mae"],
                "validation_rmse": training_results["validation_rmse"],
                "validation_mae": training_results["validation_mae"],
                "validation_r2": training_results["validation_r2"],
                "num_features": training_results["num_features"],
                "top_features": training_results["top_features"]
            }
        )
        
        # Keep in-memory reference for active use
        model_registry[request.model_name] = {
            "model_id": model_id,
            "model_type": "random_forest",
            "model_instance": model,
            "model_path": model_path,
            "created_at": datetime.now(),
            "performance": {
                "rmse": training_results["validation_rmse"],
                "mae": training_results["validation_mae"],
                "r2": training_results["validation_r2"]
            }
        }
        
        logger.info(f"Random Forest training completed in {training_time:.2f}s")
        
        return TrainingResponse(
            model_id=model_id,
            model_name=request.model_name,
            model_type="random_forest",
            training_rmse=training_results["training_rmse"],
            training_mae=training_results["training_mae"],
            validation_rmse=training_results["validation_rmse"],
            validation_mae=training_results["validation_mae"],
            model_path=model_path,
            training_time=training_time,
            additional_metrics={
                "n_estimators": training_results["n_estimators"],
                "max_depth": training_results["max_depth"],
                "num_features": training_results["num_features"],
                "r2_score": training_results["validation_r2"],
                "top_features": training_results["top_features"]
            }
        )
        
    except Exception as e:
        logger.error(f"Random Forest training failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Random Forest training failed: {str(e)}"
        )


@router.post("/rf/predict", response_model=PredictionResponse)
async def predict_rf(request: PredictionInput):
    """
    Make predictions using trained Random Forest model
    
    Args:
        request: Model name and input sequence
        
    Returns:
        Predictions and confidence metrics
    """
    try:
        # Check if model exists
        if request.model_name not in model_registry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{request.model_name}' not found"
            )
        
        model_info = model_registry[request.model_name]
        
        if model_info["model_type"] != "random_forest":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model '{request.model_name}' is not a Random Forest model"
            )
        
        start_time = time.time()
        
        # Convert input to DataFrame
        input_data = pd.DataFrame([
            {
                "queue_length": point.queue_length,
                "vehicle_arrivals": point.vehicle_arrivals,
                "time_of_day": point.time_of_day,
                "weather": point.weather
            }
            for point in request.input_sequence
        ])
        
        # Get model
        model: RandomForestTrafficPredictor = model_info["model_instance"]
        
        # Make prediction
        predictions, confidence = model.predict(input_data)
        
        prediction_time = time.time() - start_time
        
        logger.info(f"Random Forest prediction completed in {prediction_time:.4f}s")
        
        return PredictionResponse(
            model_name=request.model_name,
            model_type="random_forest",
            predictions=predictions.tolist(),
            confidence=confidence,
            prediction_time=prediction_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Random Forest prediction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Random Forest prediction failed: {str(e)}"
        )


@router.get("/models", response_model=ModelListResponse)
async def list_models(
    model_type: Optional[str] = None,
    is_deployed: Optional[bool] = None
):
    """
    List all available trained models
    
    Args:
        model_type: Filter by model type (optional)
        is_deployed: Filter by deployment status (optional)
    
    Returns:
        List of model information
    """
    # Get models from model manager
    managed_models = model_manager.list_models(
        model_type=model_type,
        is_deployed=is_deployed
    )
    
    models = []
    for model_metadata in managed_models:
        models.append(ModelInfo(
            model_name=model_metadata.get("name"),
            model_type=model_metadata.get("type"),
            model_path=model_metadata.get("model_path"),
            created_at=model_metadata.get("created_at"),
            performance=model_metadata.get("performance", {}),
            is_deployed=model_metadata.get("is_deployed", False)
        ))
    
    return ModelListResponse(
        models=models,
        total=len(models)
    )


@router.get("/models/{model_id}", response_model=ModelInfo)
async def get_model_info_by_id(model_id: str):
    """
    Get information about a specific model by ID
    
    Args:
        model_id: ID of the model
        
    Returns:
        Model information
    """
    metadata = model_manager.get_model_metadata(model_id)
    
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found"
        )
    
    return ModelInfo(
        model_name=metadata.get("name"),
        model_type=metadata.get("type"),
        model_path=metadata.get("model_path"),
        created_at=metadata.get("created_at"),
        performance=metadata.get("performance", {}),
        is_deployed=metadata.get("is_deployed", False)
    )


@router.post("/evaluate/{model_name}")
async def evaluate_model(
    model_name: str,
    test_data: List[Dict],
    actual_values: List[float]
):
    """
    Evaluate model accuracy on test data
    
    Args:
        model_name: Name of the model to evaluate
        test_data: Test input data
        actual_values: Actual target values
        
    Returns:
        Evaluation report with metrics
    """
    try:
        if model_name not in model_registry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_name}' not found"
            )
        
        model_info = model_registry[model_name]
        model_type = model_info["model_type"]
        
        # Convert actual values to numpy array
        y_true = np.array(actual_values)
        
        # Make predictions based on model type
        if model_type == "lstm":
            # For LSTM, test_data should be sequences
            predictions = []
            for sequence in test_data:
                input_array = np.array([
                    [point["queue_length"], point["vehicle_arrivals"], 
                     point["time_of_day"], point["weather"]]
                    for point in sequence
                ])
                model: LSTMTrafficPredictor = model_info["model_instance"]
                pred, _ = model.predict(input_array)
                predictions.append(pred[0])  # Take first prediction
            y_pred = np.array(predictions)
            
        elif model_type == "random_forest":
            # For RF, test_data should be feature dictionaries
            input_df = pd.DataFrame(test_data)
            model: RandomForestTrafficPredictor = model_info["model_instance"]
            y_pred, _ = model.predict(input_df)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown model type: {model_type}"
            )
        
        # Generate evaluation report
        report = ModelEvaluator.generate_accuracy_report(
            model_name=model_name,
            model_type=model_type,
            y_true=y_true,
            y_pred=y_pred,
            training_time=0.0,  # Not available for evaluation
            additional_info={
                "num_test_samples": len(y_true),
                "evaluation_date": datetime.now().isoformat()
            }
        )
        
        # Store evaluation results
        eval_path = os.path.join(settings.MODEL_STORAGE_PATH, "evaluations")
        stored_path = ModelEvaluator.store_evaluation_results(report, eval_path)
        report["stored_path"] = stored_path
        
        logger.info(f"Model evaluation completed for {model_name}")
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model evaluation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model evaluation failed: {str(e)}"
        )


@router.post("/evaluate/simulation/{model_name}")
async def evaluate_model_against_simulation(
    model_name: str,
    simulation_id: str
):
    """
    Evaluate model accuracy against actual simulation data
    
    Args:
        model_name: Name of the model to evaluate
        simulation_id: ID of simulation to compare against
        
    Returns:
        Evaluation report comparing predictions with simulation results
    """
    try:
        if model_name not in model_registry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_name}' not found"
            )
        
        # In a real implementation, fetch simulation data from database
        # For now, return a placeholder response
        logger.info(f"Evaluating {model_name} against simulation {simulation_id}")
        
        return {
            "model_name": model_name,
            "simulation_id": simulation_id,
            "status": "evaluation_pending",
            "message": "Simulation data evaluation requires backend integration"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Simulation evaluation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation evaluation failed: {str(e)}"
        )


@router.post("/compare")
async def compare_models_endpoint(
    test_data: List[Dict],
    actual_values: List[float],
    model_names: List[str]
):
    """
    Compare multiple models on the same test data
    
    Args:
        test_data: Test input data
        actual_values: Actual target values
        model_names: List of model names to compare
        
    Returns:
        Comparison results
    """
    try:
        y_true = np.array(actual_values)
        predictions = {}
        
        for model_name in model_names:
            if model_name not in model_registry:
                logger.warning(f"Model '{model_name}' not found, skipping")
                continue
            
            model_info = model_registry[model_name]
            model_type = model_info["model_type"]
            
            # Make predictions
            if model_type == "lstm":
                preds = []
                for sequence in test_data:
                    input_array = np.array([
                        [point["queue_length"], point["vehicle_arrivals"], 
                         point["time_of_day"], point["weather"]]
                        for point in sequence
                    ])
                    model: LSTMTrafficPredictor = model_info["model_instance"]
                    pred, _ = model.predict(input_array)
                    preds.append(pred[0])
                predictions[model_name] = np.array(preds)
                
            elif model_type == "random_forest":
                input_df = pd.DataFrame(test_data)
                model: RandomForestTrafficPredictor = model_info["model_instance"]
                y_pred, _ = model.predict(input_df)
                predictions[model_name] = y_pred
        
        if not predictions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid models found for comparison"
            )
        
        # Compare models
        comparison_df = ModelEvaluator.compare_models(y_true, predictions)
        
        # Convert to dict for JSON response
        comparison_results = comparison_df.to_dict(orient='records')
        
        logger.info(f"Compared {len(predictions)} models")
        
        return {
            "comparison": comparison_results,
            "best_model": comparison_results[0]["model_name"],
            "num_models_compared": len(predictions),
            "num_test_samples": len(y_true)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model comparison failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model comparison failed: {str(e)}"
        )


@router.get("/models/versions/{model_name}/{model_type}")
async def get_model_versions(model_name: str, model_type: str):
    """
    Get all versions of a specific model
    
    Args:
        model_name: Name of the model
        model_type: Type of model (lstm, random_forest, etc.)
        
    Returns:
        List of model versions
    """
    try:
        versions = model_manager.get_model_versions(model_name, model_type)
        
        return {
            "model_name": model_name,
            "model_type": model_type,
            "versions": versions,
            "total_versions": len(versions)
        }
        
    except Exception as e:
        logger.error(f"Failed to get model versions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model versions: {str(e)}"
        )


@router.post("/models/{model_id}/deploy")
async def deploy_model(model_id: str, deployed_by: str = None):
    """
    Deploy a model
    
    Args:
        model_id: Model ID to deploy
        deployed_by: User ID who is deploying the model
        
    Returns:
        Deployment status
    """
    try:
        success = model_manager.deploy_model(model_id, deployed_by)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_id}' not found"
            )
        
        return {
            "model_id": model_id,
            "status": "deployed",
            "deployed_at": datetime.now().isoformat(),
            "deployed_by": deployed_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model deployment failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model deployment failed: {str(e)}"
        )


@router.post("/models/{model_id}/undeploy")
async def undeploy_model(model_id: str, undeployed_by: str = None):
    """
    Undeploy a model
    
    Args:
        model_id: Model ID to undeploy
        undeployed_by: User ID who is undeploying the model
        
    Returns:
        Undeployment status
    """
    try:
        success = model_manager.undeploy_model(model_id, undeployed_by)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_id}' not found"
            )
        
        return {
            "model_id": model_id,
            "status": "undeployed",
            "undeployed_at": datetime.now().isoformat(),
            "undeployed_by": undeployed_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model undeployment failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model undeployment failed: {str(e)}"
        )


@router.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """
    Delete a model and its files
    
    Args:
        model_id: Model ID to delete
        
    Returns:
        Deletion status
    """
    try:
        success = model_manager.delete_model(model_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_id}' not found"
            )
        
        # Remove from in-memory registry if present
        for name, info in list(model_registry.items()):
            if info.get("model_id") == model_id:
                del model_registry[name]
                break
        
        return {
            "model_id": model_id,
            "status": "deleted",
            "deleted_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model deletion failed: {str(e)}"
        )


@router.get("/models/compare/{model_name}/{model_type}")
async def compare_model_versions_endpoint(
    model_name: str,
    model_type: str,
    metric: str = "rmse"
):
    """
    Compare performance across model versions
    
    Args:
        model_name: Name of the model
        model_type: Type of model
        metric: Metric to compare (rmse, mae, r2_score)
        
    Returns:
        Comparison results
    """
    try:
        comparison = model_manager.compare_model_versions(model_name, model_type, metric)
        
        return {
            "model_name": model_name,
            "model_type": model_type,
            "metric": metric,
            "comparison": comparison,
            "best_version": comparison[0] if comparison else None
        }
        
    except Exception as e:
        logger.error(f"Version comparison failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Version comparison failed: {str(e)}"
        )


@router.get("/storage/stats")
async def get_storage_stats():
    """
    Get model storage statistics
    
    Returns:
        Storage statistics
    """
    try:
        stats = model_manager.get_storage_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get storage stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get storage stats: {str(e)}"
        )

