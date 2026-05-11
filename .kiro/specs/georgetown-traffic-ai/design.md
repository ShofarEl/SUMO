# Design Document

## Overview

The Georgetown Traffic AI Management System is a full-stack web application that combines a MERN stack frontend/backend with a Python-based AI microservice to evaluate artificial intelligence techniques for urban traffic management. The system architecture follows a microservices pattern where the Node.js backend handles user management, data persistence, and API orchestration, while a separate Python service manages computationally intensive AI operations including SUMO traffic simulation, machine learning prediction, and reinforcement learning-based signal control.

The platform serves three primary user groups: researchers who conduct experiments and analyze results, policymakers who assess feasibility and review recommendations, and administrators who manage system configuration and data. The design prioritizes academic rigor, reproducibility, and clear communication of both capabilities and limitations of AI-based traffic management in resource-constrained urban environments.

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React.js Frontend (Port 3000)                │  │
│  │  - Dashboard  - Map View  - Simulation Control           │  │
│  │  - Analytics  - Reports   - Admin Panel                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Node.js/Express Backend (Port 5000)             │  │
│  │  - Authentication  - User Management  - API Gateway      │  │
│  │  - Data Validation - WebSocket Server - Job Queue       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│    Data Layer            │  │    AI Service Layer          │
│  ┌────────────────────┐  │  │  ┌────────────────────────┐ │
│  │  MongoDB           │  │  │  │  Python/FastAPI        │ │
│  │  (Port 27017)      │  │  │  │  (Port 8000)           │ │
│  │                    │  │  │  │                        │ │
│  │  - Users           │  │  │  │  - SUMO Engine         │ │
│  │  - Simulations     │  │  │  │  - LSTM Models         │ │
│  │  - Traffic Data    │  │  │  │  - Random Forest       │ │
│  │  - Models          │  │  │  │  - DQN Agents          │ │
│  │  - Results         │  │  │  │  - Training Pipeline   │ │
│  └────────────────────┘  │  │  └────────────────────────┘ │
└──────────────────────────┘  └──────────────────────────────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │  External Data Sources   │
                              │  - OpenStreetMap         │
                              │  - Google Maps API       │
                              │  - Traffic Datasets      │
                              └──────────────────────────┘
