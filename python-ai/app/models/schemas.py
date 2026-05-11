"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    environment: str
    version: str
    python_version: str
    sumo_configured: bool


class DetailedHealthResponse(HealthResponse):
    """Detailed health check response"""
    services: dict


class ControlStrategy(str, Enum):
    """Traffic control strategies"""
    FIXED = "fixed"
    LSTM = "lstm"
    RF = "rf"
    DQN = "dqn"
    PPO = "ppo"
    MARL = "marl"


class TimeOfDay(str, Enum):
    """Time of day periods"""
    MORNING_PEAK = "morning_peak"
    OFF_PEAK = "off_peak"
    EVENING_PEAK = "evening_peak"


class Weather(str, Enum):
    """Weather conditions"""
    CLEAR = "clear"
    RAIN = "rain"
    FLOOD = "flood"


class TrafficDemand(str, Enum):
    """Traffic demand levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PEAK = "peak"


class VehicleMix(BaseModel):
    """Vehicle mix percentages"""
    cars: float = Field(default=55.0, ge=0, le=100, description="Percentage of cars")
    motorcycles: float = Field(default=25.0, ge=0, le=100, description="Percentage of motorcycles")
    minibuses: float = Field(default=15.0, ge=0, le=100, description="Percentage of minibuses")
    trucks: float = Field(default=5.0, ge=0, le=100, description="Percentage of trucks")


class SimulationConfig(BaseModel):
    """Simulation configuration parameters"""
    traffic_demand: TrafficDemand
    vehicle_mix: VehicleMix
    duration: int = Field(default=3600, gt=0, description="Simulation duration in seconds")
    time_of_day: TimeOfDay
    weather: Weather = Weather.CLEAR
    control_strategy: ControlStrategy


class SimulationResults(BaseModel):
    """Simulation results"""
    avg_delay: float = Field(description="Average delay per vehicle in seconds")
    avg_queue_length: float = Field(description="Average queue length in meters")
    throughput: float = Field(description="Throughput in vehicles per hour")
    fuel_consumption: Optional[float] = Field(default=None, description="Fuel consumption in liters")
    co2_emissions: Optional[float] = Field(default=None, description="CO2 emissions in kg")
    prediction_rmse: Optional[float] = Field(default=None, description="Prediction RMSE")
    prediction_mae: Optional[float] = Field(default=None, description="Prediction MAE")


class JobStatus(str, Enum):
    """Job execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResponse(BaseModel):
    """Job submission response"""
    job_id: str
    status: JobStatus
    message: str
    created_at: datetime


class ErrorResponse(BaseModel):
    """Error response"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime


# Machine Learning Prediction Schemas

class TrainingDataPoint(BaseModel):
    """Single traffic data point for training"""
    queue_length: float = Field(ge=0, description="Queue length in meters")
    vehicle_arrivals: float = Field(ge=0, description="Vehicle arrivals per minute")
    time_of_day: float = Field(ge=0, le=1, description="Time of day normalized (0-1)")
    weather: float = Field(ge=0, le=2, description="Weather code (0=clear, 1=rain, 2=flood)")


class LSTMTrainRequest(BaseModel):
    """LSTM model training request"""
    model_name: str = Field(description="Name for the trained model")
    training_data: List[TrainingDataPoint] = Field(min_length=100, description="Training data points")
    epochs: int = Field(default=50, ge=1, le=200, description="Number of training epochs")
    batch_size: int = Field(default=32, ge=1, le=256, description="Batch size")
    validation_split: float = Field(default=0.2, ge=0.1, le=0.4, description="Validation split ratio")
    sequence_length: int = Field(default=15, ge=5, le=60, description="Input sequence length in minutes")
    prediction_horizon: int = Field(default=10, ge=1, le=30, description="Prediction horizon in minutes")
    lstm_units: List[int] = Field(default=[64, 32], description="LSTM layer units")
    dropout_rate: float = Field(default=0.2, ge=0, le=0.5, description="Dropout rate")


class RFTrainRequest(BaseModel):
    """Random Forest model training request"""
    model_name: str = Field(description="Name for the trained model")
    training_data: List[TrainingDataPoint] = Field(min_length=100, description="Training data points")
    n_estimators: int = Field(default=100, ge=10, le=500, description="Number of trees")
    max_depth: Optional[int] = Field(default=20, ge=5, le=50, description="Maximum tree depth")
    validation_split: float = Field(default=0.2, ge=0.1, le=0.4, description="Validation split ratio")
    prediction_steps: int = Field(default=10, ge=1, le=30, description="Steps ahead to predict")
    optimize_hyperparams: bool = Field(default=False, description="Whether to optimize hyperparameters")


class TrainingResponse(BaseModel):
    """Model training response"""
    model_id: str
    model_name: str
    model_type: str
    training_rmse: float
    training_mae: float
    validation_rmse: float
    validation_mae: float
    model_path: str
    training_time: float
    additional_metrics: Optional[Dict[str, Any]] = None


class PredictionInput(BaseModel):
    """Input for making predictions"""
    model_name: str = Field(description="Name of the trained model to use")
    input_sequence: List[TrainingDataPoint] = Field(description="Input sequence for prediction")


class PredictionResponse(BaseModel):
    """Prediction response"""
    model_name: str
    model_type: str
    predictions: List[float]
    confidence: Dict[str, Any]
    prediction_time: float


class ModelInfo(BaseModel):
    """Model information"""
    model_name: str
    model_type: str
    model_path: str
    created_at: datetime
    performance: Dict[str, float]
    is_deployed: bool


class ModelListResponse(BaseModel):
    """List of available models"""
    models: List[ModelInfo]
    total: int
