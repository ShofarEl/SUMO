# Simulation API Documentation

This document describes the Backend Simulation API endpoints implemented for the Georgetown Traffic AI Management System.

## Overview

The Simulation API provides endpoints for creating, managing, and executing traffic simulations. It integrates with the Python AI service for running SUMO simulations and uses Bull queue for job management and Socket.io for real-time updates.

## Architecture

- **Backend (Node.js/Express)**: Handles API requests, authentication, and data persistence
- **Python AI Service**: Executes SUMO simulations and AI model operations
- **Bull Queue**: Manages asynchronous simulation jobs with Redis
- **Socket.io**: Provides real-time updates to connected clients
- **MongoDB**: Stores simulation configurations and results

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Create Simulation

**POST** `/api/simulations`

Creates a new simulation configuration.

**Access**: Researcher, Admin

**Request Body**:
```json
{
  "name": "Morning Peak Traffic Test",
  "description": "Testing DQN control during morning peak hours",
  "config": {
    "trafficDemand": "peak",
    "vehicleMix": {
      "cars": 55,
      "motorcycles": 25,
      "minibuses": 15,
      "trucks": 5
    },
    "duration": 3600,
    "timeOfDay": "morning_peak",
    "weather": "clear",
    "incidents": [],
    "controlStrategy": "dqn"
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Morning Peak Traffic Test",
    "description": "Testing DQN control during morning peak hours",
    "userId": "507f1f77bcf86cd799439012",
    "status": "pending",
    "config": { ... },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. List Simulations

**GET** `/api/simulations`

Retrieves a paginated list of simulations.

**Access**: All authenticated users (users see only their own simulations unless admin)

**Query Parameters**:
- `page` (number, default: 1): Page number
- `limit` (number, default: 10, max: 100): Items per page
- `status` (string, optional): Filter by status (pending, running, completed, failed)
- `controlStrategy` (string, optional): Filter by control strategy
- `sortBy` (string, default: createdAt): Sort field (createdAt, name, status)
- `sortOrder` (string, default: desc): Sort order (asc, desc)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Morning Peak Traffic Test",
      "status": "completed",
      "config": { ... },
      "userId": {
        "_id": "507f1f77bcf86cd799439012",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 3. Get Simulation by ID

**GET** `/api/simulations/:id`

Retrieves detailed information about a specific simulation.

**Access**: Owner or Admin

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Morning Peak Traffic Test",
    "description": "Testing DQN control during morning peak hours",
    "userId": {
      "_id": "507f1f77bcf86cd799439012",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "organization": "Georgetown University"
    },
    "status": "completed",
    "config": { ... },
    "results": {
      "avgDelay": 45.2,
      "avgQueueLength": 12.5,
      "throughput": 850,
      "fuelConsumption": 125.3,
      "co2Emissions": 320.5
    },
    "startTime": "2024-01-15T10:35:00.000Z",
    "endTime": "2024-01-15T11:35:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:35:00.000Z"
  }
}
```

### 4. Update Simulation

**PUT** `/api/simulations/:id`

Updates simulation name or description. Only allowed for pending or failed simulations.

**Access**: Owner or Admin

**Request Body**:
```json
{
  "name": "Updated Simulation Name",
  "description": "Updated description"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": { ... }
}
```

### 5. Delete Simulation

**DELETE** `/api/simulations/:id`

Deletes a simulation. Cannot delete running simulations.

**Access**: Owner or Admin

**Response** (200):
```json
{
  "success": true,
  "message": "Simulation deleted successfully"
}
```

### 6. Run Simulation

**POST** `/api/simulations/:id/run`

Queues a simulation for execution. The simulation is processed asynchronously by the Python AI service.

**Access**: Researcher, Admin (Owner or Admin)

**Response** (202):
```json
{
  "success": true,
  "message": "Simulation queued for execution",
  "data": {
    "simulationId": "507f1f77bcf86cd799439011",
    "jobId": "sim-507f1f77bcf86cd799439011",
    "status": "waiting"
  }
}
```

### 7. Get Simulation Status

**GET** `/api/simulations/:id/status`

Retrieves the current status of a simulation, including progress information if running.

**Access**: Owner or Admin

**Response** (200):
```json
{
  "success": true,
  "data": {
    "simulationId": "507f1f77bcf86cd799439011",
    "status": "running",
    "startTime": "2024-01-15T10:35:00.000Z",
    "endTime": null,
    "progress": 45,
    "currentStep": "Processing vehicle movements",
    "pythonServiceStatus": {
      "status": "running",
      "progress": 45,
      "current_step": "Processing vehicle movements"
    },
    "queueStatus": {
      "jobId": "sim-507f1f77bcf86cd799439011",
      "status": "active",
      "progress": 0
    }
  }
}
```

### 8. Get Simulation Results

**GET** `/api/simulations/:id/results`

Retrieves detailed results from a completed simulation.

**Access**: Owner or Admin