```

### Technology Stack

**Frontend:**
- React.js 18+ with functional components and hooks
- React Router for navigation
- Recharts or Chart.js for data visualization
- Leaflet.js for interactive maps
- Socket.io-client for real-time updates
- Axios for HTTP requests
- TailwindCSS or Material-UI for styling

**Backend (Node.js):**
- Express.js 4+ for REST API
- MongoDB with Mongoose ODM
- JWT for authentication
- Socket.io for WebSocket communication
- Bull for job queue management
- Winston for logging
- Joi for request validation

**AI Service (Python):**
- FastAPI for REST API
- SUMO (Simulation of Urban Mobility) 1.15+
- PyTorch 2.0+ for deep learning
- scikit-learn for Random Forest
- TensorFlow/Keras for LSTM
- NumPy, Pandas for data processing
- OSMnx for OpenStreetMap integration
- Celery for async task management (optional)

**Database:**
- MongoDB 6+ for primary data storage
- Redis for caching and session management (optional)

**Deployment:**
- Docker containers for each service
- Docker Compose for local development
- Nginx as reverse proxy
- PM2 for Node.js process management

## Components and Interfaces

### Frontend Components

#### 1. Authentication Module
- **LoginPage**: User login with email/password
- **RegisterPage**: New user registration (admin-approved)
- **ProtectedRoute**: HOC for route protection based on roles
- **AuthContext**: React context for global auth state

#### 2. Dashboard Module
- **DashboardLayout**: Main layout with sidebar navigation
- **MetricsOverview**: Key performance indicators display
  - Average delay per vehicle
  - Queue length statistics
  - Throughput metrics
  - Prediction accuracy (RMSE/MAE)
  - CO2 emissions estimates
- **RecentSimulations**: List of recent simulation runs
- **QuickActions**: Buttons for common operations

#### 3. Map Visualization Module
- **GeorgetownMap**: Interactive map component using Leaflet
  - Road network overlay from OSM
  - Intersection markers with click handlers
  - Traffic density heatmap layer
  - Vehicle position markers (real-time)
- **IntersectionDetail**: Modal showing intersection-specific data
  - Signal phase timing
  - Queue length visualization
  - Historical performance charts
- **MapControls**: Layer toggles and zoom controls

#### 4. Simulation Control Module
- **SimulationConfig**: Form for simulation parameters
  - Traffic demand level (peak/off-peak)
  - Vehicle mix percentages
  - Weather conditions
  - Incident scenarios
  - Control strategy selection
- **SimulationRunner**: Real-time simulation monitoring
  - Start/pause/stop controls
  - Progress indicator
  - Live metrics display
  - WebSocket connection for updates
- **SimulationHistory**: List of past simulations with filters

#### 5. Prediction Module
- **PredictionInput**: Form for traffic state input
  - Historical queue lengths
  - Vehicle arrival rates
  - Time of day
  - Weather conditions
- **PredictionResults**: Display predicted traffic conditions
  - LSTM predictions with confidence intervals
  - Random Forest predictions
  - Comparison with baseline
  - Visualization of predicted vs actual

#### 6. Signal Control Module
- **RLAgentConfig**: Configuration for RL training
  - Hyperparameter settings
  - Reward function design
  - Training duration
  - Network architecture
- **TrainingMonitor**: Real-time training progress
  - Episode rewards chart
  - Loss curves
  - Convergence metrics
  - Agent behavior visualization
- **ControlComparison**: Side-by-side comparison
  - Fixed timing vs adaptive control
  - Performance metrics comparison
  - Signal timing visualizations

#### 7. Analytics Module
- **ScenarioComparison**: Compare multiple scenarios
  - Scenario configuration table
  - Performance metrics comparison
  - Statistical significance tests
  - Export comparison report
- **PerformanceCharts**: Detailed visualizations
  - Time-series delay charts
  - Queue length distributions
  - Throughput comparisons
  - Emissions analysis
- **DataExport**: Export functionality
  - CSV data export
  - PDF report generation
  - Chart image downloads

#### 8. Research Documentation Module
- **MethodologyPage**: Research methodology documentation
- **LiteratureReview**: Summarized literature with references
- **ResultsPage**: Published research findings
- **FeasibilityAssessment**: Georgetown readiness analysis
- **ReferencesPage**: Bibliography with DOI links

#### 9. Admin Module
- **UserManagement**: CRUD operations for users
- **DatasetUpload**: Upload traffic datasets
- **ModelManagement**: View and manage trained models
- **SystemConfig**: System-wide configuration settings
- **LogsViewer**: System logs and error tracking

### Backend API Endpoints

#### Authentication Endpoints
```
POST   /api/auth/register        - Register new user
POST   /api/auth/login           - User login
POST   /api/auth/logout          - User logout
GET    /api/auth/me              - Get current user
POST   /api/auth/refresh-token   - Refresh JWT token
```

#### User Management Endpoints
```
GET    /api/users                - List all users (admin)
GET    /api/users/:id            - Get user by ID
PUT    /api/users/:id            - Update user
DELETE /api/users/:id            - Delete user (admin)
PATCH  /api/users/:id/role       - Update user role (admin)
```

#### Simulation Endpoints
```
POST   /api/simulations          - Create new simulation
GET    /api/simulations          - List simulations (paginated)
GET    /api/simulations/:id      - Get simulation details
DELETE /api/simulations/:id      - Delete simulation
POST   /api/simulations/:id/run  - Execute simulation
GET    /api/simulations/:id/status - Get simulation status
GET    /api/simulations/:id/results - Get simulation results
```

#### Prediction Endpoints
```
POST   /api/predictions/lstm     - Get LSTM prediction
POST   /api/predictions/rf       - Get Random Forest prediction
POST   /api/predictions/compare  - Compare prediction models
GET    /api/predictions/history  - Get prediction history
```

#### RL Agent Endpoints
```
POST   /api/agents               - Create new RL agent
GET    /api/agents               - List RL agents
GET    /api/agents/:id           - Get agent details
POST   /api/agents/:id/train     - Start training
GET    /api/agents/:id/training-status - Get training progress
POST   /api/agents/:id/deploy    - Deploy trained agent
GET    /api/agents/:id/performance - Get agent performance metrics
```

#### Traffic Data Endpoints
```
POST   /api/traffic-data         - Upload traffic dataset
GET    /api/traffic-data         - List datasets
GET    /api/traffic-data/:id     - Get dataset details
DELETE /api/traffic-data/:id     - Delete dataset
GET    /api/traffic-data/:id/validate - Validate dataset
```

#### Map Data Endpoints
```
GET    /api/map/network          - Get Georgetown road network
GET    /api/map/intersections    - Get intersection list
GET    /api/map/intersections/:id - Get intersection details
GET    /api/map/traffic-density  - Get current traffic density
```

#### Analytics Endpoints
```
GET    /api/analytics/metrics    - Get performance metrics
POST   /api/analytics/compare    - Compare scenarios
GET    /api/analytics/export     - Export analytics data
GET    /api/analytics/feasibility - Get feasibility assessment
```

#### Report Endpoints
```
POST   /api/reports/generate     - Generate report
GET    /api/reports              - List generated reports
GET    /api/reports/:id          - Download report
DELETE /api/reports/:id          - Delete report
```

### Python AI Service API

#### SUMO Simulation Endpoints
```
POST   /api/sumo/initialize      - Initialize SUMO with OSM data
POST   /api/sumo/configure       - Configure simulation parameters
POST   /api/sumo/run             - Run simulation
GET    /api/sumo/status/:job_id  - Get simulation status
GET    /api/sumo/results/:job_id - Get simulation results
POST   /api/sumo/validate        - Validate against Google Maps
```

#### ML Prediction Endpoints
```
POST   /api/ml/lstm/train        - Train LSTM model
POST   /api/ml/lstm/predict      - Get LSTM prediction
POST   /api/ml/rf/train          - Train Random Forest
POST   /api/ml/rf/predict        - Get RF prediction
GET    /api/ml/models            - List trained models
GET    /api/ml/models/:id        - Get model details
```

#### RL Agent Endpoints
```
POST   /api/rl/dqn/create        - Create DQN agent
POST   /api/rl/dqn/train         - Train DQN agent
POST   /api/rl/dqn/evaluate      - Evaluate agent
POST   /api/rl/marl/create       - Create multi-agent system
POST   /api/rl/marl/train        - Train MARL system
GET    /api/rl/agents/:id/policy - Get learned policy
```

#### Data Processing Endpoints
```
POST   /api/data/osm/import      - Import OSM data
POST   /api/data/preprocess      - Preprocess traffic data
POST   /api/data/augment         - Augment training data
GET    /api/data/statistics      - Get data statistics
```

### WebSocket Events

#### Client → Server Events
```
connect                       - Client connects
disconnect                    - Client disconnects
subscribe_simulation          - Subscribe to simulation updates
unsubscribe_simulation        - Unsubscribe from simulation
subscribe_training            - Subscribe to training updates
request_live_traffic          - Request live traffic data
```

#### Server → Client Events
```
simulation_update             - Simulation state update
  - timestamp
  - vehicle_positions
  - signal_states
  - queue_lengths
  - current_metrics

