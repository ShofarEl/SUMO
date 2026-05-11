"""
Quick test script to verify the FastAPI service is working
"""
import sys
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert data["version"] == "1.0.0"
    print("✓ Root endpoint working")

def test_health():
    """Test health check endpoint"""
    response = client.get("/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "environment" in data
    print("✓ Health check endpoint working")

def test_detailed_health():
    """Test detailed health check endpoint"""
    response = client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "services" in data
    print("✓ Detailed health check endpoint working")

def test_api_endpoints():
    """Test API endpoint info"""
    endpoints = [
        ("/api/sumo/", "SUMO Simulation"),
        ("/api/ml/", "Machine Learning Prediction"),
        ("/api/rl/", "Reinforcement Learning"),
        ("/api/data/", "Data Processing")
    ]
    
    for endpoint, service_name in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        print(f"✓ {service_name} endpoint working")

if __name__ == "__main__":
    try:
        print("Testing FastAPI service...")
        print()
        test_root()
        test_health()
        test_detailed_health()
        test_api_endpoints()
        print()
        print("All tests passed! ✓")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
