// Jest setup file for test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/georgetown-traffic-ai-test';
process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8000';