training_update               - RL training progress
  - episode
  - reward
  - loss
  - metrics

traffic_update                - Live traffic data
  - intersection_id
  - queue_length
  - throughput
  - delay

error                         - Error notification
```

## Data Models

### User Model
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  role: String (enum: ['admin', 'researcher', 'viewer'], default: 'viewer'),
  organization: String,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  isActive: Boolean (default: true)
}
```

### Simulation Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  userId: ObjectId (ref: 'User'),
  status: String (enum: ['pending', 'running', 'completed', 'failed']),
  config: {
    trafficDemand: String (enum: ['low', 'medium', 'high', 'peak']),
    vehicleMix: {
      cars: Number (0-100),
      motorcycles: Number (0-100),
      minibuses: Number (0-100),
      trucks: Number (0-100)
    },
    duration: Number (seconds),
    timeOfDay: String (enum: ['morning_peak', 'off_peak', 'evening_peak']),
    weather: String (enum: ['clear', 'rain', 'flood']),
    incidents: [{
      type: String,
      location: String,
      startTime: Number,
      duration: Number
    }],
    controlStrategy: String (enum: ['fixed', 'lstm', 'rf', 'dqn', 'ppo', 'marl'])
  },
  results: {
    avgDelay: Number (seconds),
    avgQueueLength: Number (meters),
    throughput: Number (vehicles/hour),
    fuelConsumption: Number (liters),
    co2Emissions: Number (kg),
    predictionRMSE: Number,
    predictionMAE: Number,
    detailedMetrics: Object
  },
  jobId: String (Python service job ID),
  startTime: Date,
  endTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### TrafficData Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  source: String (enum: ['osm', 'google_maps', 'sris', 'gps', 'resolv', 'manual']),
  dataType: String (enum: ['network', 'demand', 'sensor', 'validation']),
  uploadedBy: ObjectId (ref: 'User'),
  fileUrl: String,
  metadata: {
    recordCount: Number,
    startDate: Date,
    endDate: Date,
    coverage: String,
    quality: Number (0-100)
  },
  validation: {
    isValidated: Boolean,
    validationDate: Date,
    validationMethod: String,
    deviationPercent: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### MLModel Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  type: String (enum: ['lstm', 'random_forest', 'dqn', 'ppo', 'marl']),
  version: String,
  trainedBy: ObjectId (ref: 'User'),
  trainingConfig: {
    hyperparameters: Object,
    datasetId: ObjectId (ref: 'TrafficData'),
    epochs: Number,
    batchSize: Number,
    learningRate: Number,
    architecture: Object
  },
  performance: {
    rmse: Number,
    mae: Number,
    r2Score: Number,
    trainingLoss: [Number],
    validationLoss: [Number],
    convergenceEpoch: Number
  },
  modelPath: String (file path in Python service),
  isDeployed: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### RLAgent Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  algorithm: String (enum: ['dqn', 'ppo', 'a3c']),
  intersectionIds: [String],
  isMultiAgent: Boolean,
  trainedBy: ObjectId (ref: 'User'),
  trainingStatus: String (enum: ['not_started', 'training', 'completed', 'failed']),
  trainingProgress: {
    currentEpisode: Number,
    totalEpisodes: Number,
    currentReward: Number,
    bestReward: Number,
    avgDelay: Number,
    convergenceMetric: Number
  },
  config: {
    stateSpace: Object,
    actionSpace: Object,
    rewardFunction: String,
    networkArchitecture: Object,
    hyperparameters: Object
  },
  performance: {
    delayReduction: Number (percentage),
    queueReduction: Number (percentage),
    throughputIncrease: Number (percentage),
    fuelSavings: Number (percentage),
    emissionsReduction: Number (percentage)
  },
  policyPath: String,
  isDeployed: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Intersection Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  osmId: String,
  location: {
    type: String (default: 'Point'),
    coordinates: [Number] (longitude, latitude)
  },
  roads: [{
    name: String,
    direction: String,
    lanes: Number
  }],
  signalConfig: {
    cycleLength: Number (seconds),
    phases: [{
      name: String,
      duration: Number,
      greenDirections: [String]
    }]
  },
  isCongestionHotspot: Boolean,
  historicalData: {
    avgDailyVolume: Number,
    peakHourVolume: Number,
    avgDelay: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Report Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  type: String (enum: ['simulation', 'comparison', 'feasibility', 'full_research']),
  generatedBy: ObjectId (ref: 'User'),
  simulationIds: [ObjectId] (ref: 'Simulation'),
  content: {
    executiveSummary: String,
    methodology: String,
    results: Object,
    conclusions: String,
    recommendations: [String]
  },
  format: String (enum: ['pdf', 'html', 'latex']),
  fileUrl: String,
  createdAt: Date
}
```

## Error Handling

### Error Response Format
All API errors follow a consistent format:
```javascript
{
  success: false,
  error: {
    code: String,        // Error code (e.g., 'VALIDATION_ERROR', 'AUTH_FAILED')
    message: String,     // Human-readable error message
    details: Object,     // Additional error details (optional)
    timestamp: Date
  }
}
```

### Error Categories

**Authentication Errors (401)**
- `AUTH_REQUIRED`: No authentication token provided
- `AUTH_INVALID`: Invalid or expired token
- `AUTH_INSUFFICIENT`: Insufficient permissions for operation

**Validation Errors (400)**
- `VALIDATION_ERROR`: Request validation failed
- `INVALID_PARAMETERS`: Invalid parameter values
- `MISSING_REQUIRED`: Required fields missing

**Resource Errors (404)**
- `NOT_FOUND`: Requested resource not found
- `SIMULATION_NOT_FOUND`: Simulation ID not found
- `MODEL_NOT_FOUND`: Model ID not found

**Simulation Errors (500)**
- `SIMULATION_FAILED`: SUMO simulation execution failed
- `TRAINING_FAILED`: Model training failed
- `PREDICTION_FAILED`: Prediction generation failed

**System Errors (500)**
- `INTERNAL_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: Python AI service unavailable
- `DATABASE_ERROR`: Database operation failed

### Error Handling Strategy

**Frontend:**
- Global error boundary for React component errors
- Axios interceptors for API error handling
- Toast notifications for user-facing errors
- Error logging to console in development
- Sentry integration for production error tracking

**Backend:**
- Express error middleware for centralized handling
- Try-catch blocks in async route handlers
- Validation middleware using Joi
- Winston logger for error logging
- Graceful degradation for non-critical failures

**Python Service:**
- FastAPI exception handlers
- Pydantic validation for request/response
- Detailed error messages for debugging
- Retry logic for transient failures
- Circuit breaker for external API calls

## Testing Strategy

### Unit Testing

**Frontend (Jest + React Testing Library):**
- Component rendering tests
- User interaction tests
- State management tests
- Utility function tests
- Target coverage: 80%+

**Backend (Jest + Supertest):**
- API endpoint tests
- Middleware tests
- Database model tests
- Authentication/authorization tests
- Target coverage: 85%+

**Python Service (pytest):**
- SUMO integration tests
- ML model training tests
- Prediction accuracy tests
- RL agent behavior tests
- Data processing tests
- Target coverage: 80%+

### Integration Testing

**API Integration:**
- End-to-end API flow tests
- Node.js ↔ Python service communication
- Database integration tests
- WebSocket connection tests

**Simulation Integration:**
- Complete simulation workflow tests
- OSM data import and processing
- Model training and deployment
- Result generation and storage

### Performance Testing

**Load Testing (Artillery or k6):**
- Concurrent user simulation (50+ users)
- API endpoint response time benchmarks
- Database query performance
- WebSocket connection limits

**Simulation Performance:**
- Large-scale simulation benchmarks
- Model inference latency tests
- Training time measurements
- Memory usage profiling

### Validation Testing

**Data Validation:**
- OSM network accuracy verification
- Vehicle mix validation against Guyana statistics
- Travel time comparison with Google Maps
- Prediction accuracy validation

**Model Validation:**
- LSTM RMSE/MAE targets (< 0.0263 / < 0.02)
- Random Forest RMSE/MAE targets (< 0.0352 / < 0.025)
- DQN delay reduction targets (25-34%)
- Throughput improvement validation (15-25%)

### User Acceptance Testing

**Researcher Workflows:**
- Complete simulation creation and execution
- Model training and evaluation
- Result analysis and export
- Report generation

**Policymaker Workflows:**
- Feasibility assessment review
- Scenario comparison analysis
- Recommendation review

**Admin Workflows:**
- User management operations
- Dataset upload and validation
- System configuration

## Security Considerations

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt (10+ rounds)
- Session management with secure cookies
- Rate limiting on authentication endpoints

### Data Security
- Input validation and sanitization
- SQL/NoSQL injection prevention
- XSS protection with Content Security Policy
- CORS configuration for allowed origins
- Encrypted data transmission (HTTPS only)

### API Security
- API key authentication for Python service
- Request signing for inter-service communication
- Rate limiting per user/IP
- Request size limits
- Timeout configurations

### Infrastructure Security
- Environment variables for secrets
- Docker container isolation
- Network segmentation
- Regular dependency updates
- Security headers (Helmet.js)

## Deployment Architecture

### Development Environment
```
Docker Compose Setup:
- frontend: React dev server (port 3000)
- backend: Node.js with nodemon (port 5000)
- python-ai: FastAPI with uvicorn reload (port 8000)
- mongodb: MongoDB container (port 27017)
- redis: Redis container (port 6379) [optional]
```

### Production Environment
```
Containerized Deployment:
- Nginx reverse proxy (port 80/443)
  ├─> Frontend static files
  ├─> Backend API (/api/*)
  └─> Python AI service (/ai/*)
- Node.js cluster (PM2)
- Python workers (Gunicorn + Uvicorn)
- MongoDB replica set
- Redis cluster [optional]
```

### Scaling Strategy
- Horizontal scaling of Python AI workers for parallel simulations
- Load balancing across Node.js instances
- MongoDB sharding for large datasets
- CDN for static assets
- Caching layer with Redis for frequent queries

## Monitoring and Logging

### Application Monitoring
- Winston for structured logging (Node.js)
- Python logging module with JSON formatter
- Log aggregation with ELK stack or Loki
- Error tracking with Sentry
- Performance monitoring with New Relic or DataDog

### Infrastructure Monitoring
- Docker container health checks
- Resource usage monitoring (CPU, memory, disk)
- Database performance metrics
- API response time tracking
- WebSocket connection monitoring

### Business Metrics
- Simulation execution count
- Model training frequency
- User activity tracking
- Report generation statistics
- System usage patterns

## Future Enhancements

### Phase 2 Features
- Real-time SRIS camera feed integration
- GPS trace data ingestion from RESOLV app
- Live traffic prediction with streaming data
- Mobile application for field data collection
- Multi-language support (English, Spanish, Portuguese)

### Phase 3 Features
- Integration with Georgetown traffic control center
- Pilot deployment on selected intersections
- Hybrid online/offline RL training
- Advanced visualization with 3D traffic simulation
- Collaborative research platform with version control

### Research Extensions
- Weather impact modeling
- Incident detection and response
- Public transportation optimization
- Pedestrian and cyclist safety analysis
- Long-term infrastructure planning tools
