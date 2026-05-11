# RL Agent Training and Comparison Interface

This document describes the implementation of the training monitoring dashboard and control strategy comparison interface for RL agents.

## Components

### 1. TrainingMonitor Component

**Location:** `frontend/src/components/TrainingMonitor.jsx`

**Purpose:** Real-time monitoring dashboard for RL agent training progress.

**Features:**
- **Live Updates:** WebSocket connection for real-time training metrics
- **Episode Rewards Chart:** Line chart showing reward progression over episodes
- **Loss Curve:** Visualization of training loss over time
- **Delay Metrics:** Average delay tracking throughout training
- **Convergence Metrics:** Display of training convergence indicators
- **Agent Behavior:** Table showing recent state-action pairs and rewards
- **Status Overview:** Current episode, progress bar, best reward tracking
- **Connection Status:** Indicator showing live updates vs polling mode

**Props:**
- `agentId` (string): ID of the agent being monitored
- `onClose` (function): Callback when monitor is closed

**WebSocket Events:**
- Subscribes to: `training:${agentId}` room
- Listens for: `training_update` events
- Emits: `subscribe_training`, `unsubscribe_training`

**Data Flow:**
1. Establishes WebSocket connection on mount
2. Subscribes to training updates for specific agent
3. Polls training status every 5 seconds as fallback
4. Updates charts and metrics in real-time
5. Stops polling when training completes or fails

**Charts:**
- Episode Rewards (LineChart)
- Loss Curve (LineChart)
- Average Delay Over Time (LineChart)

### 2. ControlComparison Component

**Location:** `frontend/src/components/ControlComparison.jsx`

**Purpose:** Side-by-side comparison of fixed timing vs adaptive RL control strategies.

**Features:**
- **Performance Improvements Overview:** Grid showing percentage improvements across all metrics
- **Side-by-Side Comparison Chart:** Bar chart comparing baseline vs adaptive metrics
- **Improvement Percentages Chart:** Bar chart showing improvement percentages
- **Detailed Metric View:** Deep dive into individual metrics with descriptions
- **Signal Timing Visualization:** Visual comparison of fixed vs adaptive signal phases
- **Key Insights:** Automatically generated insights about performance gains
- **View Modes:** Summary and detailed views

**Props:**
- `agentId` (string): ID of the agent to compare

**Metrics Compared:**
- Average Delay (seconds)
- Average Queue Length (meters)
- Throughput (vehicles/hour)
- Fuel Consumption (liters)
- CO2 Emissions (kg)

**View Modes:**
1. **Summary Mode:**
   - Performance metrics comparison chart
   - Improvement percentages chart
   - Quick overview of all metrics

2. **Detailed Mode:**
   - Metric selector dropdown
   - Strategy cards with descriptions
   - Signal timing visualization
   - Detailed comparison for selected metric

**Insights Section:**
- Overall Performance summary
- Traffic Flow improvements
- Environmental Impact analysis
- Multi-Agent Coordination benefits (if applicable)

### 3. AgentTrainingPage

**Location:** `frontend/src/pages/AgentTrainingPage.jsx`

**Purpose:** Page for configuring and starting agent training.

**Features:**
- **Training Configuration Form:**
  - Network file selection
  - Route file selection
  - Number of episodes
  - Max steps per episode
  - Evaluation frequency
  - Save frequency
- **Training Information Display:**
  - Estimated duration
  - Algorithm details
  - State/action space info
  - Multi-agent coordination info
- **Training Monitor Integration:** Shows TrainingMonitor when training starts
- **Status Handling:** Different views for not started, training, completed, failed

**Routes:**
- `/agents/:agentId/train` - Training configuration and monitoring

**Training Configuration:**
```javascript
{
  networkFile: 'georgetown_network.net.xml',
  routeFile: 'georgetown_routes.rou.xml',
  numEpisodes: 100,
  maxStepsPerEpisode: 3600,
  evaluationFrequency: 50,
  saveFrequency: 10
}
```

### 4. AgentComparisonPage

**Location:** `frontend/src/pages/AgentComparisonPage.jsx`

**Purpose:** Page for viewing control strategy comparison.

**Features:**
- Simple wrapper around ControlComparison component
- Navigation back to agents list
- Clean layout for comparison visualization

**Routes:**
- `/agents/:agentId/compare` - Performance comparison view

## API Integration

### Training Endpoints

