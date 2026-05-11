# Multi-Agent Reinforcement Learning (MARL) Implementation

## Overview

This module implements a Multi-Agent Reinforcement Learning (MARL) system for coordinated traffic signal control across multiple intersections in Georgetown, Guyana. The system enables multiple DQN agents to learn cooperative policies that optimize network-wide traffic flow.

## Architecture

### Components

1. **MARLEnvironment** (`marl_environment.py`)
   - Multi-agent wrapper around SUMO traffic simulation
   - Manages multiple intersection agents
   - Handles neighbor state sharing and communication
   - Computes global and local reward components
   - Tracks network-wide performance metrics

2. **MARLAgent** (`marl_agent.py`)
   - Coordinates multiple DQN agents
   - Implements independent learning with coordination
   - Supports experience sharing between agents
   - Manages individual agent networks and replay buffers
   - Provides synchronized training and evaluation

3. **MARLTrainer** (`marl_trainer.py`)
   - Comprehensive training pipeline
   - Tracks individual and global performance
   - Calculates coordination metrics
   - Implements early stopping and checkpointing
   - Supports curriculum learning schedules

## Key Features

### 1. Multi-Agent Coordination

- **Local Observation**: Each agent observes its own intersection state (queue lengths, vehicle arrivals, signal phases)
- **Neighbor State Sharing**: Agents can observe neighbor intersection states within communication radius
- **Coordinated Rewards**: Combines local intersection performance with global network performance

### 2. Communication Mechanisms

- **Spatial Communication**: Agents within configurable radius can share state information
- **Neighbor Detection**: Automatic computation of neighbor relationships based on distance
- **State Augmentation**: Local states augmented with neighbor phase and queue information

### 3. Coordination Strategies

- **Independent Learning**: Each agent learns independently with local observations
- **Shared Experience**: Agents can share experiences through common replay buffer
- **Centralized Training**: Optional centralized training with decentralized execution

### 4. Reward Structure

Configurable reward weights for local and global components:

```python
reward = local_weight * local_reward + global_weight * global_reward

# Local reward: minimize delay and queue at own intersection
local_reward = -(delay + queue_length * 0.1)

# Global reward: minimize network-wide delay and queue
global_reward = -(total_delay + total_queue * 0.1)
```

## Usage

### Creating a MARL System

```python
from app.services.rl.marl_environment import MARLEnvironment, MARLConfig
from app.services.rl.marl_agent import MARLAgent, MARLAgentConfig

# Configure MARL environment
marl_config = MARLConfig(
    intersection_ids=['intersection_1', 'intersection_2', 'intersection_3'],
    enable_communication=True,
    communication_radius=500.0,  # meters
    shared_reward=True,
    reward_weights={'local': 0.7, 'global': 0.3}
)

# Create environment
marl_env = MARLEnvironment(marl_config)
marl_env.initialize()

# Configure MARL agents
agent_config = MARLAgentConfig(
    shared_learning_rate=0.001,
    enable_experience_sharing=True,
    coordination_mechanism='shared_experience'
)

# Create MARL agent system
marl_agent = MARLAgent(agent_config, marl_env)
```

### Training

```python
from app.services.rl.marl_trainer import MARLTrainer, TrainingConfig

# Configure training
training_config = TrainingConfig(
    num_episodes=1000,
    max_steps_per_episode=3600,
    evaluation_frequency=50,
    save_frequency=50,
    enable_communication=True,
    enable_experience_sharing=True
)

# Create trainer
trainer = MARLTrainer(marl_agent, marl_env, training_config)

# Train with progress callback
def progress_callback(progress):
    print(f"Episode {progress['episode']}/{progress['total_episodes']}")
    print(f"Global Reward: {progress['metrics']['global_reward']:.2f}")

results = trainer.train(progress_callback=progress_callback)
```

### Evaluation

```python
# Evaluate trained agents
eval_results = marl_agent.evaluate(num_episodes=10)

print(f"Average Global Reward: {eval_results['average_global_reward']:.2f}")
print(f"Average Queue Length: {eval_results['average_queue_length']:.1f}")
print(f"Average Delay: {eval_results['average_delay']:.1f}")
print(f"Network Efficiency: {eval_results['average_network_efficiency']:.3f}")
```

### Getting Agent Information

```python
# Get information about specific agent
agent_info = marl_agent.get_agent_info('intersection_1')

print(f"State Size: {agent_info['state_size']}")
print(f"Action Size: {agent_info['action_size']}")
print(f"Neighbors: {agent_info['neighbors']['count']}")

# Get neighbor details
for neighbor in agent_info['neighbors']['neighbors']:
    print(f"  - {neighbor['id']}: Phase {neighbor['phase']}, Queue {neighbor['queue_length']}")
```

## API Endpoints

### Create MARL System

```http
POST /api/rl/marl/create
Content-Type: application/json

{
  "name": "Georgetown Downtown Network",
  "intersection_ids": ["intersection_1", "intersection_2", "intersection_3"],
  "enable_communication": true,
  "communication_radius": 500.0,
  "shared_reward": true,
  "reward_weights": {"local": 0.7, "global": 0.3},
  "learning_rate": 0.001,
  "enable_experience_sharing": true
}
```

