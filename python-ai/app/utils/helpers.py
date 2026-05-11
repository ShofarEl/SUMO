"""
Helper utility functions
"""
from datetime import datetime
from typing import Any, Dict, Tuple
import uuid
import numpy as np
import pandas as pd


def generate_job_id() -> str:
    """
    Generate a unique job ID
    
    Returns:
        Unique job identifier
    """
    return f"job_{uuid.uuid4().hex[:12]}"


def create_success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """
    Create a standardized success response
    
    Args:
        data: Response data
        message: Success message
    
    Returns:
        Formatted success response
    """
    return {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }


def create_error_response(code: str, message: str, details: Any = None) -> Dict[str, Any]:
    """
    Create a standardized error response
    
    Args:
        code: Error code
        message: Error message
        details: Additional error details
    
    Returns:
        Formatted error response
    """
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
    }



def normalize_data(data: np.ndarray) -> Tuple[np.ndarray, float, float]:
    """
    Normalize data to [0, 1] range
    
    Args:
        data: Input data array
    
    Returns:
        Tuple of (normalized_data, min_value, max_value)
    """
    min_val = np.min(data)
    max_val = np.max(data)
    
    if max_val - min_val == 0:
        return np.zeros_like(data), min_val, max_val
    
    normalized = (data - min_val) / (max_val - min_val)
    return normalized, min_val, max_val


def denormalize_data(data: np.ndarray, min_val: float, max_val: float) -> np.ndarray:
    """
    Denormalize data from [0, 1] range
    
    Args:
        data: Normalized data array
        min_val: Original minimum value
        max_val: Original maximum value
    
    Returns:
        Denormalized data array
    """
    return data * (max_val - min_val) + min_val


def create_sequences(data: np.ndarray, sequence_length: int) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create sequences for time-series prediction
    
    Args:
        data: Input time-series data
        sequence_length: Length of each sequence
    
    Returns:
        Tuple of (X, y) where X is sequences and y is targets
    """
    if len(data) <= sequence_length:
        raise ValueError(f"Data length ({len(data)}) must be greater than sequence_length ({sequence_length})")
    
    X, y = [], []
    
    for i in range(len(data) - sequence_length):
        X.append(data[i:i + sequence_length])
        y.append(data[i + sequence_length])
    
    return np.array(X), np.array(y)


def calculate_metrics(metrics_data: Dict[str, list], ignore_nan: bool = False) -> Dict[str, float]:
    """
    Calculate average metrics from traffic data
    
    Args:
        metrics_data: Dictionary of metric lists
        ignore_nan: Whether to ignore NaN values
    
    Returns:
        Dictionary of average metrics
    """
    results = {}
    
    for key, values in metrics_data.items():
        if not values:
            results[f'avg_{key}'] = 0.0
        else:
            arr = np.array(values)
            if ignore_nan:
                results[f'avg_{key}'] = np.nanmean(arr)
            else:
                results[f'avg_{key}'] = np.mean(arr)
    
    return results


def extract_time_features(timestamp: pd.Timestamp) -> Dict[str, Any]:
    """
    Extract time-based features from timestamp
    
    Args:
        timestamp: Pandas timestamp
    
    Returns:
        Dictionary of time features
    """
    hour = timestamp.hour
    day_of_week = timestamp.dayofweek
    
    # Peak hours: 7-9 AM and 4-6:30 PM
    is_peak_hour = (7 <= hour < 9) or (16 <= hour < 19)
    
    return {
        'hour': hour,
        'day_of_week': day_of_week,
        'is_peak_hour': is_peak_hour,
        'hour_sin': np.sin(2 * np.pi * hour / 24),
        'hour_cos': np.cos(2 * np.pi * hour / 24)
    }


def calculate_congestion_level(queue_length: float, avg_speed: float) -> float:
    """
    Calculate congestion level from traffic metrics
    
    Args:
        queue_length: Queue length in meters
        avg_speed: Average speed in km/h
    
    Returns:
        Congestion level between 0 and 1
    """
    # Normalize queue length (assume max 100m)
    queue_factor = min(queue_length / 100.0, 1.0)
    
    # Normalize speed (assume max 80 km/h, invert so low speed = high congestion)
    speed_factor = 1.0 - min(avg_speed / 80.0, 1.0)
    
    # Combine factors
    congestion = (queue_factor + speed_factor) / 2.0
    
    return np.clip(congestion, 0.0, 1.0)


def add_noise(data: np.ndarray, noise_level: float = 0.1) -> np.ndarray:
    """
    Add Gaussian noise to data for augmentation
    
    Args:
        data: Input data array
        noise_level: Standard deviation of noise as fraction of data
    
    Returns:
        Data with added noise
    """
    noise = np.random.normal(0, noise_level * np.std(data), data.shape)
    return data + noise


def augment_traffic_data(data: pd.DataFrame, augmentation_factor: int = 2) -> pd.DataFrame:
    """
    Augment traffic data by adding noise
    
    Args:
        data: Original traffic data
        augmentation_factor: How many times to augment
    
    Returns:
        Augmented dataframe
    """
    augmented_data = [data]
    
    for _ in range(augmentation_factor - 1):
        noisy_data = data.copy()
        
        # Add noise to numeric columns
        for col in data.select_dtypes(include=[np.number]).columns:
            noisy_data[col] = add_noise(data[col].values, noise_level=0.05)
        
        augmented_data.append(noisy_data)
    
    return pd.concat(augmented_data, ignore_index=True)
