# Database Schema Documentation

## Overview
This document describes the MongoDB schemas and indexes implemented for the Georgetown Traffic AI Management System.

## Connection Configuration
- **Database**: MongoDB
- **ODM**: Mongoose 8.0.0
- **Connection Module**: `src/config/database.js`
- **Environment Variable**: `MONGODB_URI`

## Models

### 1. User Model (`src/models/User.js`)
Manages user authentication and authorization.

**Fields:**
- `email` (String, required, unique) - User email address
- `password` (String, required, hashed) - User password (bcrypt)
- `firstName` (String, required) - User first name
- `lastName` (String, required) - User last name
- `role` (String, enum) - User role: admin, researcher, viewer
- `organization` (String) - User organization
- `isActive` (Boolean) - Account active status
- `lastLogin` (Date) - Last login timestamp
- `createdAt` (Date) - Account creation timestamp
- `updatedAt` (Date) - Last update timestamp

**Indexes:**
- `email: 1` - For fast email lookups during authentication

**Methods:**
- `comparePassword(candidatePassword)` - Compare password with hash
- `toPublicJSON()` - Return sanitized user object

**Hooks:**
- Pre-save hook to hash passwords with bcrypt (10 rounds)

---

### 2. Simulation Model (`src/models/Simulation.js`)
Stores traffic simulation configurations and results.

**Fields:**
- `name` (String, required) - Simulation name
- `description` (String) - Simulation description
- `userId` (ObjectId, ref: User) - Creator user ID
- `status` (String, enum) - pending, running, completed, failed
- `config` (Object) - Simulation configuration
  - `trafficDemand` (String) - low, medium, high, peak
  - `vehicleMix` (Object) - Vehicle type percentages
  - `duration` (Number) - Simulation duration in seconds
  - `timeOfDay` (String) - morning_peak, off_peak, evening_peak
  - `weather` (String) - clear, rain, flood
  - `incidents` (Array) - Traffic incidents
  - `controlStrategy` (String) - fixed, lstm, rf, dqn, ppo, marl
- `results` (Object) - Simulation results
  - `avgDelay` (Number) - Average delay per vehicle
  - `avgQueueLength` (Number) - Average queue length
  - `throughput` (Number) - Vehicles per hour
  - `fuelConsumption` (Number) - Fuel consumption
  - `co2Emissions` (Number) - CO2 emissions
  - `predictionRMSE` (Number) - Prediction RMSE
  - `predictionMAE` (Number) - Prediction MAE
  - `detailedMetrics` (Mixed) - Additional metrics
- `jobId` (String) - Python service job ID
- `startTime` (Date) - Simulation start time
- `endTime` (Date) - Simulation end time

**Indexes:**
- `userId: 1, createdAt: -1` - User simulations sorted by date
- `status: 1` - Filter by simulation status
- `config.controlStrategy: 1` - Filter by control strategy

---

### 3. TrafficData Model (`src/models/TrafficData.js`)
Manages uploaded traffic datasets.

**Fields:**
- `name` (String, required) - Dataset name
- `description` (String) - Dataset description
- `source` (String, enum) - osm, google_maps, sris, gps, resolv, manual
- `dataType` (String, enum) - network, demand, sensor, validation
- `uploadedBy` (ObjectId, ref: User) - Uploader user ID
- `fileUrl` (String, required) - File storage URL
- `metadata` (Object) - Dataset metadata
  - `recordCount` (Number) - Number of records
  - `startDate` (Date) - Data start date
  - `endDate` (Date) - Data end date
  - `coverage` (String) - Geographic coverage
  - `quality` (Number) - Quality score (0-100)
- `validation` (Object) - Validation results
  - `isValidated` (Boolean) - Validation status
  - `validationDate` (Date) - Validation date
  - `validationMethod` (String) - Validation method
  - `deviationPercent` (Number) - Deviation percentage

**Indexes:**
- `uploadedBy: 1, createdAt: -1` - User datasets sorted by date
- `source: 1, dataType: 1` - Filter by source and type

---

### 4. MLModel Model (`src/models/MLModel.js`)
Tracks trained machine learning models.

**Fields:**
- `name` (String, required) - Model name
- `type` (String, enum) - lstm, random_forest, dqn, ppo, marl
- `version` (String, required) - Model version
- `trainedBy` (ObjectId, ref: User) - Trainer user ID
- `trainingConfig` (Object) - Training configuration
  - `hyperparameters` (Mixed) - Model hyperparameters
  - `datasetId` (ObjectId, ref: TrafficData) - Training dataset
  - `epochs` (Number) - Training epochs
  - `batchSize` (Number) - Batch size
  - `learningRate` (Number) - Learning rate
  - `architecture` (Mixed) - Network architecture
- `performance` (Object) - Model performance metrics
  - `rmse` (Number) - Root mean squared error
  - `mae` (Number) - Mean absolute error
  - `r2Score` (Number) - R-squared score
  - `trainingLoss` (Array) - Training loss history
  - `validationLoss` (Array) - Validation loss history
  - `convergenceEpoch` (Number) - Convergence epoch
- `modelPath` (String, required) - Model file path
- `isDeployed` (Boolean) - Deployment status

**Indexes:**
- `type: 1, version: 1` - Filter by model type and version
- `trainedBy: 1, createdAt: -1` - User models sorted by date
- `isDeployed: 1` - Filter deployed models

---

### 5. RLAgent Model (`src/models/RLAgent.js`)
Manages reinforcement learning agents for traffic control.

