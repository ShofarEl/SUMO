"""
Model Management Service
Handles model versioning, storage, and metadata tracking
"""
import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path
from app.core.logging import logger
from app.core.config import settings


class ModelManager:
    """Manages ML model storage, versioning, and metadata"""
    
    def __init__(self, storage_path: str = None):
        """
        Initialize Model Manager
        
        Args:
            storage_path: Base path for model storage
        """
        self.storage_path = storage_path or settings.MODEL_STORAGE_PATH
        self.metadata_file = os.path.join(self.storage_path, "model_registry.json")
        self._ensure_storage_structure()
        self._load_registry()
    
    def _ensure_storage_structure(self):
        """Create storage directory structure"""
        os.makedirs(self.storage_path, exist_ok=True)
        os.makedirs(os.path.join(self.storage_path, "lstm"), exist_ok=True)
        os.makedirs(os.path.join(self.storage_path, "random_forest"), exist_ok=True)
        os.makedirs(os.path.join(self.storage_path, "dqn"), exist_ok=True)
        os.makedirs(os.path.join(self.storage_path, "ppo"), exist_ok=True)
        os.makedirs(os.path.join(self.storage_path, "marl"), exist_ok=True)
        logger.info(f"Model storage initialized at {self.storage_path}")
    
    def _load_registry(self):
        """Load model registry from disk"""
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r') as f:
                    self.registry = json.load(f)
                logger.info(f"Loaded {len(self.registry)} models from registry")
            except Exception as e:
                logger.error(f"Failed to load registry: {e}")
                self.registry = {}
        else:
            self.registry = {}
    
    def _save_registry(self):
        """Save model registry to disk"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.registry, f, indent=2, default=str)
            logger.info("Model registry saved")
        except Exception as e:
            logger.error(f"Failed to save registry: {e}")
    
    def generate_version(self, model_name: str, model_type: str) -> str:
        """
        Generate version number for a model
        
        Args:
            model_name: Name of the model
            model_type: Type of model (lstm, random_forest, etc.)
            
        Returns:
            Version string (e.g., "v1.0.0")
        """
        # Find existing versions for this model
        existing_versions = []
        for model_id, metadata in self.registry.items():
            if metadata.get("name") == model_name and metadata.get("type") == model_type:
                version = metadata.get("version", "v1.0.0")
                existing_versions.append(version)
        
        if not existing_versions:
            return "v1.0.0"
        
        # Parse latest version and increment
        latest = sorted(existing_versions)[-1]
        try:
            major, minor, patch = latest.replace("v", "").split(".")
            patch = int(patch) + 1
            return f"v{major}.{minor}.{patch}"
        except:
            return "v1.0.0"
    
    def register_model(
        self,
        model_name: str,
        model_type: str,
        model_path: str,
        training_config: Dict,
        performance_metrics: Dict,
        trained_by: str = None,
        dataset_id: str = None
    ) -> str:
        """
        Register a trained model in the registry
        
        Args:
            model_name: Name of the model
            model_type: Type of model
            model_path: Path to saved model files
            training_config: Training configuration and hyperparameters
            performance_metrics: Performance metrics (RMSE, MAE, etc.)
            trained_by: User ID who trained the model
            dataset_id: ID of dataset used for training
            
        Returns:
            Model ID
        """
        # Generate version
        version = self.generate_version(model_name, model_type)
        
        # Generate unique model ID
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_id = f"{model_type}_{model_name}_{version}_{timestamp}"
        
        # Create metadata
        metadata = {
            "model_id": model_id,
            "name": model_name,
            "type": model_type,
            "version": version,
            "model_path": model_path,
            "training_config": training_config,
            "performance": performance_metrics,
            "trained_by": trained_by,
            "dataset_id": dataset_id,
            "created_at": datetime.now().isoformat(),
            "is_deployed": False,
            "deployment_history": []
        }
        
        # Register model
        self.registry[model_id] = metadata
        self._save_registry()
        
        logger.info(f"Registered model: {model_id} (version {version})")
        return model_id
    
    def get_model_metadata(self, model_id: str) -> Optional[Dict]:
        """
        Get metadata for a specific model
        
        Args:
            model_id: Model ID
            
        Returns:
            Model metadata or None if not found
        """
        return self.registry.get(model_id)
    
    def list_models(
        self,
        model_type: Optional[str] = None,
        model_name: Optional[str] = None,
        is_deployed: Optional[bool] = None
    ) -> List[Dict]:
        """
        List models with optional filtering
        
        Args:
            model_type: Filter by model type
            model_name: Filter by model name
            is_deployed: Filter by deployment status
            
        Returns:
            List of model metadata
        """
        models = []
        
        for model_id, metadata in self.registry.items():
            # Apply filters
            if model_type and metadata.get("type") != model_type:
                continue
            if model_name and metadata.get("name") != model_name:
                continue
            if is_deployed is not None and metadata.get("is_deployed") != is_deployed:
                continue
            
            models.append(metadata)
        
        # Sort by creation date (newest first)
        models.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return models
    
    def get_model_versions(self, model_name: str, model_type: str) -> List[Dict]:
        """
        Get all versions of a specific model
        
        Args:
            model_name: Name of the model
            model_type: Type of model
            
        Returns:
            List of model versions sorted by version number
        """
        versions = []
        
        for model_id, metadata in self.registry.items():
            if metadata.get("name") == model_name and metadata.get("type") == model_type:
                versions.append(metadata)
        
        # Sort by version
        versions.sort(key=lambda x: x.get("version", "v1.0.0"), reverse=True)
        
        return versions
    
    def deploy_model(self, model_id: str, deployed_by: str = None) -> bool:
        """
        Mark a model as deployed
        
        Args:
            model_id: Model ID to deploy
            deployed_by: User ID who deployed the model
            
        Returns:
            Success status
        """
        if model_id not in self.registry:
            logger.error(f"Model {model_id} not found")
            return False
        
        # Update deployment status
        self.registry[model_id]["is_deployed"] = True
        
        # Add to deployment history
        deployment_record = {
            "deployed_at": datetime.now().isoformat(),
            "deployed_by": deployed_by,
            "action": "deployed"
        }
        
        if "deployment_history" not in self.registry[model_id]:
            self.registry[model_id]["deployment_history"] = []
        
        self.registry[model_id]["deployment_history"].append(deployment_record)
        
        self._save_registry()
        logger.info(f"Model {model_id} deployed")
        
        return True
    
    def undeploy_model(self, model_id: str, undeployed_by: str = None) -> bool:
        """
        Mark a model as undeployed
        
        Args:
            model_id: Model ID to undeploy
            undeployed_by: User ID who undeployed the model
            
        Returns:
            Success status
        """
        if model_id not in self.registry:
            logger.error(f"Model {model_id} not found")
            return False
        
        # Update deployment status
        self.registry[model_id]["is_deployed"] = False
        
        # Add to deployment history
        deployment_record = {
            "undeployed_at": datetime.now().isoformat(),
            "undeployed_by": undeployed_by,
            "action": "undeployed"
        }
        
        if "deployment_history" not in self.registry[model_id]:
            self.registry[model_id]["deployment_history"] = []
        
        self.registry[model_id]["deployment_history"].append(deployment_record)
        
        self._save_registry()
        logger.info(f"Model {model_id} undeployed")
        
        return True
    
    def delete_model(self, model_id: str) -> bool:
        """
        Delete a model and its files
        
        Args:
            model_id: Model ID to delete
            
        Returns:
            Success status
        """
        if model_id not in self.registry:
            logger.error(f"Model {model_id} not found")
            return False
        
        metadata = self.registry[model_id]
        model_path = metadata.get("model_path")
        
        # Delete model files
        if model_path and os.path.exists(model_path):
            try:
                # Delete the model file and associated files
                base_path = os.path.dirname(model_path)
                model_name = os.path.basename(model_path).replace(".keras", "").replace(".pkl", "")
                
                # Remove all files with this model name
                for file in os.listdir(base_path):
                    if file.startswith(model_name):
                        file_path = os.path.join(base_path, file)
                        os.remove(file_path)
                        logger.info(f"Deleted file: {file_path}")
                
            except Exception as e:
                logger.error(f"Failed to delete model files: {e}")
                return False
        
        # Remove from registry
        del self.registry[model_id]
        self._save_registry()
        
        logger.info(f"Model {model_id} deleted")
        return True
    
    def update_performance_metrics(
        self,
        model_id: str,
        performance_metrics: Dict
    ) -> bool:
        """
        Update performance metrics for a model
        
        Args:
            model_id: Model ID
            performance_metrics: Updated performance metrics
            
        Returns:
            Success status
        """
        if model_id not in self.registry:
            logger.error(f"Model {model_id} not found")
            return False
        
        self.registry[model_id]["performance"].update(performance_metrics)
        self.registry[model_id]["last_updated"] = datetime.now().isoformat()
        
        self._save_registry()
        logger.info(f"Updated performance metrics for {model_id}")
        
        return True
    
    def compare_model_versions(
        self,
        model_name: str,
        model_type: str,
        metric: str = "rmse"
    ) -> List[Dict]:
        """
        Compare performance across model versions
        
        Args:
            model_name: Name of the model
            model_type: Type of model
            metric: Metric to compare (rmse, mae, r2_score)
            
        Returns:
            List of versions with comparison data
        """
        versions = self.get_model_versions(model_name, model_type)
        
        comparison = []
        for version_metadata in versions:
            performance = version_metadata.get("performance", {})
            comparison.append({
                "version": version_metadata.get("version"),
                "model_id": version_metadata.get("model_id"),
                "created_at": version_metadata.get("created_at"),
                "is_deployed": version_metadata.get("is_deployed"),
                metric: performance.get(metric),
                "all_metrics": performance
            })
        
        # Sort by metric (lower is better for rmse/mae, higher for r2)
        if metric in ["rmse", "mae"]:
            comparison.sort(key=lambda x: x.get(metric, float('inf')))
        else:
            comparison.sort(key=lambda x: x.get(metric, 0), reverse=True)
        
        return comparison
    
    def get_storage_stats(self) -> Dict:
        """
        Get storage statistics
        
        Returns:
            Storage statistics
        """
        total_models = len(self.registry)
        deployed_models = sum(1 for m in self.registry.values() if m.get("is_deployed"))
        
        # Count by type
        type_counts = {}
        for metadata in self.registry.values():
            model_type = metadata.get("type", "unknown")
            type_counts[model_type] = type_counts.get(model_type, 0) + 1
        
        # Calculate storage size
        total_size = 0
        for root, dirs, files in os.walk(self.storage_path):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.exists(file_path):
                    total_size += os.path.getsize(file_path)
        
        return {
            "total_models": total_models,
            "deployed_models": deployed_models,
            "models_by_type": type_counts,
            "storage_path": self.storage_path,
            "total_storage_bytes": total_size,
            "total_storage_mb": round(total_size / (1024 * 1024), 2)
        }


# Global model manager instance
model_manager = ModelManager()
