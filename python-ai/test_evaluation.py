"""
Test script for prediction evaluation functionality
"""
import numpy as np
import pandas as pd
from app.services.ml.evaluation import ModelEvaluator
from app.services.ml.lstm_model import LSTMTrafficPredictor
from app.services.ml.random_forest_model import RandomForestTrafficPredictor


def test_calculate_metrics():
    """Test metric calculation"""
    print("Testing metric calculation...")
    
    # Generate sample data
    y_true = np.array([10.0, 12.0, 15.0, 18.0, 20.0, 22.0, 25.0, 28.0, 30.0, 32.0])
    y_pred = np.array([10.5, 11.8, 15.2, 17.5, 20.3, 22.5, 24.8, 28.2, 29.8, 32.1])
    
    metrics = ModelEvaluator.calculate_metrics(y_true, y_pred)
    
    print(f"  RMSE: {metrics['rmse']:.4f}")
    print(f"  MAE: {metrics['mae']:.4f}")
    print(f"  R² Score: {metrics['r2_score']:.4f}")
    print(f"  Mean Error: {metrics['mean_error']:.4f}")
    print(f"  Std Error: {metrics['std_error']:.4f}")
    
    assert metrics['rmse'] > 0, "RMSE should be positive"
    assert metrics['mae'] > 0, "MAE should be positive"
    assert 'r2_score' in metrics, "R² score should be calculated"
    
    print("✓ Metric calculation test passed\n")


def test_baseline_comparison():
    """Test baseline comparison"""
    print("Testing baseline comparison...")
    
    y_true = np.array([10.0, 12.0, 15.0, 18.0, 20.0])
    y_pred = np.array([10.5, 11.8, 15.2, 17.5, 20.3])
    
    comparison = ModelEvaluator.compare_with_baseline(y_true, y_pred)
    
    print(f"  Model RMSE: {comparison['model_rmse']:.4f}")
    print(f"  Baseline RMSE: {comparison['baseline_rmse']:.4f}")
    print(f"  RMSE Improvement: {comparison['rmse_improvement_percent']:.2f}%")
    print(f"  Better than baseline: {comparison['is_better_than_baseline']}")
    
    assert 'model_rmse' in comparison, "Model RMSE should be calculated"
    assert 'baseline_rmse' in comparison, "Baseline RMSE should be calculated"
    assert 'rmse_improvement_percent' in comparison, "Improvement should be calculated"
    
    print("✓ Baseline comparison test passed\n")


def test_model_comparison():
    """Test comparing multiple models"""
    print("Testing model comparison...")
    
    y_true = np.array([10.0, 12.0, 15.0, 18.0, 20.0])
    
    predictions = {
        'model_a': np.array([10.5, 11.8, 15.2, 17.5, 20.3]),
        'model_b': np.array([10.2, 12.1, 14.9, 18.2, 19.8]),
        'model_c': np.array([11.0, 12.5, 15.5, 18.5, 20.5])
    }
    
    comparison_df = ModelEvaluator.compare_models(y_true, predictions)
    
    print("  Model Comparison Results:")
    print(comparison_df[['model_name', 'rmse', 'mae', 'rank']].to_string(index=False))
    
    assert len(comparison_df) == 3, "Should have 3 models"
    assert 'rank' in comparison_df.columns, "Should have rank column"
    assert comparison_df.iloc[0]['rank'] == 1, "Best model should be rank 1"
    
    print("✓ Model comparison test passed\n")


def test_accuracy_report():
    """Test accuracy report generation"""
    print("Testing accuracy report generation...")
    
    y_true = np.array([10.0, 12.0, 15.0, 18.0, 20.0, 22.0, 25.0, 28.0, 30.0, 32.0])
    y_pred = np.array([10.1, 12.05, 15.02, 18.01, 20.03, 22.02, 25.01, 28.03, 30.02, 32.01])
    
    report = ModelEvaluator.generate_accuracy_report(
        model_name="test_lstm",
        model_type="lstm",
        y_true=y_true,
        y_pred=y_pred,
        training_time=120.5,
        additional_info={"test": "data"}
    )
    
    print(f"  Model: {report['model_name']}")
    print(f"  RMSE: {report['metrics']['rmse']:.4f}")
    print(f"  MAE: {report['metrics']['mae']:.4f}")
    print(f"  Meets RMSE target: {report['target_achievement']['meets_rmse_target']}")
    print(f"  Meets MAE target: {report['target_achievement']['meets_mae_target']}")
    print(f"  Overall performance: {report['summary']['overall_performance']}")
    print(f"  Recommendation: {report['summary']['recommendation']}")
    
    assert 'metrics' in report, "Report should have metrics"
    assert 'baseline_comparison' in report, "Report should have baseline comparison"
    assert 'target_achievement' in report, "Report should have target achievement"
    assert 'summary' in report, "Report should have summary"
    
    print("✓ Accuracy report test passed\n")


