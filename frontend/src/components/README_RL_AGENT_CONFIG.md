# RL Agent Configuration Component

## Overview

The RLAgentConfig component provides a comprehensive form interface for creating and configuring reinforcement learning agents for traffic signal control. This component supports both single-agent and multi-agent (MARL) configurations with extensive hyperparameter customization.

## Implementation Summary

### Task 12.1: Build RL agent configuration form ✅

**Components Created:**
1. `RLAgentConfig.jsx` - Main configuration form component
2. `RLAgentConfig.css` - Styling for the configuration form
3. `RLAgentPage.jsx` - Page component for agent management
4. `RLAgentPage.css` - Styling for the agent management page

**Features Implemented:**

#### 1. Basic Information Section
- Agent name input with validation (min 3 characters)
- Algorithm selection (DQN, PPO, A3C)
- Multi-agent mode toggle for MARL coordination

#### 2. Intersection Management
- Dynamic intersection ID list
- Add/remove intersection functionality
- Validation for multi-agent mode (minimum 2 intersections)

#### 3. Reward Function Design
- Multiple optimization objectives:
  - Delay Minimization
  - Queue Minimization
  - Throughput Maximization
  - Balanced approach
  - Emissions Minimization
- MARL-specific reward configuration:
  - Shared reward toggle
  - Local/Global reward weight balance slider

#### 4. Network Architecture Configuration
- State space size configuration
- Action space size configuration
- Hidden layer size customization
- Configurable activation functions

#### 5. Hyperparameter Configuration
- **Preset Options:**
  - Conservative (slow, stable learning)
  - Balanced (recommended default)
  - Aggressive (fast, exploratory learning)

- **Core Hyperparameters:**
  - Learning Rate (0.00001 - 1.0)
  - Discount Factor (γ) (0 - 1)
  - Batch Size (1 - 512)
  - Replay Buffer Size (100 - 100,000)

- **Advanced Parameters (Collapsible):**
  - Epsilon Start/End/Decay (exploration parameters)
  - Target Update Frequency
  - MARL Communication Settings:
    - Enable/disable agent communication
    - Communication radius (meters)
    - Experience sharing toggle

#### 6. Form Validation
- Required field validation
- Range validation for numeric inputs
- Multi-agent specific validation
- Real-time error feedback
- Replay buffer size must exceed batch size

#### 7. User Experience Features
- Collapsible advanced parameters section
- Preset hyperparameter configurations
- Helpful tooltips and descriptions
- Responsive design for mobile devices
- Clear visual hierarchy

## API Integration

The component integrates with the backend agent API:

**Endpoint:** `POST /api/agents`

**Request Body:**
```json
{
  "name": "Georgetown DQN Controller",
  "algorithm": "dqn",
  "intersectionIds": ["intersection_1", "intersection_2"],
  "isMultiAgent": true,
  "config": {
    "stateSpace": {
      "size": 13,
      "features": ["queue_length", "waiting_time", "vehicle_count", "signal_phase"]
    },
    "actionSpace": {
      "size": 4,
      "actions": ["extend_green", "switch_phase", "maintain", "early_switch"]
    },
    "rewardFunction": "delay_minimization",
    "networkArchitecture": {
      "hiddenLayers": [128, 64],
      "activation": "relu"
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
      "hiddenSize": 128,
      "enableCommunication": true,
      "communicationRadius": 500.0,
      "sharedReward": true,
      "rewardWeights": { "local": 0.7, "global": 0.3 },
      "enableExperienceSharing": true
    }
  }
}
```

## RLAgentPage Features

The RLAgentPage component provides a complete agent management interface:

1. **Agent List View:**
   - Grid layout of all created agents
   - Status badges (not started, training, completed, failed)
   - Deployment status indicators
   - Performance metrics for completed agents

2. **Agent Cards Display:**
   - Agent name and algorithm
   - Single/Multi-agent mode
   - Number of intersections
   - Training progress bars (for active training)
   - Performance summary (delay reduction, throughput increase)

3. **Actions:**
   - Create new agent
   - View agent details
   - Start training
   - Delete agent (with confirmation)

4. **Real-time Updates:**
   - Training progress tracking
   - Status updates
   - Performance metrics

## Usage Example

```jsx
import RLAgentConfig from './components/RLAgentConfig';

function MyComponent() {
  const handleSubmit = async (formData) => {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    console.log('Agent created:', data);
  };

  return (
    <RLAgentConfig
      onSubmit={handleSubmit}
      onCancel={() => console.log('Cancelled')}
      initialData={null} // or existing agent data for editing
    />
  );
}
```

## Styling

The component uses a clean, modern design with:
- Blue accent color (#2196F3) for primary actions
- Responsive grid layouts
- Smooth transitions and hover effects
- Clear visual hierarchy
- Mobile-friendly responsive design

## Requirements Satisfied

✅ **Requirement 5.1:** Agent configuration with state/action space definition
✅ **Requirement 13.1:** Hyperparameter input fields and network architecture configuration

## Next Steps

The following tasks remain in the RL Agent Interface section:
- Task 12.2: Create training monitoring dashboard
- Task 12.3: Implement control strategy comparison interface

## Notes

- The component is fully integrated with the existing backend agent API
- All validation rules match backend validation schemas
- MARL-specific features are conditionally displayed based on isMultiAgent flag
- The form supports both creation and editing modes (via initialData prop)
- Preset configurations provide quick setup for common use cases
