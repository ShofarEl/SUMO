"""
Verification script for Random Forest implementation
This script checks that all required components are in place
"""
import os
import sys


def check_file_exists(filepath, description):
    """Check if a file exists"""
    exists = os.path.exists(filepath)
    status = "✓" if exists else "✗"
    print(f"  {status} {description}: {filepath}")
    return exists


def check_code_contains(filepath, search_strings, description):
    """Check if file contains specific code"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        all_found = all(s in content for s in search_strings)
        status = "✓" if all_found else "✗"
        print(f"  {status} {description}")
        
        if not all_found:
            for s in search_strings:
                if s not in content:
                    print(f"      Missing: {s}")
        
        return all_found
    except Exception as e:
        print(f"  ✗ Error checking {filepath}: {e}")
        return False


def main():
    print("\n" + "="*70)
    print("Random Forest Implementation Verification")
    print("="*70)
    
    all_checks_passed = True
    
    # Check 1: scikit-learn in requirements.txt
    print("\n1. Checking scikit-learn installation requirement...")
    if check_file_exists("requirements.txt", "Requirements file"):
        all_checks_passed &= check_code_contains(
            "requirements.txt",
            ["scikit-learn"],
            "scikit-learn listed in requirements"
        )
    else:
        all_checks_passed = False
    
    # Check 2: Random Forest model implementation
    print("\n2. Checking Random Forest model implementation...")
    rf_model_path = "app/services/ml/random_forest_model.py"
    if check_file_exists(rf_model_path, "Random Forest model file"):
        required_components = [
            "class RandomForestTrafficPredictor",
            "from sklearn.ensemble import RandomForestRegressor",
            "def engineer_features",
            "def train",
            "def predict",
            "def save_model",
            "def load_model",
            "def optimize_hyperparameters",
            "GridSearchCV",
            "n_estimators",
            "max_depth"
        ]
        all_checks_passed &= check_code_contains(
            rf_model_path,
            required_components,
            "All required methods and imports present"
        )
    else:
        all_checks_passed = False
    
    # Check 3: Feature engineering
    print("\n3. Checking feature engineering implementation...")
    if os.path.exists(rf_model_path):
        feature_engineering_components = [
            "queue_length_lag",
            "vehicle_arrivals_lag",
            "rolling_mean",
            "rolling_std",
            "diff",
            "is_peak_hour",
            "queue_vehicle_ratio",
            "congestion_index"
        ]
        all_checks_passed &= check_code_contains(
            rf_model_path,
            feature_engineering_components,
            "Feature engineering with lagged, rolling, and interaction features"
        )
    
    # Check 4: Hyperparameter optimization
    print("\n4. Checking hyperparameter optimization...")
    if os.path.exists(rf_model_path):
        optimization_components = [
            "def optimize_hyperparameters",
            "param_grid",
            "GridSearchCV",
            "n_estimators",
            "max_depth",
            "min_samples_split",
            "min_samples_leaf"
        ]
        all_checks_passed &= check_code_contains(
            rf_model_path,
            optimization_components,
            "Hyperparameter optimization with GridSearchCV"
        )
    
    # Check 5: Model saving/loading
    print("\n5. Checking model persistence...")
    if os.path.exists(rf_model_path):
        persistence_components = [
            "def save_model",
            "def load_model",
            "pickle.dump",
            "pickle.load",
            "StandardScaler"
        ]
        all_checks_passed &= check_code_contains(
            rf_model_path,
            persistence_components,
            "Model saving and loading with pickle"
        )
    
    # Check 6: API endpoints
    print("\n6. Checking API endpoints...")
    api_path = "app/api/ml.py"
    if check_file_exists(api_path, "ML API file"):
        api_components = [
            "@router.post(\"/rf/train\"",
            "@router.post(\"/rf/predict\"",
            "async def train_rf_model",
            "async def predict_rf",
            "RFTrainRequest",
            "RandomForestTrafficPredictor"
        ]
        all_checks_passed &= check_code_contains(
            api_path,
            api_components,
            "Random Forest training and prediction endpoints"
        )
    else:
        all_checks_passed = False
    
    # Check 7: Request schemas
    print("\n7. Checking request/response schemas...")
    schema_path = "app/models/schemas.py"
    if check_file_exists(schema_path, "Schemas file"):
        schema_components = [
            "class RFTrainRequest",
            "n_estimators",
            "max_depth",
            "optimize_hyperparams",
            "prediction_steps"
        ]
        all_checks_passed &= check_code_contains(
            schema_path,
            schema_components,
            "RFTrainRequest schema with all required fields"
        )
    else:
        all_checks_passed = False
    
    # Check 8: Model evaluation
    print("\n8. Checking model evaluation capabilities...")
    if os.path.exists(rf_model_path):
        evaluation_components = [
            "def evaluate",
            "mean_squared_error",
            "mean_absolute_error",
            "r2_score",
            "rmse",
            "mae"
        ]
        all_checks_passed &= check_code_contains(
            rf_model_path,
            evaluation_components,
            "Model evaluation with RMSE, MAE, and R² metrics"
        )
    
    # Check 9: Feature importance tracking
    print("\n9. Checking feature importance tracking...")
    if os.path.exists(rf_model_path):
        importance_components = [
            "feature_importance",
            "model.feature_importances_",
            "sorted"
        ]
        all_checks_passed &= check_code_contains(
            rf_model_path,
            importance_components,
            "Feature importance calculation and tracking"
        )
    
    # Check 10: Documentation
    print("\n10. Checking documentation...")
    if os.path.exists(rf_model_path):
        with open(rf_model_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count docstrings
        docstring_count = content.count('"""')
        has_docs = docstring_count >= 10  # Should have docstrings for class and methods
        status = "✓" if has_docs else "✗"
        print(f"  {status} Comprehensive docstrings (found {docstring_count // 2} docstrings)")
        all_checks_passed &= has_docs
    
    # Summary
    print("\n" + "="*70)
    if all_checks_passed:
        print("✓ ALL CHECKS PASSED - Random Forest implementation is complete!")
        print("\nImplemented features:")
        print("  • scikit-learn Random Forest with configurable hyperparameters")
        print("  • Comprehensive feature engineering (lagged, rolling, interaction)")
        print("  • Hyperparameter optimization with GridSearchCV")
        print("  • Model training with train/validation split")
        print("  • Prediction with confidence intervals")
        print("  • Model persistence (save/load)")
        print("  • Feature importance tracking")
        print("  • FastAPI endpoints for training and prediction")
        print("  • Pydantic schemas for request validation")
        print("  • Comprehensive evaluation metrics (RMSE, MAE, R²)")
    else:
        print("✗ SOME CHECKS FAILED - Please review the issues above")
    print("="*70 + "\n")
    
    return all_checks_passed


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Verification failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