**Fields:**
- `name` (String, required) - Agent name
- `algorithm` (String, enum) - dqn, ppo, a3c
- `intersectionIds` (Array) - Controlled intersection IDs
- `isMultiAgent` (Boolean) - Multi-agent flag
- `trainedBy` (ObjectId, ref: User) - Trainer user ID
- `trainingStatus` (String, enum) - not_started, training, completed, failed
- `trainingProgress` (Object) - Training progress
  - `currentEpisode` (Number) - Current episode
  - `totalEpisodes` (Number) - Total episodes
  - `currentReward` (Number) - Current reward
  - `bestReward` (Number) - Best reward
  - `avgDelay` (Number) - Average delay
  - `convergenceMetric` (Number) - Convergence metric
- `config` (Object) - Agent configuration
  - `stateSpace` (Mixed) - State space definition
  - `actionSpace` (Mixed) - Action space definition
  - `rewardFunction` (String) - Reward function
  - `networkArchitecture` (Mixed) - Network architecture
  - `hyperparameters` (Mixed) - Hyperparameters
- `performance` (Object) - Agent performance
  - `delayReduction` (Number) - Delay reduction %
  - `queueReduction` (Number) - Queue reduction %
  - `throughputIncrease` (Number) - Throughput increase %
  - `fuelSavings` (Number) - Fuel savings %
  - `emissionsReduction` (Number) - Emissions reduction %
- `policyPath` (String) - Policy file path
- `isDeployed` (Boolean) - Deployment status

**Indexes:**
- `algorithm: 1, trainingStatus: 1` - Filter by algorithm and status
- `trainedBy: 1, createdAt: -1` - User agents sorted by date
- `isDeployed: 1` - Filter deployed agents

---

### 6. Intersection Model (`src/models/Intersection.js`)
Stores Georgetown intersection data and configurations.

**Fields:**
- `name` (String, required) - Intersection name
- `osmId` (String, unique) - OpenStreetMap ID
- `location` (GeoJSON Point) - Geographic coordinates
  - `type` (String) - "Point"
  - `coordinates` (Array) - [longitude, latitude]
- `roads` (Array) - Connected roads
  - `name` (String) - Road name
  - `direction` (String) - Direction
  - `lanes` (Number) - Number of lanes
- `signalConfig` (Object) - Signal configuration
  - `cycleLength` (Number) - Cycle length in seconds
  - `phases` (Array) - Signal phases
- `isCongestionHotspot` (Boolean) - Hotspot flag
- `historicalData` (Object) - Historical traffic data
  - `avgDailyVolume` (Number) - Average daily volume
  - `peakHourVolume` (Number) - Peak hour volume
  - `avgDelay` (Number) - Average delay

**Indexes:**
- `location: 2dsphere` - Geospatial queries (find nearby intersections)
- `isCongestionHotspot: 1` - Filter congestion hotspots

---

### 7. Report Model (`src/models/Report.js`)
Manages generated research reports.

**Fields:**
- `title` (String, required) - Report title
- `type` (String, enum) - simulation, comparison, feasibility, full_research
- `generatedBy` (ObjectId, ref: User) - Generator user ID
- `simulationIds` (Array, ref: Simulation) - Related simulations
- `content` (Object) - Report content
  - `executiveSummary` (String) - Executive summary
  - `methodology` (String) - Methodology description
  - `results` (Mixed) - Results data
  - `conclusions` (String) - Conclusions
  - `recommendations` (Array) - Recommendations
- `format` (String, enum) - pdf, html, latex
- `fileUrl` (String) - Report file URL

**Indexes:**
- `generatedBy: 1, createdAt: -1` - User reports sorted by date
- `type: 1` - Filter by report type

---

## Database Connection Features

### Connection Management
- Automatic reconnection on connection loss
- Connection event logging (error, disconnected)
- Graceful shutdown on SIGINT signal
- Connection pooling via Mongoose defaults

### Error Handling
- Connection errors logged via Winston
- Process exit on initial connection failure
- Unhandled rejection handling in server.js

### Environment Configuration
- `MONGODB_URI` - MongoDB connection string
- Default: `mongodb://localhost:27017/georgetown-traffic-ai`
- Test database: `georgetown-traffic-ai-test`

## Usage Examples

### Import Models
```javascript
import { User, Simulation, TrafficData, MLModel, RLAgent, Intersection, Report } from './models/index.js';
```

### Create User
```javascript
const user = await User.create({
  email: 'researcher@example.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe',
  role: 'researcher'
});
```

### Query with Indexes
```javascript
// Fast email lookup (uses index)
const user = await User.findOne({ email: 'user@example.com' });

// User's simulations sorted by date (uses compound index)
const simulations = await Simulation.find({ userId: user._id })
  .sort({ createdAt: -1 });

// Geospatial query (uses 2dsphere index)
const nearbyIntersections = await Intersection.find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [-58.1551, 6.8013] },
      $maxDistance: 1000 // meters
    }
  }
});
```

## Performance Considerations

### Index Strategy
- Single field indexes for frequent filters (status, role, type)
- Compound indexes for common query patterns (userId + createdAt)
- Geospatial index for location-based queries
- Unique indexes for email and osmId

### Query Optimization
- Use `.select()` to limit returned fields
- Use `.lean()` for read-only queries
- Implement pagination for large result sets
- Use aggregation pipeline for complex analytics

### Monitoring
- Monitor slow queries via MongoDB profiler
- Track index usage with `explain()`
- Monitor connection pool metrics
- Set up alerts for connection failures