def test_temporal_performance():
    """Test temporal performance evaluation"""
    print("Testing temporal performance evaluation...")
    
    # Generate data with different time steps
    y_true = np.array([10.0, 12.0, 15.0, 18.0, 20.0, 22.0, 25.0, 28.0, 30.0, 32.0])
    y_pred = np.array([10.1, 12.2, 15.5, 18.8, 21.0, 23.5, 26.5, 30.0, 33.0, 36.0])
    time_steps = np.array([1, 1, 1, 2, 2, 2, 3, 3, 3, 3])
    
    temporal_metrics = ModelEvaluator.evaluate_temporal_performance(
        y_true, y_pred, time_steps
    )
    
    print(f"  Number of time steps: {len(temporal_metrics['temporal_metrics'])}")
    print(f"  Degradation rate: {temporal_metrics['degradation_rate_percent']:.2f}%")
    print(f"  Maintains accuracy: {temporal_metrics['maintains_accuracy']}")
    
    for step_metric in temporal_metrics['temporal_metrics']:
        print(f"    Step {step_metric['time_step']}: RMSE={step_metric['rmse']:.4f}")
    
    assert 'temporal_metrics' in temporal_metrics, "Should have temporal metrics"
    assert 'degradation_rate_percent' in temporal_metrics, "Should have degradation rate"
    
    print("✓ Temporal performance test passed\n")


def test_lstm_evaluation():
    """Test LSTM model evaluation"""
    print("Testing LSTM model evaluation...")
    
    # Generate synthetic training data
    np.random.seed(42)
    n_samples = 200
    data = np.random.randn(n_samples, 4) * 5 + 15
    data[:, 0] = np.abs(data[:, 0])  # Queue length (positive)
    data[:, 1] = np.abs(data[:, 1])  # Vehicle arrivals (positive)
    data[:, 2] = np.random.rand(n_samples)  # Time of day (0-1)
    data[:, 3] = np.random.randint(0, 2, n_samples)  # Weather (0 or 1)
    
    # Create and train model
    model = LSTMTrafficPredictor(
        sequence_length=10,
        prediction_horizon=5,
        features=4,
        lstm_units=[32, 16],
        dropout_rate=0.2
    )
    
    print("  Training LSTM model...")
    training_results = model.train(
        data=data,
        epochs=5,  # Small number for testing
        batch_size=16,
        validation_split=0.2
    )
    
    print(f"  Training RMSE: {training_results['training_rmse']:.4f}")
    print(f"  Validation RMSE: {training_results['validation_rmse']:.4f}")
    
    # Evaluate on test data
    test_data = data[-50:]
    eval_results = model.evaluate(test_data)
    
    print(f"  Test RMSE: {eval_results['rmse']:.4f}")
    print(f"  Test MAE: {eval_results['mae']:.4f}")
    
    assert eval_results['rmse'] > 0, "RMSE should be positive"
    assert eval_results['mae'] > 0, "MAE should be positive"
    
    print("✓ LSTM evaluation test passed\n")


def test_random_forest_evaluation():
    """Test Random Forest model evaluation"""
    print("Testing Random Forest model evaluation...")
    
    # Generate synthetic training data
    np.random.seed(42)
    n_samples = 200
    data = pd.DataFrame({
        'queue_length': np.abs(np.random.randn(n_samples) * 5 + 15),
        'vehicle_arrivals': np.abs(np.random.randn(n_samples) * 3 + 10),
        'time_of_day': np.random.rand(n_samples),
        'weather': np.random.randint(0, 2, n_samples)
    })
    
    # Create and train model
    model = RandomForestTrafficPredictor(
        n_estimators=50,
        max_depth=10,
        random_state=42
    )
    
    print("  Training Random Forest model...")
    training_results = model.train(
        data=data,
        target_column='queue_length',
        prediction_steps=5,
        validation_split=0.2,
        optimize_hyperparams=False
    )
    
    print(f"  Training RMSE: {training_results['training_rmse']:.4f}")
    print(f"  Validation RMSE: {training_results['validation_rmse']:.4f}")
    print(f"  R² Score: {training_results['validation_r2']:.4f}")
    
    # Evaluate on test data
    test_data = data.tail(50)
    eval_results = model.evaluate(test_data)
    
    print(f"  Test RMSE: {eval_results['rmse']:.4f}")
    print(f"  Test MAE: {eval_results['mae']:.4f}")
    print(f"  R² Score: {eval_results['r2_score']:.4f}")
    
    assert eval_results['rmse'] > 0, "RMSE should be positive"
    assert eval_results['mae'] > 0, "MAE should be positive"
    
    print("✓ Random Forest evaluation test passed\n")


def main():
    """Run all tests"""
    print("=" * 60)
    print("PREDICTION EVALUATION TESTS")
    print("=" * 60 + "\n")
    
    try:
        test_calculate_metrics()
        test_baseline_comparison()
        test_model_comparison()
        test_accuracy_report()
        test_temporal_performance()
        test_lstm_evaluation()
        test_random_forest_evaluation()
        
        print("=" * 60)
        print("ALL TESTS PASSED ✓")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
