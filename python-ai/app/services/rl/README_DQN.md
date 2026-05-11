# Deep Q-Network (DQN) Reinforcement Learning Implementation

## Overview

This module implements a Deep Q-Network (DQN) agent for adaptive traffic signal control in Georgetown. The agent learns optimal signal timing policies through interaction with SUMO traffic simulations.

## Architecture

### Components

1. **DQN Network** (`dqn_network.py`)
   - Neural network architecture for Q-value approximation
   - Experience replay buffer for stable training
   - Target network for stable Q-learning

2. **SUMO Environment** (`sumo_environment.py`)
   - OpenAI Gym-style interface for SUMO
   - State space: queue lengths, vehicle arrivals, signal phases
   - Action space: signal phase changes
   - Reward function: minimize delay and queue length

3. **DQN Agent** (`dqn_agent.py`)
   - Training algorithm with epsilon-greedy exploration
   - Experience replay and target network updates
   - Model checkpointing and evaluation

4. **Agent Evaluator** (`agent_evaluator.py`)
   - Performance evaluation against baseline
   - Fixed-timing controller comparison
   - Metrics calculation and reporting

## State Space

The state representation includes (13 dimensions):
- Queue lengths for 4 incoming lanes (4 features)
- Vehicle arrivals on 4 incoming lanes (4 features)
- Current signal phase (one-hot encoded, 4 features)
- Time since last phase change (1 feature, normalized)

## Action Space

4 discrete actions representing signal phases:
- Action 0: North-South green
- Action 1: East-West green
- Action 2: Left-turn phases
- Action 3: All-red (transition)

## Reward Function

```python
reward = -(delay + queue_length * 0.1)
```

Where:
- `delay`: Total waiting time of vehicles (seconds)
- `queue_length`: Number of halting vehicles
- Negative reward encourages minimization

## Training Algorithm

### DQN with Experience Replay

