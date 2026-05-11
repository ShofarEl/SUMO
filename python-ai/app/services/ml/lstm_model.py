"""
LSTM Traffic Prediction Model
Predicts traffic conditions (queue lengths, congestion) based on historical time-series data
"""
import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import pickle
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from app.core.logging import logger
from app.core.config import settings


class LSTMTrafficPredictor:
    """LSTM model for traffic prediction"""
    
    def __init__(
        self,
        sequence_length: int = 15,  # 15 minutes of history
        prediction_horizon: int = 10,  # Predict 5-15 minutes ahead
        features: int = 4,  # queue_length, vehicle_arrivals, time_of_day, weather
        lstm_units: List[int] = [64, 32],
        dropout_rate: float = 0.2
    ):
        """
        Initialize LSTM model
        
        Args:
            sequence_length: Number of time steps to look back (minutes)
            prediction_horizon: Number of time steps to predict ahead (minutes)
            features: Number of input features
            lstm_units: List of LSTM layer units
            dropout_rate: Dropout rate for regularization
        """
        self.sequence_length = sequence_length
        self.prediction_horizon = prediction_horizon
        self.features = features
        self.lstm_units = lstm_units
        self.dropout_rate = dropout_rate
        
        self.model = None
        self.scaler = MinMaxScaler()
        self.is_trained = False
        
    def build_model(self) -> keras.Model:
        """Build LSTM model architecture"""
        model = keras.Sequential(name="LSTM_Traffic_Predictor")
        
        # Input layer
        model.add(layers.Input(shape=(self.sequence_length, self.features)))
        
        # LSTM layers
        for i, units in enumerate(self.lstm_units):
            return_sequences = i < len(self.lstm_units) - 1
            model.add(layers.LSTM(
                units,
                return_sequences=return_sequences,
                name=f"lstm_{i+1}"
            ))
            model.add(layers.Dropout(self.dropout_rate, name=f"dropout_{i+1}"))
        
        # Dense layers for prediction
        model.add(layers.Dense(32, activation='relu', name='dense_1'))
        model.add(layers.Dropout(self.dropout_rate, name='dropout_final'))
        model.add(layers.Dense(self.prediction_horizon, name='output'))
        
        # Compile model
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae', 'mse']
        )
        
        logger.info(f"Built LSTM model with architecture: {self.lstm_units}")
        return model
    
    def prepare_sequences(
        self,
        data: np.ndarray,
        target_column: int = 0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare time-series sequences for training
        
        Args:
            data: Input data array (timesteps, features)
            target_column: Column index to predict
            
        Returns:
            X: Input sequences (samples, sequence_length, features)
            y: Target values (samples, prediction_horizon)
        """
        X, y = [], []
        
        for i in range(len(data) - self.sequence_length - self.prediction_horizon + 1):
            # Input sequence
            X.append(data[i:i + self.sequence_length])
            # Target sequence (only the target column)
            y.append(data[i + self.sequence_length:i + self.sequence_length + self.prediction_horizon, target_column])
        
        return np.array(X), np.array(y)
    
    def preprocess_data(
        self,
        data: np.ndarray,
        fit_scaler: bool = True
    ) -> np.ndarray:
        """
        Normalize data using MinMaxScaler
        
        Args:
            data: Input data
            fit_scaler: Whether to fit the scaler (True for training, False for inference)
            
        Returns:
            Normalized data
        """
        if fit_scaler:
            return self.scaler.fit_transform(data)
        else:
            return self.scaler.transform(data)
    
    def train(
        self,
        data: np.ndarray,
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.2,
        early_stopping_patience: int = 10
    ) -> Dict:
        """
        Train the LSTM model
        
        Args:
            data: Training data (timesteps, features)
            epochs: Number of training epochs
            batch_size: Batch size for training
            validation_split: Fraction of data for validation
            early_stopping_patience: Patience for early stopping
            
        Returns:
            Training history and metrics
        """
        logger.info(f"Starting LSTM training with {len(data)} timesteps")
        
        # Preprocess data
        data_normalized = self.preprocess_data(data, fit_scaler=True)
        
        # Prepare sequences
        X, y = self.prepare_sequences(data_normalized)
        logger.info(f"Prepared {len(X)} sequences for training")
        
        # Split into train and validation
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=validation_split, shuffle=False
        )
        
        # Build model
        self.model = self.build_model()
        
        # Callbacks
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=early_stopping_patience,
                restore_best_weights=True,
                verbose=1
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-6,
                verbose=1
            )
        ]
        
        # Train model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        self.is_trained = True
        
        # Calculate final metrics
        train_loss, train_mae, train_mse = self.model.evaluate(X_train, y_train, verbose=0)
        val_loss, val_mae, val_mse = self.model.evaluate(X_val, y_val, verbose=0)
        
        # Calculate RMSE
        train_rmse = np.sqrt(train_mse)
        val_rmse = np.sqrt(val_mse)
        
        logger.info(f"Training complete - Val RMSE: {val_rmse:.4f}, Val MAE: {val_mae:.4f}")
        
        return {
            "training_loss": float(train_loss),
            "training_mae": float(train_mae),
            "training_rmse": float(train_rmse),
            "validation_loss": float(val_loss),
            "validation_mae": float(val_mae),
            "validation_rmse": float(val_rmse),
            "epochs_trained": len(history.history['loss']),
            "history": {
                "loss": [float(x) for x in history.history['loss']],
                "val_loss": [float(x) for x in history.history['val_loss']],
                "mae": [float(x) for x in history.history['mae']],
                "val_mae": [float(x) for x in history.history['val_mae']]
            }
        }
    
    def predict(
        self,
        input_sequence: np.ndarray
    ) -> Tuple[np.ndarray, Dict]:
        """
        Make predictions using trained model
        
        Args:
            input_sequence: Input sequence (sequence_length, features)
            
        Returns:
            predictions: Predicted values (prediction_horizon,)
            confidence: Confidence metrics
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before making predictions")
        
        # Ensure input has correct shape
        if input_sequence.shape[0] != self.sequence_length:
            raise ValueError(f"Input sequence must have {self.sequence_length} timesteps")
        
        # Normalize input
        input_normalized = self.preprocess_data(input_sequence, fit_scaler=False)
        
        # Reshape for model input (1, sequence_length, features)
        input_batch = np.expand_dims(input_normalized, axis=0)
        
        # Make prediction
        prediction_normalized = self.model.predict(input_batch, verbose=0)[0]
        
        # Denormalize prediction (only first feature - queue length)
        # Create dummy array with same shape as original features
        dummy = np.zeros((self.prediction_horizon, self.features))
        dummy[:, 0] = prediction_normalized
        prediction_denormalized = self.scaler.inverse_transform(dummy)[:, 0]
        
        # Calculate confidence (simple approach using prediction variance)
        confidence = {
            "mean": float(np.mean(prediction_denormalized)),
            "std": float(np.std(prediction_denormalized)),
            "min": float(np.min(prediction_denormalized)),
            "max": float(np.max(prediction_denormalized))
        }
        
        return prediction_denormalized, confidence
    
    def save_model(self, model_path: str, model_name: str) -> str:
        """
        Save trained model and scaler to disk
        
        Args:
            model_path: Directory to save model
            model_name: Name for the model files
            
        Returns:
            Path to saved model
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before saving")
        
        os.makedirs(model_path, exist_ok=True)
        
        # Save Keras model
        model_file = os.path.join(model_path, f"{model_name}.keras")
        self.model.save(model_file)
        
        # Save scaler
        scaler_file = os.path.join(model_path, f"{model_name}_scaler.pkl")
        with open(scaler_file, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        # Save config
        config_file = os.path.join(model_path, f"{model_name}_config.pkl")
        config = {
            "sequence_length": self.sequence_length,
            "prediction_horizon": self.prediction_horizon,
            "features": self.features,
            "lstm_units": self.lstm_units,
            "dropout_rate": self.dropout_rate
        }
        with open(config_file, 'wb') as f:
            pickle.dump(config, f)
        
        logger.info(f"Model saved to {model_file}")
        return model_file
    
    def load_model(self, model_path: str, model_name: str):
        """
        Load trained model and scaler from disk
        
        Args:
            model_path: Directory containing model files
            model_name: Name of the model files
        """
        # Load Keras model
        model_file = os.path.join(model_path, f"{model_name}.keras")
        self.model = keras.models.load_model(model_file)
        
        # Load scaler
        scaler_file = os.path.join(model_path, f"{model_name}_scaler.pkl")
        with open(scaler_file, 'rb') as f:
            self.scaler = pickle.load(f)
        
        # Load config
        config_file = os.path.join(model_path, f"{model_name}_config.pkl")
        with open(config_file, 'rb') as f:
            config = pickle.load(f)
            self.sequence_length = config["sequence_length"]
            self.prediction_horizon = config["prediction_horizon"]
            self.features = config["features"]
            self.lstm_units = config["lstm_units"]
            self.dropout_rate = config["dropout_rate"]
        
        self.is_trained = True
        logger.info(f"Model loaded from {model_file}")
    
    def evaluate(
        self,
        test_data: np.ndarray
    ) -> Dict:
        """
        Evaluate model on test data
        
        Args:
            test_data: Test data (timesteps, features)
            
        Returns:
            Evaluation metrics
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before evaluation")
        
        # Preprocess data
        data_normalized = self.preprocess_data(test_data, fit_scaler=False)
        
        # Prepare sequences
        X_test, y_test = self.prepare_sequences(data_normalized)
        
        # Evaluate
        test_loss, test_mae, test_mse = self.model.evaluate(X_test, y_test, verbose=0)
        test_rmse = np.sqrt(test_mse)
        
        # Make predictions for detailed analysis
        predictions = self.model.predict(X_test, verbose=0)
        
        # Calculate additional metrics
        errors = predictions - y_test
        mean_error = np.mean(errors)
        std_error = np.std(errors)
        
        logger.info(f"Evaluation - RMSE: {test_rmse:.4f}, MAE: {test_mae:.4f}")
        
        return {
            "rmse": float(test_rmse),
            "mae": float(test_mae),
            "mse": float(test_mse),
            "mean_error": float(mean_error),
            "std_error": float(std_error),
            "num_samples": len(X_test)
        }
