"""
Deep Q-Network (DQN) neural network architecture and experience replay buffer
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from collections import deque, namedtuple
import random


# Experience tuple for replay buffer
Experience = namedtuple('Experience', ['state', 'action', 'reward', 'next_state', 'done'])


class DQNNetwork(nn.Module):
    """
    Deep Q-Network that maps states to Q-values for each action.
    
    Architecture:
    - Input layer: state_size
    - Hidden layer 1: 128 neurons with ReLU
    - Hidden layer 2: 128 neurons with ReLU
    - Output layer: action_size (Q-values for each action)
    """
    
    def __init__(self, state_size: int, action_size: int, hidden_size: int = 128):
        """
        Initialize DQN network.
        
        Args:
            state_size: Dimension of state space
            action_size: Number of possible actions
            hidden_size: Number of neurons in hidden layers
        """
        super(DQNNetwork, self).__init__()
        
        self.state_size = state_size
        self.action_size = action_size
        
        # Network layers
        self.fc1 = nn.Linear(state_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size)
        self.fc3 = nn.Linear(hidden_size, action_size)
        
    def forward(self, state):
        """
        Forward pass through the network.
        
        Args:
            state: Input state tensor
            
        Returns:
            Q-values for each action
        """
        x = F.relu(self.fc1(state))
        x = F.relu(self.fc2(x))
        q_values = self.fc3(x)
        return q_values
    
    def get_action(self, state, epsilon: float = 0.0):
        """
        Select action using epsilon-greedy policy.
        
        Args:
            state: Current state
            epsilon: Exploration rate (0 = greedy, 1 = random)
            
        Returns:
            Selected action index
        """
        if random.random() < epsilon:
            # Explore: random action
            return random.randrange(self.action_size)
        else:
            # Exploit: greedy action
            with torch.no_grad():
                state_tensor = torch.FloatTensor(state).unsqueeze(0)
                q_values = self.forward(state_tensor)
                return q_values.argmax().item()


class ReplayBuffer:
    """
    Experience replay buffer for storing and sampling transitions.
    
    Stores experiences as (state, action, reward, next_state, done) tuples
    and provides random sampling for training.
    """
    
    def __init__(self, capacity: int = 10000):
        """
        Initialize replay buffer.
        
        Args:
            capacity: Maximum number of experiences to store
        """
        self.buffer = deque(maxlen=capacity)
        self.capacity = capacity
        
    def push(self, state, action, reward, next_state, done):
        """
        Add experience to buffer.
        
        Args:
            state: Current state
            action: Action taken
            reward: Reward received
            next_state: Next state
            done: Whether episode ended
        """
        experience = Experience(state, action, reward, next_state, done)
        self.buffer.append(experience)
        
    def sample(self, batch_size: int):
        """
        Sample random batch of experiences.
        
        Args:
            batch_size: Number of experiences to sample
            
        Returns:
            Tuple of (states, actions, rewards, next_states, dones) as numpy arrays
        """
        experiences = random.sample(self.buffer, batch_size)
        
        states = np.array([e.state for e in experiences])
        actions = np.array([e.action for e in experiences])
        rewards = np.array([e.reward for e in experiences])
        next_states = np.array([e.next_state for e in experiences])
        dones = np.array([e.done for e in experiences])
        
        return states, actions, rewards, next_states, dones
    
    def __len__(self):
        """Return current size of buffer."""
        return len(self.buffer)
    
    def clear(self):
        """Clear all experiences from buffer."""
        self.buffer.clear()


class TargetNetwork:
    """
    Target network wrapper for stable Q-learning.
    
    Maintains a separate target network that is updated periodically
    to provide stable target Q-values during training.
    """
    
    def __init__(self, network: DQNNetwork):
        """
        Initialize target network as copy of main network.
        
        Args:
            network: Main DQN network to copy
        """
        self.network = type(network)(
            network.state_size,
            network.action_size,
            network.fc1.out_features
        )
        self.update(network)
        self.network.eval()  # Set to evaluation mode
        
    def update(self, source_network: DQNNetwork):
        """
        Update target network weights from source network.
        
        Args:
            source_network: Network to copy weights from
        """
        self.network.load_state_dict(source_network.state_dict())
        
    def soft_update(self, source_network: DQNNetwork, tau: float = 0.001):
        """
        Soft update target network weights (Polyak averaging).
        
        target_weights = tau * source_weights + (1 - tau) * target_weights
        
        Args:
            source_network: Network to copy weights from
            tau: Interpolation parameter (0 = no update, 1 = full copy)
        """
        for target_param, source_param in zip(
            self.network.parameters(),
            source_network.parameters()
        ):
            target_param.data.copy_(
                tau * source_param.data + (1.0 - tau) * target_param.data
            )
    
    def __call__(self, state):
        """Forward pass through target network."""
        return self.network(state)
