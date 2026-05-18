# Georgetown Traffic AI System - Technical Documentation

## Executive Summary

This document provides a comprehensive technical explanation of how the Georgetown Traffic AI web application was built, including the architecture, technologies used, source code structure, and implementation details.

---

## 1. System Architecture Overview

The application follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  Interactive Dashboard, Visualizations, User Interface       │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API / WebSocket
┌────────────────────┴────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                 │
│  API Routes, Business Logic, Authentication, Validation      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP API Calls
┌────────────────────┴────────────────────────────────────────┐
│              PYTHON AI SERVICE (FastAPI)                     │
│  SUMO Simulation, DQN/MARL Training, ML Predictions         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                   DATABASE (MongoDB)                         │
│  User Data, Simulation Results, Training History            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend Technologies
- **React 18** - Modern UI library for building interactive interfaces
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing for navigation
- **Inline Styles** - Component-scoped styling for consistency
- **Canvas API** - For animated traffic simulations
- **Chart.js** - Data visualization for learning curves and metrics

### Backend Technologies
- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database for flexible data storage
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **WebSocket** - Real-time communication for live updates

### Python AI Service
- **FastAPI** - Modern Python web framework
- **SUMO** - Simulation of Urban Mobility (traffic simulator)
- **TensorFlow/Keras** - Deep learning framework for DQN
- **NumPy/Pandas** - Data processing and analysis
- **Scikit-learn** - Machine learning models (Random Forest, ARIMA)

### Development Tools
- **Git** - Version control
- **Docker** - Containerization (optional deployment)
- **Google Colab** - Cloud-based training environment
- **VS Code** - Primary development environment

---

## 3. Source Code Structure

```
georgetown-traffic-ai/
│
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LiveSimulationPage.jsx    # Main dashboard (HOME PAGE)
│   │   │   ├── InteractiveSimulationPage.jsx
│   │   │   ├── MapPage.jsx
│   │   │   ├── SimulationPage.jsx
│   │   │   ├── PredictionPage.jsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── GeorgetownMap.jsx         # Interactive map
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── PerformanceCharts.jsx
│   │   │   └── ...
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx           # Authentication state
│   │   ├── App.jsx                       # Main app component
│   │   └── main.jsx                      # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # Node.js backend API
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   │   ├── simulation.controller.js
│   │   │   ├── prediction.controller.js
│   │   │   ├── agent.controller.js
│   │   │   └── ...
│   │   ├── routes/              # API endpoints
│   │   │   ├── simulation.routes.js
│   │   │   ├── prediction.routes.js
│   │   │   └── ...
│   │   ├── models/              # MongoDB schemas
│   │   │   ├── Simulation.js
│   │   │   ├── User.js
│   │   │   ├── RLAgent.js
│   │   │   └── ...
│   │   ├── middleware/          # Authentication, validation
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── ...
│   │   ├── services/            # Business logic
│   │   │   ├── pythonAI.service.js
│   │   │   ├── websocket.service.js
│   │   │   └── ...
│   │   └── server.js            # Express server entry
│   └── package.json
│
├── python-ai/                   # Python AI service
│   ├── app/
│   │   ├── api/                 # FastAPI endpoints
│   │   │   ├── sumo.py
│   │   │   ├── rl.py
│   │   │   └── ml.py
│   │   ├── services/
│   │   │   ├── sumo/            # SUMO simulation
│   │   │   │   ├── simulation_runner.py
│   │   │   │   ├── osm_importer.py
│   │   │   │   ├── georgetown_routes.py
│   │   │   │   └── ...
│   │   │   ├── rl/              # Reinforcement Learning
│   │   │   │   ├── dqn_agent.py
│   │   │   │   ├── marl_agent.py
│   │   │   │   ├── sumo_environment.py
│   │   │   │   └── ...
│   │   │   └── ml/              # Machine Learning
│   │   │       ├── lstm_model.py
│   │   │       ├── random_forest_model.py
│   │   │       └── ...
│   │   ├── models/              # Data schemas
│   │   ├── core/                # Configuration
│   │   └── main.py              # FastAPI app entry
│   └── requirements.txt
│
├── colab/                       # Google Colab scripts
│   ├── georgetown_complete_setup.ipynb
│   ├── training_results.json    # Pre-computed training data
│   ├── baseline_results.json
│   └── ...
│
└── docker-compose.yml           # Container orchestration

```

