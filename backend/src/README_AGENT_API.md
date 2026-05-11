# RL Agent Management API

This document describes the backend API endpoints for managing Reinforcement Learning (RL) agents in the Georgetown Traffic AI system.

## Overview

The RL Agent Management API provides endpoints for creating, training, deploying, and evaluating reinforcement learning agents for traffic signal control. It supports both single-agent (DQN) and multi-agent (MARL) systems.

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Create RL Agent

**POST** `/api/agents`

Create a new RL agent for traffic signal control.

**Access:** Researcher, Admin

**Request Body:**
```json
{
  "name": "DQN Agent - Vlissengen Road",
  "algorithm": "dqn",
  "intersectionIds": ["intersection_001"],
  "isMultiAgent": false,
  "config": {
    "stateSpace": {
      "size": 13
    },
    "actionSpace": {
      "size": 4
    },
    "hyperparameters": {
      "learningRate": 0.001,
      "gamma": 0.99,
      "epsilonStart": 1.0,
      "epsilonEnd": 0.01,
      "epsilonDecay": 0.995,
      "batchSize": 64,
      "replayBufferSize": 10000,
      "targetUpdateFrequency": 100,
      "hiddenSize": 128
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "agent_id",
    "name": "DQN Agent - Vlissengen Road",
    "algorithm": "dqn",
    "intersectionIds": ["intersection_001"],
    "isMultiAgent": false,
    "trainedBy": "user_id",
    "trainingStatus": "not_started",
    "config": { ... },
    "policyPath": "python_service_agent_id",
    "createdAt": "2026-05-08T10:00:00.000Z"
  }
}
```

### 2. List RL Agents

**GET** `/api/agents`

Get a paginated list of RL agents with optional filtering.

**Access:** All authenticated users (users see only their own agents unless admin)

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 100) - Items per page
- `algorithm` (string) - Filter by algorithm: dqn, ppo, a3c
- `trainingStatus` (string) - Filter by status: not_started, training, completed, failed
- `isDeployed` (boolean) - Filter by deployment status
- `sortBy` (string, default: createdAt) - Sort field: createdAt, name, trainingStatus, algorithm
- `sortOrder` (string, default: desc) - Sort order: asc, desc

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "agent_id",
      "name": "DQN Agent - Vlissengen Road",
      "algorithm": "dqn",
      "trainingStatus": "completed",
      "isDeployed": true,
      "trainedBy": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-05-08T10:00:00.000Z"
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

### 3. Get Agent by ID

**GET** `/api/agents/:id`

Get detailed information about a specific RL agent.

**Access:** Owner or Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "agent_id",
    "name": "DQN Agent - Vlissengen Road",
    "algorithm": "dqn",
    "intersectionIds": ["intersection_001"],
    "isMultiAgent": false,
    "trainedBy": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "organization": "University of Guyana"
    },
    "trainingStatus": "completed",
    "trainingProgress": {
      "currentEpisode": 100,
      "totalEpisodes": 100,
      "currentReward": 150.5,
      "bestReward": 180.2,
      "avgDelay": 35.2,
      "convergenceMetric": 0.95
    },
    "config": { ... },
    "performance": {
      "delayReduction": 28.5,
      "queueReduction": 25.3,
      "throughputIncrease": 18.7,
      "fuelSavings": 24.1,
      "emissionsReduction": 24.1
    },
    "policyPath": "python_service_agent_id",
    "isDeployed": true,
    "createdAt": "2026-05-08T10:00:00.000Z",
    "updatedAt": "2026-05-08T12:00:00.000Z"
  }
}
```

### 4. Update Agent

**PUT** `/api/agents/:id`

Update agent metadata (name, deployment status).

**Access:** Owner or Admin

**Request Body:**
```json
{
  "name": "Updated Agent Name",
  "isDeployed": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### 5. Delete Agent

**DELETE** `/api/agents/:id`

Delete an RL agent. Cannot delete agents that are currently training.

**Access:** Owner or Admin

**Response:**
```json
{
  "success": true,
  "message": "RL agent deleted successfully"
}
```

### 6. Train Agent

**POST** `/api/agents/:id/train`

Start training an RL agent. Training runs asynchronously in the background.

**Access:** Researcher, Admin (owner or admin)

**Request Body:**
```json
{
  "networkFile": "/path/to/georgetown.net.xml",
  "routeFile": "/path/to/georgetown.rou.xml",
  "numEpisodes": 100,
  "maxStepsPerEpisode": 3600,
  "evaluationFrequency": 50,
  "saveFrequency": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Training started",
  "data": {
    "agentId": "agent_id",
    "jobId": "training_job_id",
    "status": "pending"
  }
}
```

### 7. Get Training Status

**GET** `/api/agents/:id/training-status`

Get the current training status and progress for an agent.

**Access:** Owner or Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_id",
    "name": "DQN Agent - Vlissengen Road",
    "algorithm": "dqn",
    "trainingStatus": "training",
    "trainingProgress": {
      "currentEpisode": 45,
      "totalEpisodes": 100,
      "currentReward": 120.5,
      "bestReward": 150.2,
      "avgDelay": 42.3,
      "convergenceMetric": 0.75
    },
    "isMultiAgent": false,
    "pythonServiceStatus": {
      "job_id": "training_job_id",
      "status": "running",
      "current_episode": 45,
      "total_episodes": 100,
      "latest_metrics": {
        "episode": 45,
        "total_reward": 120.5,
        "average_queue": 8.5,
        "average_delay": 42.3,
        "epsilon": 0.35
      }
    },
    "latestMetrics": { ... }
  }
}
```

### 8. Deploy Agent

**POST** `/api/agents/:id/deploy`

Mark an agent as deployed for production use. Agent must have completed training.

**Access:** Researcher, Admin (owner or admin)

**Response:**
```json
{
  "success": true,
  "message": "Agent deployed successfully",
  "data": {
    "agentId": "agent_id",
    "name": "DQN Agent - Vlissengen Road",
    "isDeployed": true,
    "algorithm": "dqn",
    "intersectionIds": ["intersection_001"]
  }
}
```

### 9. Get Agent Performance

**GET** `/api/agents/:id/performance`

Get performance metrics for a trained agent. Optionally run fresh evaluation.

**Access:** Owner or Admin

**Query Parameters (optional for fresh evaluation):**
- `networkFile` (string) - SUMO network file path
- `routeFile` (string) - SUMO route file path
- `numEpisodes` (number, default: 10) - Number of evaluation episodes

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_id",
    "name": "DQN Agent - Vlissengen Road",
    "algorithm": "dqn",
    "isMultiAgent": false,
    "intersectionIds": ["intersection_001"],
    "trainingStatus": "completed",
    "performance": {
      "delayReduction": 28.5,
      "queueReduction": 25.3,
      "throughputIncrease": 18.7,
      "fuelSavings": 24.1,
      "emissionsReduction": 24.1
    },
    "trainingProgress": { ... },
    "evaluationResults": {
      "average_delay": 35.2,
      "average_queue_length": 8.5,
      "throughput": 1250,
      "delay_reduction": 28.5,
      "queue_reduction": 25.3,
      "throughput_increase": 18.7
    },
    "policyInfo": {
      "policyPath": "/path/to/model.pt",
      "trainingHistory": [ ... ],
      "convergenceMetrics": { ... }
    }
  }
}
```

