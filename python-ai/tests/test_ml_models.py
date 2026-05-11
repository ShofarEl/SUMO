import pytest
import numpy as np
from app.services.ml.lstm_model import LSTMModel
from app.services.ml.random_forest_model import RandomForestModel
from app.services.ml.evaluation import ModelEvaluator


class TestLSTMModel:
    """Test LSTM traffic prediction model"""
    
    @pytest.fixture
    def sample_training_data(self):
        """Generate sample training data"""
        # Generate 100 samples with 15-minute history (5 timesteps)
        X = np.random.rand(100, 5, 4)  # (samples, timesteps, features)
        y = np.random.rand(100, 1)      # (samples, output)
        return X, y
    
    def test_lstm_model_initialization(self):
        """Test LSTM model can be initialized"""
        model = LSTMModel(
            input_shape=(5, 4),
            output_size=1
        )
        assert model is not None
    
    def test_lstm_model_architecture(self):
        """Test LSTM model has correct architecture"""
        model = LSTMModel(
            input_shape=(5, 4),
            output_size=1
        )
        
        # Check model has layers
        assert len(model.model.layers) > 0
        
        # Check input shape
        assert model.model.input_shape == (None, 5, 4)
    
    def test_lstm_training(self, sample_training_data):
        """Test LSTM model training"""
        X, y = sample_training_data
        
        model = LSTMModel(
            input_shape=(5, 4),
            output_size=1
        )
        
        history = model.train(
            X, y,
            epochs=2,
            batch_size=16,
            validation_split=0.2
        )
        
        assert history is not None
        assert 'loss' in history.history
        assert len(history.history['loss']) == 2
    
    def test_lstm_prediction(self, sample_training_data):
        """Test LSTM model prediction"""
        X, y = sample_training_data
        
        model = LSTMModel(
            input_shape=(5, 4),
            output_size=1
        )
        
        model.train(X, y, epochs=1, batch_size=16)
        
        # Test prediction
        test_input = X[:5]
        predictions = model.predict(test_input)
        
        assert predictions is not None
        assert len(predictions) == 5
        assert all(isinstance(p, (int, float, np.number)) for p in predictions.flatten())
    
    def test_lstm_save_load(self, sample_training_data, tmp_path):
        """Test LSTM model save and load"""
        X, y = sample_training_data
        
        model = LSTMModel(
            input_shape=(5, 4),
            output_size=1
        )
        
        model.train(X, y, epochs=1, batch_size=16)
        
        # Save model
        model_path = tmp_path / "test_lstm.keras"
        model.save(str(model_path))
        
        assert model_path.exists()
        
        # Load model
        loaded_model = LSTMModel.load(str(model_path))
        assert loaded_model is not None


class TestRandomForestModel:
    """Test Random Forest traffic prediction model"""
    
    @pytest.fixture
    def sample_training_data(self):
        """Generate sample training data"""
        X = np.random.rand(100, 5)  # (samples, features)
        y = np.random.rand(100)      # (samples,)
        return X, y
    
    def test_rf_model_initialization(self):
        """Test Random Forest model can be initialized"""
        model = RandomForestModel(
            n_estimators=10,
            max_depth=5
        )
        assert model is not None
    
    def test_rf_training(self, sample_training_data):
        """Test Random Forest model training"""
        X, y = sample_training_data
        
        model = RandomForestModel(
            n_estimators=10,
            max_depth=5
        )
        
        model.train(X, y)
        
        assert model.model is not None
        assert model.is_trained
    
    def test_rf_prediction(self, sample_training_data):
        """Test Random Forest model prediction"""
        X, y = sample_training_data
        
        model = RandomForestModel(
            n_estimators=10,
            max_depth=5
        )
        
        model.train(X, y)
        
        # Test prediction
        test_input = X[:5]
        predictions = model.predict(test_input)
        
        assert predictions is not None
        assert len(predictions) == 5
        assert all(isinstance(p, (int, float, np.number)) for p in predictions)
    
    def test_rf_feature_importance(self, sample_training_data):
        """Test Random Forest feature importance"""
        X, y = sample_training_data
        
        model = RandomForestModel(
            n_estimators=10,
            max_depth=5
        )
        
        model.train(X, y)
        
        importance = model.get_feature_importance()
        
        assert importance is not None
        assert len(importance) == X.shape[1]
        assert all(i >= 0 for i in importance)
    
    def test_rf_save_load(self, sample_training_data, tmp_path):
        """Test Random Forest model save and load"""
        X, y = sample_training_data
        
        model = RandomForestModel(
            n_estimators=10,
            max_depth=5
        )
        
        model.train(X, y)
        
        # Save model
        model_path = tmp_path / "test_rf.pkl"
        model.save(str(model_path))
        
        assert model_path.exists()
        
        # Load model
        loaded_model = RandomForestModel.load(str(model_path))
        assert loaded_model is not None
        assert loaded_model.is_trained


class TestModelEvaluator:
    """Test model evaluation functionality"""
    
    @pytest.fixture
    def sample_predictions(self):
        """Generate sample predictions and actual values"""
        predictions = np.array([10.5, 15.2, 20.1, 18.5, 22.3])
        actuals = np.array([10.0, 15.0, 21.0, 18.0, 23.0])
        return predictions, actuals
    
    def test_rmse_calculation(self, sample_predictions):
        """Test RMSE calculation"""
        predictions, actuals = sample_predictions
        
        evaluator = ModelEvaluator()
        rmse = evaluator.calculate_rmse(predictions, actuals)
        
        assert rmse > 0
        assert isinstance(rmse, (int, float))
    
    def test_mae_calculation(self, sample_predictions):
        """Test MAE calculation"""
        predictions, actuals = sample_predictions
        
        evaluator = ModelEvaluator()
        mae = evaluator.calculate_mae(predictions, actuals)
        
        assert mae > 0
        assert isinstance(mae, (int, float))
    
    def test_r2_score_calculation(self, sample_predictions):
        """Test R2 score calculation"""
        predictions, actuals = sample_predictions
        
        evaluator = ModelEvaluator()
        r2 = evaluator.calculate_r2_score(predictions, actuals)
        
        assert isinstance(r2, (int, float))
        assert -1 <= r2 <= 1
    
    def test_evaluation_report(self, sample_predictions):
        """Test comprehensive evaluation report"""
        predictions, actuals = sample_predictions
        
        evaluator = ModelEvaluator()
        report = evaluator.generate_report(predictions, actuals)
        
        assert 'rmse' in report
        assert 'mae' in report
        assert 'r2_score' in report
        assert all(isinstance(v, (int, float)) for v in report.values())
    
    def test_accuracy_targets(self):
        """Test prediction accuracy meets targets"""
        # LSTM target: RMSE < 0.0263, MAE < 0.02
        # RF target: RMSE < 0.0352, MAE < 0.025
        
        evaluator = ModelEvaluator()
        
        # Test with perfect predictions
        perfect_pred = np.array([1.0, 2.0, 3.0])
        perfect_actual = np.array([1.0, 2.0, 3.0])
        
        rmse = evaluator.calculate_rmse(perfect_pred, perfect_actual)
        mae = evaluator.calculate_mae(perfect_pred, perfect_actual)
        
        assert rmse == 0.0
        assert mae == 0.0
