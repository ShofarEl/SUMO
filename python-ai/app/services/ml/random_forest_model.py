"""
Random Forest Traffic Prediction Model
Predicts traffic conditions using ensemble decision trees with feature engineering
"""
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import pickle
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from app.core.logging import logger
from app.core.config import settings


class RandomForestTrafficPredictor:
    """Random Forest model for traffic prediction"""
    
    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: Optional[int] = 20,
        min_samples_split: int = 5,
        min_samples_leaf: int = 2,
        max_features: str = 'sqrt',
        random_state: int = 42
    ):
        """
        Initialize Random Forest model
        
        Args:
            n_estimators: Number of trees in the forest
            max_depth: Maximum depth of trees
            min_samples_split: Minimum samples required to split a node
            min_samples_leaf: Minimum samples required at leaf node
            max_features: Number of features to consider for best split
            random_state: Random seed for reproducibility
        """
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.random_state = random_state
        
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = []
        self.feature_importance = {}
        
    def engineer_features(
        self,
        data: pd.DataFrame,
        lookback_steps: int = 5
    ) -> pd.DataFrame:
        """
        Create engineered features from raw traffic data
        
        Args:
            data: DataFrame with columns [queue_length, vehicle_arrivals, time_of_day, weather]
            lookback_steps: Number of historical steps to include
            
        Returns:
            DataFrame with engineered features
        """
        features = pd.DataFrame()
        
        # Current values
        features['queue_length_current'] = data['queue_length']
        features['vehicle_arrivals_current'] = data['vehicle_arrivals']
        features['time_of_day'] = data['time_of_day']
        features['weather'] = data['weather']
        
        # Lagged features (historical values)
        for i in range(1, lookback_steps + 1):
            features[f'queue_length_lag_{i}'] = data['queue_length'].shift(i)
            features[f'vehicle_arrivals_lag_{i}'] = data['vehicle_arrivals'].shift(i)
        
        # Rolling statistics
        for window in [3, 5, 10]:
            features[f'queue_length_rolling_mean_{window}'] = data['queue_length'].rolling(window=window).mean()
            features[f'queue_length_rolling_std_{window}'] = data['queue_length'].rolling(window=window).std()
            features[f'vehicle_arrivals_rolling_mean_{window}'] = data['vehicle_arrivals'].rolling(window=window).mean()
            features[f'vehicle_arrivals_rolling_std_{window}'] = data['vehicle_arrivals'].rolling(window=window).std()
        
        # Rate of change
        features['queue_length_diff_1'] = data['queue_length'].diff(1)
        features['queue_length_diff_2'] = data['queue_length'].diff(2)
        features['vehicle_arrivals_diff_1'] = data['vehicle_arrivals'].diff(1)
        
        # Time-based features
        features['hour'] = (data['time_of_day'] * 24).astype(int)
        features['is_peak_hour'] = features['hour'].apply(
            lambda x: 1 if (7 <= x <= 9) or (16 <= x <= 18) else 0
        )
        features['is_morning_peak'] = features['hour'].apply(lambda x: 1 if 7 <= x <= 9 else 0)
        features['is_evening_peak'] = features['hour'].apply(lambda x: 1 if 16 <= x <= 18 else 0)
        
        # Interaction features
        features['queue_vehicle_ratio'] = data['queue_length'] / (data['vehicle_arrivals'] + 1)
        features['congestion_index'] = features['queue_length_current'] * features['vehicle_arrivals_current']
        
        # Drop rows with NaN values (from lagging and rolling)
        features = features.dropna()
        
        return features
    
    def prepare_data(
        self,
        data: pd.DataFrame,
        target_column: str = 'queue_length',
        prediction_steps: int = 10
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare features and target for training
        
        Args:
            data: Input DataFrame
            target_column: Column to predict
            prediction_steps: Steps ahead to predict
            
        Returns:
            X: Feature DataFrame
            y: Target Series
        """
        # Engineer features
        X = self.engineer_features(data)
        
        # Create target (future value) - align with original data indices
        y = data[target_column].shift(-prediction_steps)
        
        # Find common indices between X and y where both are valid
        common_indices = X.index.intersection(y.index)
        X_aligned = X.loc[common_indices]
        y_aligned = y.loc[common_indices]
        
        # Remove rows where y is NaN
        valid_mask = y_aligned.notna()
        X = X_aligned[valid_mask]
        y = y_aligned[valid_mask]
        
        self.feature_names = X.columns.tolist()
        
        return X, y
    
    def optimize_hyperparameters(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        cv: int = 3
    ) -> Dict:
        """
        Optimize hyperparameters using GridSearchCV
        
        Args:
            X_train: Training features
            y_train: Training target
            cv: Number of cross-validation folds
            
        Returns:
            Best hyperparameters
        """
        logger.info("Starting hyperparameter optimization...")
        
        param_grid = {
            'n_estimators': [50, 100, 150],
            'max_depth': [10, 20, 30, None],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf': [1, 2, 4]
        }
        
        rf = RandomForestRegressor(
            max_features=self.max_features,
            random_state=self.random_state,
            n_jobs=-1
        )
        
        grid_search = GridSearchCV(
            rf,
            param_grid,
            cv=cv,
            scoring='neg_mean_squared_error',
            n_jobs=-1,
            verbose=1
        )
        
        grid_search.fit(X_train, y_train)
        
        best_params = grid_search.best_params_
        logger.info(f"Best hyperparameters: {best_params}")
        
        return best_params
    
    def train(
        self,
        data: pd.DataFrame,
        target_column: str = 'queue_length',
        prediction_steps: int = 10,
        validation_split: float = 0.2,
        optimize_hyperparams: bool = False
    ) -> Dict:
        """
        Train the Random Forest model
        
        Args:
            data: Training data DataFrame
            target_column: Column to predict
            prediction_steps: Steps ahead to predict
            validation_split: Fraction of data for validation
            optimize_hyperparams: Whether to optimize hyperparameters
            
        Returns:
            Training metrics
        """
        logger.info(f"Starting Random Forest training with {len(data)} samples")
        
        # Prepare data
        X, y = self.prepare_data(data, target_column, prediction_steps)
        logger.info(f"Prepared {len(X)} samples with {len(self.feature_names)} features")
        
        # Split into train and validation
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=validation_split, shuffle=False, random_state=self.random_state
        )
        
        # Normalize features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        
        # Optimize hyperparameters if requested
        if optimize_hyperparams:
            best_params = self.optimize_hyperparameters(
                pd.DataFrame(X_train_scaled, columns=self.feature_names),
                y_train
            )
            self.n_estimators = best_params['n_estimators']
            self.max_depth = best_params['max_depth']
            self.min_samples_split = best_params['min_samples_split']
            self.min_samples_leaf = best_params['min_samples_leaf']
        
        # Build and train model
        self.model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_split=self.min_samples_split,
            min_samples_leaf=self.min_samples_leaf,
            max_features=self.max_features,
            random_state=self.random_state,
            n_jobs=-1,
            verbose=1
        )
        
        logger.info("Training Random Forest model...")
        self.model.fit(X_train_scaled, y_train)
        
        self.is_trained = True
        
        # Calculate feature importance
        self.feature_importance = dict(zip(
            self.feature_names,
            self.model.feature_importances_
        ))
        
        # Sort by importance
        self.feature_importance = dict(
            sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)
        )
        
        # Evaluate on training and validation sets
        y_train_pred = self.model.predict(X_train_scaled)
        y_val_pred = self.model.predict(X_val_scaled)
        
        # Calculate metrics
        train_mse = mean_squared_error(y_train, y_train_pred)
        train_rmse = np.sqrt(train_mse)
        train_mae = mean_absolute_error(y_train, y_train_pred)
        train_r2 = r2_score(y_train, y_train_pred)
        
        val_mse = mean_squared_error(y_val, y_val_pred)
        val_rmse = np.sqrt(val_mse)
        val_mae = mean_absolute_error(y_val, y_val_pred)
        val_r2 = r2_score(y_val, y_val_pred)
        
        logger.info(f"Training complete - Val RMSE: {val_rmse:.4f}, Val MAE: {val_mae:.4f}")
        
        # Get top 10 most important features
        top_features = dict(list(self.feature_importance.items())[:10])
        
        return {
            "training_rmse": float(train_rmse),
            "training_mae": float(train_mae),
            "training_r2": float(train_r2),
            "validation_rmse": float(val_rmse),
            "validation_mae": float(val_mae),
            "validation_r2": float(val_r2),
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "num_features": len(self.feature_names),
            "top_features": {k: float(v) for k, v in top_features.items()}
        }
    
    def predict(
        self,
        input_data: pd.DataFrame
    ) -> Tuple[np.ndarray, Dict]:
        """
        Make predictions using trained model
        
        Args:
            input_data: Input DataFrame with required columns
            
        Returns:
            predictions: Predicted values
            confidence: Confidence metrics
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before making predictions")
        
        # Engineer features
        X = self.engineer_features(input_data)
        
        # Ensure all required features are present
        missing_features = set(self.feature_names) - set(X.columns)
        if missing_features:
            raise ValueError(f"Missing features: {missing_features}")
        
        # Select and order features
        X = X[self.feature_names]
        
        # Normalize
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        
        # Calculate prediction intervals using tree predictions
        tree_predictions = np.array([tree.predict(X_scaled) for tree in self.model.estimators_])
        prediction_std = np.std(tree_predictions, axis=0)
        
        confidence = {
            "mean": float(np.mean(predictions)),
            "std": float(np.mean(prediction_std)),
            "min": float(np.min(predictions)),
            "max": float(np.max(predictions)),
            "prediction_interval_95": [
                float(np.mean(predictions) - 1.96 * np.mean(prediction_std)),
                float(np.mean(predictions) + 1.96 * np.mean(prediction_std))
            ]
        }
        
        return predictions, confidence
    
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
        
        # Save model
        model_file = os.path.join(model_path, f"{model_name}.pkl")
        with open(model_file, 'wb') as f:
            pickle.dump(self.model, f)
        
        # Save scaler
        scaler_file = os.path.join(model_path, f"{model_name}_scaler.pkl")
        with open(scaler_file, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        # Save config and feature names
        config_file = os.path.join(model_path, f"{model_name}_config.pkl")
        config = {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "min_samples_split": self.min_samples_split,
            "min_samples_leaf": self.min_samples_leaf,
            "max_features": self.max_features,
            "random_state": self.random_state,
            "feature_names": self.feature_names,
            "feature_importance": self.feature_importance
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
        # Load model
        model_file = os.path.join(model_path, f"{model_name}.pkl")
        with open(model_file, 'rb') as f:
            self.model = pickle.load(f)
        
        # Load scaler
        scaler_file = os.path.join(model_path, f"{model_name}_scaler.pkl")
        with open(scaler_file, 'rb') as f:
            self.scaler = pickle.load(f)
        
        # Load config
        config_file = os.path.join(model_path, f"{model_name}_config.pkl")
        with open(config_file, 'rb') as f:
            config = pickle.load(f)
            self.n_estimators = config["n_estimators"]
            self.max_depth = config["max_depth"]
            self.min_samples_split = config["min_samples_split"]
            self.min_samples_leaf = config["min_samples_leaf"]
            self.max_features = config["max_features"]
            self.random_state = config["random_state"]
            self.feature_names = config["feature_names"]
            self.feature_importance = config["feature_importance"]
        
        self.is_trained = True
        logger.info(f"Model loaded from {model_file}")
    
    def evaluate(
        self,
        test_data: pd.DataFrame,
        target_column: str = 'queue_length',
        prediction_steps: int = 10
    ) -> Dict:
        """
        Evaluate model on test data
        
        Args:
            test_data: Test data DataFrame
            target_column: Column to predict
            prediction_steps: Steps ahead to predict
            
        Returns:
            Evaluation metrics
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before evaluation")
        
        # Prepare data
        X_test, y_test = self.prepare_data(test_data, target_column, prediction_steps)
        
        # Normalize
        X_test_scaled = self.scaler.transform(X_test)
        
        # Make predictions
        y_pred = self.model.predict(X_test_scaled)
        
        # Calculate metrics
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Calculate errors
        errors = y_pred - y_test
        mean_error = np.mean(errors)
        std_error = np.std(errors)
        
        logger.info(f"Evaluation - RMSE: {rmse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")
        
        return {
            "rmse": float(rmse),
            "mae": float(mae),
            "mse": float(mse),
            "r2_score": float(r2),
            "mean_error": float(mean_error),
            "std_error": float(std_error),
            "num_samples": len(X_test)
        }
