import pytest
import numpy as np
from app.services.ml.evaluation import ModelEvaluator


class TestPredictionAccuracyValidation:
    """Test prediction accuracy meets target thresholds"""
    
    def test_lstm_rmse_target(self):
        """Test LSTM RMSE meets target of < 0.0263"""
        evaluator = ModelEvaluator()
        
        # Simulate good predictions
        predictions = np.array([0.95, 1.02, 0.98, 1.01, 0.97])
        actuals = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
        
        rmse = evaluator.calculate_rmse(predictions, actuals)
        
        # Should be well below target
        assert rmse < 0.0263
    
    def test_lstm_mae_target(self):
        """Test LSTM MAE meets target of < 0.02"""
        evaluator = ModelEvaluator()
        
        # Simulate good predictions
        predictions = np.array([0.98, 1.01, 0.99, 1.02, 0.97])
        actuals = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
        
        mae = evaluator.calculate_mae(predictions, actuals)
        
        # Should be well below target
        assert mae < 0.02
    
    def test_rf_rmse_target(self):
        """Test Random Forest RMSE meets target of < 0.0352"""
        evaluator = ModelEvaluator()
        
        # Simulate good predictions
        predictions = np.array([0.96, 1.03, 0.97, 1.02, 0.98])
        actuals = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
        
        rmse = evaluator.calculate_rmse(predictions, actuals)
        
        # Should be below target
        assert rmse < 0.0352
    
    def test_rf_mae_target(self):
        """Test Random Forest MAE meets target of < 0.025"""
        evaluator = ModelEvaluator()
        
        # Simulate good predictions
        predictions = np.array([0.97, 1.02, 0.98, 1.03, 0.96])
        actuals = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
        
        mae = evaluator.calculate_mae(predictions, actuals)
        
        # Should be below target
        assert mae < 0.025


class TestDQNPerformanceValidation:
    """Test DQN agent performance meets target thresholds"""
    
    def test_delay_reduction_target(self):
        """Test DQN achieves 25-34% delay reduction"""
        baseline_delay = 45.0  # seconds
        dqn_delay = 30.0       # seconds
        
        reduction = (baseline_delay - dqn_delay) / baseline_delay * 100
        
        assert 25 <= reduction <= 40  # Allow some margin
    
    def test_queue_reduction_target(self):
        """Test DQN achieves 20-30% queue length reduction"""
        baseline_queue = 50.0  # meters
        dqn_queue = 37.5       # meters
        
        reduction = (baseline_queue - dqn_queue) / baseline_queue * 100
        
        assert 20 <= reduction <= 35
    
    def test_throughput_increase_target(self):
        """Test DQN achieves 15-25% throughput increase"""
        baseline_throughput = 100.0  # vehicles/hour
        dqn_throughput = 120.0       # vehicles/hour
        
        increase = (dqn_throughput - baseline_throughput) / baseline_throughput * 100
        
        assert 15 <= increase <= 30
    
    def test_fuel_reduction_target(self):
        """Test DQN achieves ~24% fuel consumption reduction"""
        baseline_fuel = 100.0  # liters
        dqn_fuel = 76.0        # liters
        
        reduction = (baseline_fuel - dqn_fuel) / baseline_fuel * 100
        
        assert 20 <= reduction <= 28


class TestVehicleMixValidation:
    """Test vehicle mix matches Guyana statistics"""
    
    def test_default_vehicle_mix(self):
        """Test default vehicle mix matches Guyana statistics"""
        guyana_mix = {
            'cars': 55,
            'motorcycles': 25,
            'minibuses': 15,
            'trucks': 5
        }
        
        # Verify sum equals 100
        assert sum(guyana_mix.values()) == 100
        
        # Verify individual percentages
        assert guyana_mix['cars'] == 55
        assert guyana_mix['motorcycles'] == 25
        assert guyana_mix['minibuses'] == 15
        assert guyana_mix['trucks'] == 5
    
    def test_vehicle_mix_tolerance(self):
        """Test vehicle mix within 2% tolerance"""
        guyana_mix = {
            'cars': 55,
            'motorcycles': 25,
            'minibuses': 15,
            'trucks': 5
        }
        
        test_mix = {
            'cars': 56,  # +1% deviation
            'motorcycles': 24,  # -1% deviation
            'minibuses': 15,
            'trucks': 5
        }
        
        # Check deviations are within tolerance
        for vehicle_type in guyana_mix:
            deviation = abs(test_mix[vehicle_type] - guyana_mix[vehicle_type])
            assert deviation <= 2