### Train MARL System

```http
POST /api/rl/marl/train
Content-Type: application/json

{
  "marl_id": "uuid-here",
  "network_file": "data/georgetown_network.net.xml",
  "route_file": "data/georgetown_routes.rou.xml",
  "num_episodes": 100,
  "max_steps_per_episode": 3600,
  "evaluation_frequency": 50,
  "save_frequency": 10
}
```

### Get Training Status

```http
GET /api/rl/marl/train/status/{job_id}
```

### Evaluate MARL System

```http
POST /api/rl/marl/evaluate
Content-Type: application/json

{
  "marl_id": "uuid-here",
  "network_file": "data/georgetown_network.net.xml",
  "route_file": "data/georgetown_routes.rou.xml",
  "num_episodes": 10
}
```

### List MARL Systems

```http
GET /api/rl/marl/systems
```

### Get Agent Information

```http
GET /api/rl/marl/systems/{marl_id}/agents
```

## Coordination Metrics

The system tracks several metrics to measure coordination effectiveness:

### 1. Synchronization Score
Measures how well agents coordinate their actions (lower variance in rewards indicates better synchronization)

```python
synchronization_score = 1.0 / (1.0 + reward_variance / |reward_mean|)
```

### 2. Communication Efficiency
Based on network-wide efficiency metric (throughput vs delay/queue)

```python
communication_efficiency = throughput / (delay + queue * 0.1)
```

### 3. Global vs Local Reward Ratio
Indicates balance between local and global optimization

```python
global_local_ratio = global_reward / sum(local_rewards)
```

### 4. Neighbor Correlation
Measures coordination strength between neighboring agents

## Performance Expectations

Based on requirements 6.1-6.4:

- **Network Throughput**: 15-25% improvement over independent agents
- **Queue Reduction**: 20-30% reduction in average queue lengths
- **Delay Reduction**: 25-34% reduction in average delay per vehicle
- **Coordination Efficiency**: Synchronization score > 0.7 indicates good coordination

## Visualization

The frontend provides three visualization modes:

### 1. Network View
- Interactive graph showing agent connections
- Visual representation of neighbor relationships
- Real-time queue length indicators
- Agent selection for detailed information

### 2. Timeline View
- Signal phase coordination over time
- Green wave visualization
- Upstream/downstream effects
- Phase synchronization patterns

### 3. Metrics View
- Network-wide performance metrics
- Individual agent performance
- Coordination effectiveness metrics
- Traffic flow effects diagram

## Configuration Options

### Environment Configuration

```python
MARLConfig(
    intersection_ids: List[str],           # List of intersection IDs
    enable_communication: bool = True,     # Enable neighbor communication
    communication_radius: float = 500.0,   # Communication radius (meters)
    shared_reward: bool = True,            # Use shared reward components
    reward_weights: Dict = {               # Reward component weights
        'local': 0.7,
        'global': 0.3
    }
)
```

### Agent Configuration

```python
MARLAgentConfig(
    agent_configs: Dict = {},                    # Per-agent configurations
    shared_learning_rate: float = 0.001,         # Learning rate
    shared_gamma: float = 0.99,                  # Discount factor
    enable_experience_sharing: bool = True,      # Share experiences
    shared_buffer_size: int = 50000,             # Shared buffer capacity
    coordination_mechanism: str = 'independent'  # Coordination strategy
)
```

### Training Configuration

```python
TrainingConfig(
    num_episodes: int = 1000,                    # Training episodes
    max_steps_per_episode: int = 3600,           # Max steps per episode
    evaluation_frequency: int = 50,              # Evaluation interval
    save_frequency: int = 50,                    # Checkpoint interval
    early_stopping_patience: int = 100,          # Early stopping patience
    enable_communication: bool = True,           # Enable communication
    enable_experience_sharing: bool = True,      # Enable experience sharing
    track_coordination_metrics: bool = True      # Track coordination metrics
)
```

## Best Practices

1. **Start with 2-3 agents**: Test coordination with small networks before scaling
2. **Tune reward weights**: Balance local (0.6-0.8) and global (0.2-0.4) components
3. **Set appropriate communication radius**: 300-800m for urban intersections
4. **Monitor coordination metrics**: Ensure synchronization score improves during training
5. **Use experience sharing**: Accelerates learning in coordinated scenarios
6. **Evaluate regularly**: Check both individual and global performance

## Troubleshooting

### Poor Coordination
- Increase global reward weight
- Reduce communication radius to focus on nearby neighbors
- Enable experience sharing
- Increase training episodes

### Slow Convergence
- Increase learning rate (0.001-0.005)
- Enable experience sharing
- Use larger replay buffer
- Reduce number of agents initially

### Unstable Training
- Decrease learning rate
- Increase target network update frequency
- Use gradient clipping (already implemented)
- Reduce epsilon decay rate

## References

- Requirements: 6.1, 6.2, 6.3, 6.4
- Design: Multi-Agent Coordination section
- Related: DQN Agent (single-agent baseline)