**Response** (200):
```json
{
  "success": true,
  "data": {
    "simulationId": "507f1f77bcf86cd799439011",
    "name": "Morning Peak Traffic Test",
    "description": "Testing DQN control during morning peak hours",
    "config": { ... },
    "status": "completed",
    "startTime": "2024-01-15T10:35:00.000Z",
    "endTime": "2024-01-15T11:35:00.000Z",
    "duration": 3600,
    "results": {
      "avgDelay": 45.2,
      "avgQueueLength": 12.5,
      "throughput": 850,
      "fuelConsumption": 125.3,
      "co2Emissions": 320.5,
      "predictionRMSE": 0.0245,
      "predictionMAE": 0.0189,
      "detailedMetrics": { ... }
    },
    "detailedResults": { ... },
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

## WebSocket Events

The API provides real-time updates via Socket.io WebSocket connections.

### Connection

Connect to the WebSocket server with authentication:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server Events

#### Subscribe to Simulation Updates
```javascript
socket.emit('subscribe_simulation', { simulationId: '507f1f77bcf86cd799439011' });
```

#### Unsubscribe from Simulation Updates
```javascript
socket.emit('unsubscribe_simulation', { simulationId: '507f1f77bcf86cd799439011' });
```

#### Subscribe to Training Updates
```javascript
socket.emit('subscribe_training', { agentId: '507f1f77bcf86cd799439013' });
```

#### Request Live Traffic Data
```javascript
socket.emit('request_live_traffic', { intersectionId: 'intersection-123' });
```

### Server → Client Events

#### Simulation Update
```javascript
socket.on('simulation_update', (data) => {
  console.log('Simulation update:', data);
  // {
  //   simulationId: '507f1f77bcf86cd799439011',
  //   status: 'running',
  //   progress: 45,
  //   currentStep: 'Processing vehicle movements',
  //   message: 'Simulation in progress',
  //   timestamp: '2024-01-15T10:40:00.000Z'
  // }
});
```

#### Training Update
```javascript
socket.on('training_update', (data) => {
  console.log('Training update:', data);
  // {
  //   agentId: '507f1f77bcf86cd799439013',
  //   episode: 150,
  //   reward: 245.3,
  //   loss: 0.0234,
  //   timestamp: '2024-01-15T10:40:00.000Z'
  // }
});
```

#### Traffic Update
```javascript
socket.on('traffic_update', (data) => {
  console.log('Traffic update:', data);
  // {
  //   intersectionId: 'intersection-123',
  //   queueLength: 15,
  //   throughput: 120,
  //   delay: 35.2,
  //   timestamp: '2024-01-15T10:40:00.000Z'
  // }
});
```

#### Error
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

#### Subscription Confirmation
```javascript
socket.on('subscribed', (data) => {
  console.log('Subscribed:', data);
});

socket.on('unsubscribed', (data) => {
  console.log('Unsubscribed:', data);
});
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `AUTH_REQUIRED` (401): Authentication token required
- `AUTH_INVALID` (401): Invalid or expired token
- `AUTH_INSUFFICIENT` (403): Insufficient permissions
- `SIMULATION_NOT_FOUND` (404): Simulation not found
- `INVALID_OPERATION` (400): Operation not allowed in current state
- `SERVICE_UNAVAILABLE` (503): Python AI service unavailable
- `INTERNAL_ERROR` (500): Unexpected server error

## Job Queue

Simulations are processed asynchronously using Bull queue with Redis:

- **Queue Name**: `simulation`
- **Job ID Format**: `sim-{simulationId}`
- **Retry Policy**: 3 attempts with exponential backoff (2s initial delay)
- **Job Retention**: Last 100 completed and failed jobs

## Integration with Python AI Service

The backend communicates with the Python AI service at `PYTHON_AI_SERVICE_URL` (default: http://localhost:8000):

- **POST** `/api/sumo/run` - Start simulation
- **GET** `/api/sumo/status/:jobId` - Get simulation status
- **GET** `/api/sumo/results/:jobId` - Get simulation results

## Environment Variables

Required environment variables:

```env
# Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:8000

# Redis (for Bull queue)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Testing

Example using curl:

```bash
# Create simulation
curl -X POST http://localhost:5000/api/simulations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Simulation",
    "config": {
      "trafficDemand": "peak",
      "duration": 3600,
      "timeOfDay": "morning_peak",
      "controlStrategy": "fixed"
    }
  }'

# Run simulation
curl -X POST http://localhost:5000/api/simulations/SIMULATION_ID/run \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get status
curl http://localhost:5000/api/simulations/SIMULATION_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get results
curl http://localhost:5000/api/simulations/SIMULATION_ID/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- Simulations can only be updated or deleted when in `pending` or `failed` status
- Running simulations cannot be modified or deleted
- Users can only access their own simulations unless they have admin role
- WebSocket connections require valid JWT authentication
- Simulation results are only available after completion
- The queue polls the Python service every second for status updates (max 10 minutes)