---

## 4. How the Application Was Built

### Phase 1: Research & Planning
1. **Literature Review** - Studied RL-based traffic control papers
2. **Requirements Analysis** - Defined research questions (RQ1, RQ2, RQ3)
3. **Architecture Design** - Planned three-tier system
4. **Technology Selection** - Chose React, Node.js, Python stack

### Phase 2: Backend Development
1. **Express Server Setup**
   - Created RESTful API structure
   - Implemented authentication with JWT
   - Set up MongoDB connection
   
2. **API Endpoints Created**
   ```javascript
   // backend/src/routes/simulation.routes.js
   POST   /api/simulations/run      // Start SUMO simulation
   GET    /api/simulations/:id      // Get simulation results
   POST   /api/agents/train          // Train DQN agent
   GET    /api/predictions           // Get traffic predictions
   ```

3. **Database Models**
   ```javascript
   // backend/src/models/Simulation.js
   - User, Simulation, RLAgent, MLModel, TrafficData
   ```

### Phase 3: Python AI Service
1. **SUMO Integration**
   - Imported Georgetown OSM network (2,646 junctions)
   - Created traffic demand generators
   - Implemented vehicle types and routes

2. **DQN Agent Implementation**
   ```python
   # python-ai/app/services/rl/dqn_agent.py
   - State: queue lengths, vehicle arrivals
   - Actions: signal phase changes
   - Reward: negative delay reduction
   - Network: 3-layer neural network
   ```

3. **Training in Google Colab**
   - Ran 50-episode training sessions
   - Achieved 35.7% delay reduction
   - Exported results to JSON files

### Phase 4: Frontend Development
1. **React Application Setup**
   ```bash
   npm create vite@latest frontend -- --template react
   ```

2. **Main Dashboard (LiveSimulationPage.jsx)**
   - **6 Tabs**: Welcome, Models, Interact, Results, Map, Feasibility
   - **Interactive Controls**: Episode selection, speed control
   - **Live Visualization**: Animated traffic canvases
   - **Charts**: Learning curves, performance metrics

3. **Key Components Built**
   ```jsx
   // frontend/src/pages/LiveSimulationPage.jsx
   - ControlPanel: Run simulation controls
   - DQNChart: Learning curve visualization
   - SimCanvasPanel: Animated traffic simulation
   - TrainingLog: Real-time training updates
   - GeorgetownMap: Interactive OSM map
   ```

4. **Data Visualization**
   - Used pre-computed training data from Colab
   - Implemented step-by-step animation
   - Created comparison charts (Fixed vs DQN vs MARL)

### Phase 5: Integration & Testing
1. **Frontend-Backend Connection**
   - REST API calls for data fetching
   - WebSocket for real-time updates
   - Error handling and loading states

2. **Testing**
   - Unit tests for components
   - Integration tests for API endpoints
   - Manual testing of user workflows

3. **Deployment**
   - Frontend: Vercel
   - Backend: Render
   - Database: MongoDB Atlas

---

## 5. Key Implementation Details

### 5.1 Live Simulation Visualization

The animated traffic simulation uses HTML5 Canvas:

```javascript
// frontend/src/pages/LiveSimulationPage.jsx (simplified)

// Create vehicle objects
const makeVehicles = (count) => {
  return Array.from({length: count}, () => ({
    x: Math.random() * 300,
    y: Math.random() * 180,
    speed: 1 + Math.random() * 2,
    color: '#60a5fa'
  }));
};

// Animation loop
const loop = () => {
  updateVehicles(vehicles, signals);  // Move vehicles
  drawCanvas(canvas, vehicles, signals);  // Render
  requestAnimationFrame(loop);  // Continue
};
```

