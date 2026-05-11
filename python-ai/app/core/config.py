from pydantic_settings import BaseSettings
from typing import Optional

__all__ = ['Settings', 'settings', 'get_settings']


class Settings(BaseSettings):
    # Server Configuration
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    MONGODB_URI: str = "mongodb://localhost:27017/georgetown-traffic-ai"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "georgetown-traffic-ai"
    
    # Security
    API_KEY: Optional[str] = None
    INTER_SERVICE_SECRET: Optional[str] = None
    IP_WHITELIST: Optional[str] = None  # Comma-separated list of allowed IPs
    REQUEST_TIMEOUT: int = 300  # 5 minutes for long-running operations
    
    # SUMO Configuration
    SUMO_HOME: Optional[str] = None
    SUMO_BINARY: str = "sumo"
    SUMO_GUI_BINARY: str = "sumo-gui"
    
    # Model Configuration
    MODEL_STORAGE_PATH: str = "./models"
    CHECKPOINT_PATH: str = "./models/checkpoints"
    
    # Training Configuration
    DEVICE: str = "cpu"
    BATCH_SIZE: int = 32
    LEARNING_RATE: float = 0.001
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance"""
    return settings