**Start Training:**
```
POST /api/agents/:id/train
Body: {
  networkFile: string,
  routeFile: string,
  numEpisodes: number,
  maxStepsPerEpisode: number,
  evaluationFrequency: number,
  saveFrequency: number
}
Response: {
  success: true,
  message: 'Training started',
  data: {
    agentId: string,
    jobId: string,
    status: string
  }
}
```

**Get Training Status:**
```
GET /api/agents/:id/training-status
Response: {
  success: true,
  data: {
    agentId: string,
    name: string,
    algorithm: string,
    trainingStatus: string,
    trainingProgress: {
      currentEpisode: number,
      totalEpisodes: number,
      currentReward: number,
      bestReward: number,
      avgDelay: number,
      convergenceMetric: number
    },
    latestMetrics: object,
    coordinationMetrics: object (MARL only)
  }
}
```

**Get Agent Performance:**
```
GET /api/agents/:id/performance
Response: {
  success: true,
  data: {
    agentId: string,
    name: string,
    algorithm: string,
    isMultiAgent: boolean,
    performance: {
      delayReduction: number,
      queueReduction: number,
      throughputIncrease: number,
      fuelSavings: number,
      emissionsReduction: number
    },
    evaluationResults: object
  }
}
```

## WebSocket Integration

### Connection Setup
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('token') },
  transports: ['websocket', 'polling']
});
```

### Training Updates
```javascript
// Subscribe to training updates
socket.emit('subscribe_training', { agentId });

// Listen for updates
socket.on('training_update', (data) => {
  // data contains:
  // - episode
  // - total_reward / global_reward
  // - loss
  // - average_delay
  // - state_action_pairs
  // - convergence_metric
});

// Unsubscribe
socket.emit('unsubscribe_training', { agentId });
```

## Usage Examples

### Starting Training

1. Navigate to `/agents/:agentId/train`
2. Configure training parameters
3. Click "Start Training"
4. Monitor training progress in real-time
5. View results when complete

### Viewing Comparison

1. Navigate to `/agents/:agentId/compare`
2. View performance improvements
3. Switch between summary and detailed views
4. Explore different metrics
5. Review key insights

### Monitoring Active Training

1. If agent is already training, TrainingMonitor shows automatically
2. Real-time charts update as training progresses
3. View episode rewards, loss curves, and delay metrics
4. Monitor convergence and agent behavior
5. Close monitor to return to agents list

## Styling

All components use a dark theme consistent with the application:
- Background: `#1f2937`, `#111827`
- Text: `#f3f4f6`, `#9ca3af`
- Primary: `#3b82f6`
- Success: `#10b981`
- Error: `#ef4444`
- Borders: `#374151`

Charts use Recharts library with custom styling for dark theme compatibility.

## Responsive Design

All components are fully responsive:
- Desktop: Multi-column layouts, side-by-side comparisons
- Tablet: Adjusted grid layouts, maintained functionality
- Mobile: Single-column layouts, stacked views

## Error Handling

- WebSocket connection failures fall back to polling
- API errors display user-friendly messages
- Loading states prevent premature interactions
- Empty states guide users when no data available

## Performance Considerations

- Chart data limited to last 100 episodes to prevent memory issues
- Polling interval set to 5 seconds to balance freshness and load
- WebSocket preferred for real-time updates when available
- Component cleanup prevents memory leaks on unmount

## Future Enhancements

1. **Export Training Data:** Download training metrics as CSV
2. **Training Pause/Resume:** Control training execution
3. **Hyperparameter Tuning:** Adjust parameters during training
4. **Multi-Agent Visualization:** Show coordination patterns
5. **Comparison History:** Compare multiple training runs
6. **Performance Predictions:** Estimate final performance early
7. **Alert System:** Notify when training completes or fails

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 5.3:** Real-time training metrics display
- **Requirement 5.4:** Agent performance evaluation and comparison
- **Requirement 5.5:** Delay reduction and throughput metrics
- **Requirement 8.2:** Control strategy comparison interface
- **Requirement 12.1:** WebSocket integration for live updates
- **Requirement 12.4:** Training convergence visualization

## Testing

To test the components:

1. **Training Monitor:**
   - Create an agent
   - Start training
   - Verify real-time updates appear
   - Check charts populate correctly
   - Confirm WebSocket connection status

2. **Control Comparison:**
   - Train an agent to completion
   - Navigate to comparison page
   - Verify metrics display correctly
   - Test view mode switching
   - Check responsive layout

3. **Integration:**
   - Test navigation between pages
   - Verify data persistence
   - Check error handling
   - Test with different agent types (single/multi-agent)