### 5.2 DQN Training Data Integration

Training results from Google Colab are embedded:

```javascript
// frontend/src/pages/LiveSimulationPage.jsx

const TRAINING_DATA = [
  {ep:1,  delay:42.71, queue:10.92},  // Baseline
  {ep:5,  delay:37.01, queue:9.47},   // 13.3% improvement
  {ep:10, delay:35.27, queue:9.02},   // 17.4% improvement
  // ... 
  {ep:50, delay:27.45, queue:7.56}    // 35.7% improvement
];
```

### 5.3 Interactive Episode Selection

Users can view progress at different checkpoints:

```javascript
const CHECKPOINTS = [5, 10, 15, 20, 30, 50];

// Click handler
<button onClick={() => setViewEpisode(ep)}>
  EP{ep}
</button>

// Filter chart data
<DQNChart 
  chartPoints={chartPoints.filter(pt => pt.ep <= viewEpisode)} 
/>
```

### 5.4 Real Georgetown Network

The map uses actual OpenStreetMap data:

```javascript
// frontend/src/components/GeorgetownMap.jsx

<MapContainer 
  center={[6.8013, -58.1551]}  // Georgetown coordinates
  zoom={13}
>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <GeoJSON data={georgetownNetwork} />  // 2,646 junctions
</MapContainer>
```

---

## 6. Data Flow Example

### User Runs Simulation:

```
1. User clicks "Run Simulation" button
   ↓
2. Frontend (LiveSimulationPage.jsx)
   - Sets running=true
   - Starts episode loop
   ↓
3. Episode Loop (JavaScript)
   - Reads TRAINING_DATA[episode]
   - Updates metrics (delay, queue, throughput)
   - Updates learning curve chart
   - Adds log entry
   - Triggers canvas animation
   ↓
4. Canvas Animation
   - Vehicles move through intersections
   - Traffic signals change
   - Visual feedback shows AI learning
   ↓
5. Training Complete
   - Shows final improvement (35.7%)
   - Enables result exploration
   - Allows episode checkpoint viewing
```

---

## 7. Key Features Implemented

### 7.1 Welcome Tab
- Educational content explaining AI models
- Episode and metrics definitions
- Georgetown impact projections
- Research questions overview

### 7.2 Models Tab
- Control panel (episodes, speed, run/reset)
- Model performance comparison table
- RMSE/MAE charts
- Random Forest vs LSTM vs ARIMA

### 7.3 Interact Tab
- Live DQN learning curve with green improvement zone
- Episode checkpoint selector (EP5, EP10, EP15, EP20, EP30, EP50)
- Real-time training log
- Side-by-side traffic animations (Fixed vs DQN)

### 7.4 Results Tab
- Detailed performance analysis
- Comparison with published benchmarks
- Queue and delay reduction metrics

### 7.5 Map Tab
- Interactive Georgetown road network
- 2,646 junctions from OpenStreetMap
- GeoJSON visualization

### 7.6 Feasibility Tab
- Implementation constraints
- 4-phase deployment roadmap
- Data, infrastructure, and governance requirements

---

## 8. Source Code Highlights

### 8.1 Main Dashboard Component

**File**: `frontend/src/pages/LiveSimulationPage.jsx` (1,600+ lines)

**Key Functions**:
- `GeorgetownDashboard()` - Root component managing all state
- `runEpisode()` - Simulates one training episode
- `startCanvasLoop()` - Animates traffic vehicles
- `OverviewTab()` - Welcome screen with education
- `SimulationTab()` - Interactive training visualization
- `PredictionTab()` - Model comparison
- `RLTab()` - Results analysis

### 8.2 Backend API Controller

**File**: `backend/src/controllers/simulation.controller.js`

