"""
Model evaluation and accuracy assessment
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from app.core.logging import logger


class ModelEvaluator:
    """Evaluate and compare prediction model performance"""
    
    @staticmethod
    def calculate_metrics(
        y_true: np.ndarray,
        y_pred: np.ndarray
    ) -> Dict[str, float]:
        """
        Calculate comprehensive evaluation metrics
        
        Args:
            y_true: Actual values
            y_pred: Predicted values
            
        Returns:
            Dictionary of metrics
        """
        # Basic metrics
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        
        # Error statistics
        errors = y_pred - y_true
        mean_error = np.mean(errors)
        std_error = np.std(errors)
        median_error = np.median(errors)
        
        # Percentage errors
        mape = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-10))) * 100
        
        # Directional accuracy (for time series)
        if len(y_true) > 1:
            true_direction = np.sign(np.diff(y_true))
            pred_direction = np.sign(np.diff(y_pred))
            directional_accuracy = np.mean(true_direction == pred_direction) * 100
        else:
            directional_accuracy = None
        
        metrics = {
            "rmse": float(rmse),
            "mae": float(mae),
            "mse": float(mse),
            "r2_score": float(r2),
            "mean_error": float(mean_error),
            "std_error": float(std_error),
            "median_error": float(median_error),
            "mape": float(mape)
        }
        
        if directional_accuracy is not None:
            metrics["directional_accuracy"] = float(directional_accuracy)
        
        return metrics
    
    @staticmethod
    def compare_with_baseline(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        baseline_pred: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Compare model predictions with baseline
        
        Args:
            y_true: Actual values
            y_pred: Model predictions
            baseline_pred: Baseline predictions (if None, uses persistence model)
            
        Returns:
            Comparison metrics
        """
        # If no baseline provided, use persistence model (last known value)
        if baseline_pred is None:
            baseline_pred = np.roll(y_true, 1)
            baseline_pred[0] = y_true[0]
        
        # Calculate metrics for both
        model_metrics = ModelEvaluator.calculate_metrics(y_true, y_pred)
        baseline_metrics = ModelEvaluator.calculate_metrics(y_true, baseline_pred)
        
        # Calculate improvements
        rmse_improvement = ((baseline_metrics["rmse"] - model_metrics["rmse"]) / 
                           baseline_metrics["rmse"] * 100)
        mae_improvement = ((baseline_metrics["mae"] - model_metrics["mae"]) / 
                          baseline_metrics["mae"] * 100)
        
        return {
            "model_rmse": model_metrics["rmse"],
            "model_mae": model_metrics["mae"],
            "baseline_rmse": baseline_metrics["rmse"],
            "baseline_mae": baseline_metrics["mae"],
            "rmse_improvement_percent": float(rmse_improvement),
            "mae_improvement_percent": float(mae_improvement),
            "is_better_than_baseline": rmse_improvement > 0
        }
    
    @staticmethod
    def evaluate_prediction_intervals(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        prediction_std: np.ndarray,
        confidence_level: float = 0.95
    ) -> Dict[str, float]:
        """
        Evaluate prediction interval coverage
        
        Args:
            y_true: Actual values
            y_pred: Predicted values
            prediction_std: Prediction standard deviations
            confidence_level: Confidence level for intervals
            
        Returns:
            Interval evaluation metrics
        """
        # Calculate z-score for confidence level
        from scipy import stats
        z_score = stats.norm.ppf((1 + confidence_level) / 2)
        
        # Calculate prediction intervals
        lower_bound = y_pred - z_score * prediction_std
        upper_bound = y_pred + z_score * prediction_std
        
        # Check coverage
        within_interval = (y_true >= lower_bound) & (y_true <= upper_bound)
        coverage = np.mean(within_interval) * 100
        
        # Calculate interval width
        avg_interval_width = np.mean(upper_bound - lower_bound)
        
        # Calculate sharpness (narrower is better, if coverage is adequate)
        sharpness = np.mean(prediction_std)
        
        return {
            "coverage_percent": float(coverage),
            "target_coverage_percent": float(confidence_level * 100),
            "avg_interval_width": float(avg_interval_width),
            "sharpness": float(sharpness),
            "is_well_calibrated": abs(coverage - confidence_level * 100) < 5
        }
    
    @staticmethod
    def compare_models(
        y_true: np.ndarray,
        predictions: Dict[str, np.ndarray]
    ) -> pd.DataFrame:
        """
        Compare multiple models on the same test data
        
        Args:
            y_true: Actual values
            predictions: Dictionary of model_name -> predictions
            
        Returns:
            DataFrame with comparison results
        """
        results = []
        
        for model_name, y_pred in predictions.items():
            metrics = ModelEvaluator.calculate_metrics(y_true, y_pred)
            metrics["model_name"] = model_name
            results.append(metrics)
        
        df = pd.DataFrame(results)
        
        # Rank models by RMSE
        df = df.sort_values("rmse")
        df["rank"] = range(1, len(df) + 1)
        
        return df
    
    @staticmethod
    def generate_accuracy_report(
        model_name: str,
        model_type: str,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        training_time: float,
        additional_info: Optional[Dict] = None
    ) -> Dict:
        """
        Generate comprehensive accuracy report
        
        Args:
            model_name: Name of the model
            model_type: Type of model (lstm, random_forest)
            y_true: Actual values
            y_pred: Predicted values
            training_time: Time taken to train model
            additional_info: Additional model information
            
        Returns:
            Comprehensive report dictionary
        """
        # Calculate metrics
        metrics = ModelEvaluator.calculate_metrics(y_true, y_pred)
        
        # Compare with baseline
        baseline_comparison = ModelEvaluator.compare_with_baseline(y_true, y_pred)
        
        # Check if meets target accuracy
        target_rmse = 0.0263 if model_type == "lstm" else 0.0352
        target_mae = 0.02 if model_type == "lstm" else 0.025
        
        meets_rmse_target = metrics["rmse"] <= target_rmse
        meets_mae_target = metrics["mae"] <= target_mae
        
        report = {
            "model_name": model_name,
            "model_type": model_type,
            "evaluation_timestamp": datetime.now().isoformat(),
            "num_samples": len(y_true),
            "training_time_seconds": training_time,
            
            # Core metrics
            "metrics": metrics,
            
            # Baseline comparison
            "baseline_comparison": baseline_comparison,
            
            # Target achievement
            "target_achievement": {
                "target_rmse": target_rmse,
                "target_mae": target_mae,
                "meets_rmse_target": meets_rmse_target,
                "meets_mae_target": meets_mae_target,
                "meets_all_targets": meets_rmse_target and meets_mae_target
            },
            
            # Summary
            "summary": {
                "overall_performance": "excellent" if meets_rmse_target and meets_mae_target else
                                      "good" if metrics["rmse"] < target_rmse * 1.5 else
                                      "acceptable" if metrics["rmse"] < target_rmse * 2 else
                                      "needs_improvement",
                "recommendation": "Deploy" if meets_rmse_target and meets_mae_target else
                                 "Consider deployment with monitoring" if metrics["rmse"] < target_rmse * 1.5 else
                                 "Retrain with more data or different hyperparameters"
            }
        }
        
        # Add additional info if provided
        if additional_info:
            report["additional_info"] = additional_info
        
        logger.info(f"Generated accuracy report for {model_name}: "
                   f"RMSE={metrics['rmse']:.4f}, MAE={metrics['mae']:.4f}")
        
        return report
    
    @staticmethod
    def evaluate_temporal_performance(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        time_steps: np.ndarray
    ) -> Dict:
        """
        Evaluate model performance across different time horizons
        
        Args:
            y_true: Actual values
            y_pred: Predicted values
            time_steps: Time step indices
            
        Returns:
            Temporal performance metrics
        """
        # Group by time horizon
        unique_steps = np.unique(time_steps)
        temporal_metrics = []
        
        for step in unique_steps:
            mask = time_steps == step
            if np.sum(mask) > 0:
                step_metrics = ModelEvaluator.calculate_metrics(
                    y_true[mask],
                    y_pred[mask]
                )
                step_metrics["time_step"] = int(step)
                temporal_metrics.append(step_metrics)
        
        # Calculate degradation rate (how much accuracy decreases over time)
        if len(temporal_metrics) > 1:
            first_rmse = temporal_metrics[0]["rmse"]
            last_rmse = temporal_metrics[-1]["rmse"]
            degradation_rate = (last_rmse - first_rmse) / first_rmse * 100
        else:
            degradation_rate = 0.0
        
        return {
            "temporal_metrics": temporal_metrics,
            "degradation_rate_percent": float(degradation_rate),
            "maintains_accuracy": degradation_rate < 50  # Less than 50% degradation
        }
    
    @staticmethod
    def store_evaluation_results(
        report: Dict,
        storage_path: str
    ) -> str:
        """
        Store evaluation results to file
        
        Args:
            report: Evaluation report
            storage_path: Path to store results
            
        Returns:
            Path to stored file
        """
        import json
        import os
        
        os.makedirs(storage_path, exist_ok=True)
        
        filename = f"{report['model_name']}_evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(storage_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Evaluation results stored at {filepath}")
        return filepath