## WebSocket Events

The API supports real-time training progress updates via WebSocket.

### Subscribe to Training Updates

**Client → Server:**
```json
{
  "event": "subscribe_training",
  "data": {
    "agentId": "agent_id"
  }
}
```

**Server → Client (training updates):**
```json
{
  "event": "training_update",
  "data": {
    "agentId": "agent_id",
    "timestamp": "2026-05-08T10:30:00.000Z",
    "episode": 45,
    "reward": 120.5,
    "loss": 0.025,
    "metrics": {
      "average_delay": 42.3,
      "average_queue": 8.5,
      "epsilon": 0.35
    }
  }
}
```

### Unsubscribe from Training Updates

**Client → Server:**
```json
{
  "event": "unsubscribe_training",
  "data": {
    "agentId": "agent_id"
  }
}
```

## Multi-Agent (MARL) Support

For multi-agent systems, set `isMultiAgent: true` and provide multiple intersection IDs:

```json
{
  "name": "MARL System - Georgetown Network",
  "algorithm": "dqn",
  "intersectionIds": ["int_001", "int_002", "int_003"],
  "isMultiAgent": true,
  "config": {
    "hyperparameters": {
      "enableCommunication": true,
      "communicationRadius": 500.0,
      "sharedReward": true,
      "rewardWeights": {
        "local": 0.7,
        "global": 0.3
      },
      "learningRate": 0.001,
      "enableExperienceSharing": true
    }
  }
}
```

MARL systems return coordination metrics in training status and performance endpoints:

```json
{
  "coordinationMetrics": {
    "synchronization_score": 0.85,
    "communication_efficiency": 0.78,
    "global_vs_local_ratio": 1.15
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ ... ],
    "timestamp": "2026-05-08T10:00:00.000Z"
  }
}
```

### Common Error Codes

- `AGENT_NOT_FOUND` - Agent ID not found
- `AUTH_INSUFFICIENT` - User lacks permission
- `VALIDATION_ERROR` - Request validation failed
- `INVALID_OPERATION` - Operation not allowed in current state
- `SERVICE_UNAVAILABLE` - Python AI service unavailable

## Integration with Python AI Service

The backend proxies requests to the Python AI service for:
- Agent creation (DQN/MARL)
- Training execution
- Training status polling
- Agent evaluation
- Policy retrieval

The Python service manages the actual RL algorithms, SUMO integration, and model storage.

## Requirements Addressed

This implementation addresses the following requirements from the spec:

- **Requirement 5.1**: Agent creation with configurable hyperparameters
- **Requirement 5.2**: Asynchronous training with progress tracking
- **Requirement 5.3**: Real-time training metrics via WebSocket
- **Requirement 5.4**: Agent deployment management
- **Requirement 5.5**: Performance evaluation and metrics
- **Requirement 13.1**: Model versioning and metadata tracking

## Related Documentation

- [Python RL API Documentation](../../python-ai/app/services/rl/README_DQN.md)
- [MARL Documentation](../../python-ai/app/services/rl/README_MARL.md)
- [WebSocket Service](./services/websocket.service.js)
- [Authentication Middleware](./middleware/auth.js)