```javascript
exports.runSimulation = async (req, res) => {
  const { episodes, trafficDensity, intersections } = req.body;
  
  // Call Python AI service
  const result = await pythonAIService.runSUMO({
    episodes,
    density: trafficDensity,
    intersections
  });
  
  // Save to database
  const simulation = await Simulation.create({
    user: req.user.id,
    config: req.body,
    results: result
  });
  
  res.json(simulation);
};
```

### 8.3 Python DQN Agent

**File**: `python-ai/app/services/rl/dqn_agent.py`

```python
class DQNAgent:
    def __init__(self, state_size, action_size):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=2000)
        self.gamma = 0.95    # discount rate
        self.epsilon = 1.0   # exploration rate
        self.model = self._build_model()
    
    def _build_model(self):
        model = Sequential()
        model.add(Dense(24, input_dim=self.state_size, activation='relu'))
        model.add(Dense(24, activation='relu'))
        model.add(Dense(self.action_size, activation='linear'))
        model.compile(loss='mse', optimizer=Adam(lr=0.001))
        return model
    
    def act(self, state):
        if np.random.rand() <= self.epsilon:
            return random.randrange(self.action_size)
        act_values = self.model.predict(state)
        return np.argmax(act_values[0])
```

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                     │
│  - React app served as static files                     │
│  - CDN distribution                                      │
│  - HTTPS enabled                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                   RENDER (Backend)                       │
│  - Node.js Express API                                   │
│  - Environment variables                                 │
│  - Auto-deploy from Git                                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│              MONGODB ATLAS (Database)                    │
│  - Cloud-hosted MongoDB                                  │
│  - Automatic backups                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Performance Optimizations

1. **Pre-computed Training Data** - Results from Colab embedded in frontend
2. **Canvas Animation** - Hardware-accelerated rendering
3. **Lazy Loading** - Components load on demand
4. **Memoization** - React hooks prevent unnecessary re-renders
5. **Efficient State Management** - Minimal re-renders during animation

---

## 11. Security Features

1. **JWT Authentication** - Secure user sessions
2. **Input Validation** - All API inputs validated
3. **Rate Limiting** - Prevents API abuse
4. **CORS Configuration** - Controlled cross-origin access
5. **Environment Variables** - Sensitive data protected

---

## 12. Testing Strategy

1. **Frontend Tests** - React Testing Library
2. **Backend Tests** - Jest + Supertest
3. **Python Tests** - Pytest
4. **Integration Tests** - End-to-end workflows
5. **Manual Testing** - User acceptance testing

---

## 13. Future Enhancements

1. **Live SUMO Integration** - Real-time simulation execution
2. **Multi-user Support** - Concurrent simulations
3. **Advanced Analytics** - More detailed performance metrics
4. **Mobile App** - Native iOS/Android applications
5. **Real-world Deployment** - Pilot program in Georgetown

---

## 14. Conclusion

The Georgetown Traffic AI system is a comprehensive web application that successfully demonstrates the application of reinforcement learning to urban traffic management. Built with modern web technologies and backed by rigorous research, it provides an interactive platform for exploring AI-driven traffic optimization.

The system achieves:
- ✅ 35.7% reduction in average vehicle delay
- ✅ Interactive visualization of AI learning process
- ✅ Real Georgetown network with 2,646 junctions
- ✅ Comprehensive feasibility assessment
- ✅ Research-grade documentation and presentation

---

## Appendix: Key Files Reference

| File | Purpose | Lines of Code |
|------|---------|---------------|
| `frontend/src/pages/LiveSimulationPage.jsx` | Main dashboard | 1,600+ |
| `backend/src/controllers/simulation.controller.js` | Simulation API | 300+ |
| `python-ai/app/services/rl/dqn_agent.py` | DQN implementation | 250+ |
| `python-ai/app/services/sumo/simulation_runner.py` | SUMO integration | 400+ |
| `frontend/src/components/GeorgetownMap.jsx` | Interactive map | 200+ |

**Total Project**: ~15,000+ lines of code across all components

---

**Document Version**: 1.0  
**Last Updated**: May 17, 2026  
**Author**: Georgetown Traffic AI Development Team