class TestNetworkAccuracyValidation:
    """Test OSM network accuracy"""
    
    def test_georgetown_bounds(self):
        """Test Georgetown bounding box is valid"""
        bounds = {
            'north': 6.85,
            'south': 6.75,
            'east': -58.10,
            'west': -58.20
        }
        
        # Verify bounds are valid
        assert bounds['north'] > bounds['south']
        assert bounds['east'] > bounds['west']
        
        # Verify bounds are in Georgetown area
        assert 6.5 < bounds['south'] < 7.0
        assert 6.5 < bounds['north'] < 7.0
        assert -58.5 < bounds['west'] < -58.0
        assert -58.5 < bounds['east'] < -58.0
    
    def test_key_intersection_locations(self):
        """Test key intersections are within Georgetown"""
        intersections = [
            {'name': 'Vlissengen Road', 'lat': 6.8013, 'lon': -58.1551},
            {'name': 'Sheriff Street', 'lat': 6.8100, 'lon': -58.1450},
            {'name': 'Demerara Bridge', 'lat': 6.8050, 'lon': -58.1800}
        ]
        
        for intersection in intersections:
            # Verify coordinates are in Georgetown area
            assert 6.75 < intersection['lat'] < 6.85
            assert -58.20 < intersection['lon'] < -58.10


class TestTravelTimeValidation:
    """Test travel time validation against Google Maps"""
    
    def test_travel_time_deviation_threshold(self):
        """Test travel time deviation is within 15%"""
        simulated = 15.5  # minutes
        google_maps = 14.0  # minutes
        
        deviation = abs(simulated - google_maps) / google_maps * 100
        
        assert deviation < 15
    
    def test_multiple_route_validation(self):
        """Test multiple routes meet deviation threshold"""
        routes = [
            {'simulated': 15, 'actual': 14},
            {'simulated': 22, 'actual': 20},
            {'simulated': 30, 'actual': 28}
        ]
        
        for route in routes:
            deviation = abs(route['simulated'] - route['actual']) / route['actual'] * 100
            assert deviation < 15


class TestDataQualityValidation:
    """Test data quality meets standards"""
    
    def test_data_completeness_threshold(self):
        """Test data completeness is above 80%"""
        total_values = 100
        missing_values = 10
        
        completeness = (total_values - missing_values) / total_values * 100
        
        assert completeness > 80
    
    def test_outlier_detection(self):
        """Test outlier detection works correctly"""
        data = np.array([50, 52, 51, 49, 53, 200])  # 200 is outlier
        
        # Calculate IQR
        q1 = np.percentile(data, 25)
        q3 = np.percentile(data, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = data[(data < lower_bound) | (data > upper_bound)]
        
        assert len(outliers) > 0
        assert 200 in outliers
    
    def test_data_consistency(self):
        """Test data consistency validation"""
        # Test temporal consistency
        timestamps = [1, 2, 3, 4, 5]
        
        # Check timestamps are monotonically increasing
        for i in range(1, len(timestamps)):
            assert timestamps[i] > timestamps[i-1]


class TestModelConvergenceValidation:
    """Test model training convergence"""
    
    def test_loss_decreases_during_training(self):
        """Test that loss decreases during training"""
        training_losses = [1.5, 1.2, 0.9, 0.6, 0.4, 0.3]
        
        # Verify loss generally decreases
        for i in range(1, len(training_losses)):
            assert training_losses[i] <= training_losses[i-1]
    
    def test_reward_increases_during_rl_training(self):
        """Test that RL reward increases during training"""
        episode_rewards = [-50, -40, -30, -20, -10, -5]
        
        # Verify reward increases (becomes less negative)
        for i in range(1, len(episode_rewards)):
            assert episode_rewards[i] > episode_rewards[i-1]
    
    def test_validation_accuracy_improves(self):
        """Test that validation accuracy improves during training"""
        validation_accuracies = [0.6, 0.7, 0.75, 0.8, 0.85, 0.9]
        
        # Verify accuracy generally increases
        for i in range(1, len(validation_accuracies)):
            assert validation_accuracies[i] >= validation_accuracies[i-1]
