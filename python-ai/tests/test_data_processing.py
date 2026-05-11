import pytest
import numpy as np
import pandas as pd
from app.utils.helpers import (
    normalize_data,
    denormalize_data,
    create_sequences,
    calculate_metrics
)


class TestDataNormalization:
    """Test data normalization utilities"""
    
    def test_normalize_data(self):
        """Test data normalization"""
        data = np.array([10, 20, 30, 40, 50])
        
        normalized, min_val, max_val = normalize_data(data)
        
        assert normalized.min() >= 0
        assert normalized.max() <= 1
        assert min_val == 10
        assert max_val == 50
    
    def test_denormalize_data(self):
        """Test data denormalization"""
        original = np.array([10, 20, 30, 40, 50])
        
        normalized, min_val, max_val = normalize_data(original)
        denormalized = denormalize_data(normalized, min_val, max_val)
        
        np.testing.assert_array_almost_equal(original, denormalized)
    
    def test_normalize_zero_range(self):
        """Test normalization with zero range"""
        data = np.array([5, 5, 5, 5, 5])
        
        normalized, min_val, max_val = normalize_data(data)
        
        # Should handle zero range gracefully
        assert not np.isnan(normalized).any()


class TestSequenceCreation:
    """Test sequence creation for time-series models"""
    
    def test_create_sequences_basic(self):
        """Test basic sequence creation"""
        data = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        
        X, y = create_sequences(data, sequence_length=3)
        
        assert X.shape[0] == 7  # 10 - 3 = 7 sequences
        assert X.shape[1] == 3  # sequence length
        assert len(y) == 7
    
    def test_create_sequences_multidimensional(self):
        """Test sequence creation with multiple features"""
        data = np.random.rand(100, 4)  # 100 timesteps, 4 features
        
        X, y = create_sequences(data, sequence_length=5)
        
        assert X.shape[0] == 95  # 100 - 5 = 95 sequences
        assert X.shape[1] == 5   # sequence length
        assert X.shape[2] == 4   # features
    
    def test_create_sequences_insufficient_data(self):
        """Test sequence creation with insufficient data"""
        data = np.array([1, 2])
        
        with pytest.raises(ValueError):
            X, y = create_sequences(data, sequence_length=5)


class TestMetricsCalculation:
    """Test traffic metrics calculation"""
    
    def test_calculate_metrics_basic(self):
        """Test basic metrics calculation"""
        metrics_data = {
            'delay': [10, 15, 20, 18, 22],
            'queue_length': [5, 7, 9, 8, 10],
            'throughput': [100, 95, 90, 92, 88]
        }
        
        results = calculate_metrics(metrics_data)
        
        assert 'avg_delay' in results
        assert 'avg_queue_length' in results
        assert 'avg_throughput' in results
        assert all(isinstance(v, (int, float)) for v in results.values())
    
    def test_calculate_metrics_empty(self):
        """Test metrics calculation with empty data"""
        metrics_data = {
            'delay': [],
            'queue_length': [],
            'throughput': []
        }
        
        results = calculate_metrics(metrics_data)
        
        # Should handle empty data gracefully
        assert all(v == 0 or np.isnan(v) for v in results.values())
    
    def test_calculate_metrics_with_nan(self):
        """Test metrics calculation with NaN values"""
        metrics_data = {
            'delay': [10, np.nan, 20, 18, 22],
            'queue_length': [5, 7, np.nan, 8, 10]
        }
        
        results = calculate_metrics(metrics_data, ignore_nan=True)
        
        # Should ignore NaN values
        assert not np.isnan(results['avg_delay'])
        assert not np.isnan(results['avg_queue_length'])


class TestDataValidation:
    """Test data validation utilities"""
    
    def test_validate_traffic_state(self):
        """Test traffic state validation"""
        from app.models.schemas import TrafficState
        
        valid_state = {
            'queueLength': 15.0,
            'vehicleArrivals': 7,
            'timeOfDay': 0.5,
            'weather': 0
        }
        
        state = TrafficState(**valid_state)
        
        assert state.queueLength == 15.0
        assert state.vehicleArrivals == 7
    
    def test_validate_traffic_state_invalid(self):
        """Test traffic state validation with invalid data"""
        from app.models.schemas import TrafficState
        from pydantic import ValidationError
        
        invalid_state = {
            'queueLength': -5.0,  # Negative value
            'vehicleArrivals': 7,
            'timeOfDay': 1.5,     # Out of range
            'weather': 0
        }
        
        with pytest.raises(ValidationError):
            state = TrafficState(**invalid_state)


class TestFeatureEngineering:
    """Test feature engineering utilities"""
    
    def test_extract_time_features(self):
        """Test time feature extraction"""
        from app.utils.helpers import extract_time_features
        
        timestamp = pd.Timestamp('2024-01-15 14:30:00')
        
        features = extract_time_features(timestamp)
        
        assert 'hour' in features
        assert 'day_of_week' in features
        assert 'is_peak_hour' in features
        assert features['hour'] == 14
    
    def test_calculate_congestion_level(self):
        """Test congestion level calculation"""
        from app.utils.helpers import calculate_congestion_level
        
        # Test different congestion levels
        low_congestion = calculate_congestion_level(
            queue_length=5,
            avg_speed=50
        )
        
        high_congestion = calculate_congestion_level(
            queue_length=50,
            avg_speed=10
        )
        
        assert low_congestion < high_congestion
        assert 0 <= low_congestion <= 1
        assert 0 <= high_congestion <= 1


class TestDataAugmentation:
    """Test data augmentation for training"""
    
    def test_add_noise(self):
        """Test adding noise to data"""
        from app.utils.helpers import add_noise
        
        data = np.array([10, 20, 30, 40, 50])
        
        noisy_data = add_noise(data, noise_level=0.1)
        
        assert noisy_data.shape == data.shape
        assert not np.array_equal(data, noisy_data)
        
        # Noise should be relatively small
        diff = np.abs(data - noisy_data)
        assert np.all(diff < data * 0.2)
    
    def test_augment_traffic_data(self):
        """Test traffic data augmentation"""
        from app.utils.helpers import augment_traffic_data
        
        original_data = pd.DataFrame({
            'queue_length': [10, 15, 20],
            'vehicle_arrivals': [5, 7, 9],
            'time_of_day': [0.3, 0.5, 0.7]
        })
        
        augmented = augment_traffic_data(
            original_data,
            augmentation_factor=2
        )
        
        assert len(augmented) > len(original_data)