1. **Initialize** networks and replay buffer
2. **For each episode:**
   - Reset environment
   - **For each step:**
     - Select action using ε-greedy policy
     - Execute action in SUMO
     - Store experience (s, a, r, s', done)
     - Sample batch from replay buffer
     - Compute TD target: `r + γ * max Q(s', a')`
     - Update policy network
     - Periodically update target network
   - Decay exploration rate ε

### Hyperparameters

```python
learning_rate = 0.001
gamma = 0.99              # Discount factor
epsilon_start = 1.0       # Initial exploration
epsilon_end = 0.01        # Final exploration
epsilon_decay = 0.995     # Decay rate
batch_size = 64
replay_buffer_size = 10000
target_update_freq = 100  # Steps
```

## API Endpoints

### Create Agent
```http
POST /api/rl/dqn/create
```

Creates a new DQN agent with specified configuration.

**Request:**
```json
{
  "name": "Georgetown Agent",
  "intersection_id": "cluster_123",
  "state_size": 13,
  "action_size": 4,
  "learning_rate": 0.001
}
```

**Response:**
```json
{
  "agent_id": "uuid",
  "name": "Georgetown Agent",
  "intersection_id": "cluster_123",
  "config": {...},
  "message": "DQN agent created successfully"
}
```

### Train Agent
```http
POST /api/rl/dqn/train
```

Starts training in background.

**Request:**
```json
{
  "agent_id": "uuid",
  "network_file": "path/to/network.net.xml",
  "route_file": "path/to/routes.rou.xml",
  "num_episodes": 100,
  "max_steps_per_episode": 3600
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "agent_id": "uuid",
  "status": "pending",
  "message": "Training started in background"
}
```

### Get Training Status
```http
GET /api/rl/dqn/train/status/{job_id}
```

Returns current training progress.

**Response:**
```json
{
  "job_id": "uuid",
  "agent_id": "uuid",
  "status": "running",
  "current_episode": 45,
  "total_episodes": 100,
  "latest_metrics": {
    "episode": 45,
    "total_reward": -850.5,
    "average_queue": 8.2,
    "average_delay": 42.3,
    "epsilon": 0.15
  }
}
```

### Evaluate Agent
```http
POST /api/rl/dqn/evaluate
```

Evaluates trained agent against baseline.

**Request:**
```json
{
  "agent_id": "uuid",
  "network_file": "path/to/network.net.xml",
  "route_file": "path/to/routes.rou.xml",
  "num_episodes": 10
}
```

**Response:**
```json
{
  "agent_id": "uuid",
  "metrics": {
    "summary": {...},
    "performance_metrics": {
      "baseline": {
        "average_delay": 120.5,
        "average_queue_length": 15.2,
        "average_throughput": 850
      },
      "agent": {
        "average_delay": 85.3,
        "average_queue_length": 10.8,
        "average_throughput": 980
      }
    },
    "improvements": {
      "delay_reduction_percent": 29.2,
      "queue_reduction_percent": 28.9,
      "throughput_increase_percent": 15.3
    }
  }
}
```

### Get Agent Policy
```http
GET /api/rl/agents/{agent_id}/policy
```

Returns learned policy and training history.

### List Agents
```http
GET /api/rl/agents
```

Lists all active agents.

### Delete Agent
```http
DELETE /api/rl/agents/{agent_id}
```

Removes agent from memory.

## Usage Example

### Python

```python
from app.services.rl import DQNAgent, DQNConfig, SUMOTrafficEnvironment, EnvironmentConfig

# Create agent
config = DQNConfig(
    state_size=13,
    action_size=4,
    learning_rate=0.001
)
agent = DQNAgent(config)

# Create environment
env_config = EnvironmentConfig(intersection_id="cluster_123")
env = SUMOTrafficEnvironment(env_config)

# Train agent
agent.train(env, num_episodes=100)

# Evaluate agent
eval_metrics = agent.evaluate(env, num_episodes=10)
print(f"Average reward: {eval_metrics['average_reward']}")

# Save policy
agent.save_policy("models/rl/dqn/policy.pt")
```

### JavaScript (via API)

```javascript
// Create agent
const response = await fetch('/api/rl/dqn/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Georgetown Agent',
    intersection_id: 'cluster_123',
    state_size: 13,
    action_size: 4
  })
});
const { agent_id } = await response.json();

// Start training
const trainResponse = await fetch('/api/rl/dqn/train', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id,
    network_file: 'georgetown.net.xml',
    route_file: 'routes.rou.xml',
    num_episodes: 100
  })
});
const { job_id } = await trainResponse.json();

// Poll training status
const statusResponse = await fetch(`/api/rl/dqn/train/status/${job_id}`);
const status = await statusResponse.json();
console.log(`Episode ${status.current_episode}/${status.total_episodes}`);
```

## Performance Targets

Based on requirements 5.4 and 5.5:

- **Delay Reduction**: 25-34% compared to fixed-timing
- **Queue Reduction**: 20-30% compared to fixed-timing
- **Throughput Increase**: 15-25% compared to fixed-timing

## Model Checkpointing

Models are automatically saved during training:

- **Checkpoint frequency**: Every 50 episodes (configurable)
- **Checkpoint location**: `models/rl/dqn/{agent_id}/`
- **Checkpoint contents**:
  - Policy network weights
  - Target network weights
  - Optimizer state
  - Training metrics
  - Configuration

## Convergence Monitoring

Training metrics tracked per episode:
- Total reward
- Average reward per step
- Exploration rate (epsilon)
- TD loss
- Average queue length
- Average delay

Convergence indicators:
- Reward stabilization (moving average)
- Epsilon decay to minimum
- Loss reduction
- Performance improvement plateau

## Requirements Satisfied

- ✅ **5.1**: DQN neural network architecture implemented
- ✅ **5.2**: RL environment interface with SUMO created
- ✅ **5.3**: DQN training algorithm with experience replay
- ✅ **5.4**: Agent performance evaluation against baseline
- ✅ **5.5**: Performance metrics calculation (delay, queue, throughput)
- ✅ **13.2**: Episode rewards tracking
- ✅ **13.3**: Convergence monitoring

## Future Enhancements

1. **Multi-agent coordination**: Extend to multiple intersections
2. **Advanced algorithms**: Implement A3C, PPO, or SAC
3. **Transfer learning**: Pre-train on similar intersections
4. **Real-time adaptation**: Online learning from live traffic
5. **Reward shaping**: More sophisticated reward functions
6. **State augmentation**: Include weather, events, time-of-day

## References

- Mnih et al. (2015). "Human-level control through deep reinforcement learning"
- Van Hasselt et al. (2016). "Deep Reinforcement Learning with Double Q-learning"
- Schaul et al. (2016). "Prioritized Experience Replay"
