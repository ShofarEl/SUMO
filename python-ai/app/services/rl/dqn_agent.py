"""
DQN Agent for traffic signal control with training algorithm.
"""
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import os
import json
from pathlib import Path

from app.services.rl.dqn_network import DQNNetwork, ReplayBuffer, TargetNetwork
from app.services.rl.sumo_environment import SUMOTrafficEnvironment, EnvironmentConfig

logger = logging.getLogger(__name__)


@dataclass
class DQNConfig:
    """Configuration for DQN agent"""
    # Network architecture
    state_size: int
    action_size: int
    hidden_size: int = 128
    
    # Training hyperparameters
    learning_rate: float = 0.001
    gamma: float = 0.99  # Discount factor
    epsilon_start: float = 1.0  # Initial exploration rate
    epsilon_end: float = 0.01  # Final exploration rate
    epsilon_decay: float = 0.995  # Epsilon decay rate
    
    # Experience replay
    replay_buffer_size: int = 10000
    batch_size: int = 64
    min_replay_size: int = 1000  # Minimum experiences before training
    
    # Target network
    target_update_frequency: int = 100  # Steps between target network updates
    soft_update: bool = False  # Use soft updates instead of hard updates
    tau: float = 0.001  # Soft update parameter
    
    # Training
    max_episodes: int = 1000
    max_steps_per_episode: int = 3600  # 1 hour simulation
    
    # Checkpointing
    save_frequency: int = 50  # Episodes between model saves
    checkpoint_dir: str = "models/rl/dqn"
    
    def to_dict(self) -> Dict:
        """Convert config to dictionary"""
        return {
            "state_size": self.state_size,
            "action_size": self.action_size,
            "hidden_size": self.hidden_size,
            "learning_rate": self.learning_rate,
            "gamma": self.gamma,
            "epsilon_start": self.epsilon_start,
            "epsilon_end": self.epsilon_end,
            "epsilon_decay": self.epsilon_decay,
            "replay_buffer_size": self.replay_buffer_size,
            "batch_size": self.batch_size,
            "target_update_frequency": self.target_update_frequency,
            "soft_update": self.soft_update,
            "tau": self.tau
        }


@dataclass
class TrainingMetrics:
    """Metrics tracked during training"""
    episode: int
    total_reward: float
    average_reward: float
    epsilon: float
    loss: float
    average_queue: float
    average_delay: float
    steps: int
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "episode": self.episode,
            "total_reward": self.total_reward,
            "average_reward": self.average_reward,
            "epsilon": self.epsilon,
            "loss": self.loss,
            "average_queue": self.average_queue,
            "average_delay": self.average_delay,
            "steps": self.steps
        }


class DQNAgent:
    """
    Deep Q-Network agent for traffic signal control.
    
    Implements DQN algorithm with:
    - Experience replay
    - Target network
    - Epsilon-greedy exploration
    - Periodic target network updates
    """
    
    def __init__(self, config: DQNConfig, device: Optional[str] = None):
        """
        Initialize DQN agent.
        
        Args:
            config: Agent configuration
            device: Device to use ('cuda' or 'cpu')
        """
        self.config = config
        
        # Set device
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        
        logger.info(f"Using device: {self.device}")
        
        # Create networks
        self.policy_net = DQNNetwork(
            config.state_size,
            config.action_size,
            config.hidden_size
        ).to(self.device)
        
        self.target_net = TargetNetwork(self.policy_net)
        self.target_net.network.to(self.device)
        
        # Optimizer and loss
        self.optimizer = optim.Adam(
            self.policy_net.parameters(),
            lr=config.learning_rate
        )
        self.criterion = nn.MSELoss()
        
        # Experience replay buffer
        self.replay_buffer = ReplayBuffer(config.replay_buffer_size)
        
        # Training state
        self.epsilon = config.epsilon_start
        self.total_steps = 0
        self.episode_count = 0
        
        # Metrics tracking
        self.training_metrics: List[TrainingMetrics] = []
        self.best_reward = float('-inf')
        
        # Create checkpoint directory
        os.makedirs(config.checkpoint_dir, exist_ok=True)
        
        logger.info(
            f"Initialized DQN agent: state_size={config.state_size}, "
            f"action_size={config.action_size}, device={self.device}"
        )
    
    def select_action(self, state: np.ndarray, training: bool = True) -> int:
        """
        Select action using epsilon-greedy policy.
        
        Args:
            state: Current state
            training: Whether in training mode (uses epsilon-greedy)
            
        Returns:
            Selected action index
        """
        if training and np.random.random() < self.epsilon:
            # Explore: random action
            return np.random.randint(self.config.action_size)
        else:
            # Exploit: greedy action from policy network
            with torch.no_grad():
                state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
                q_values = self.policy_net(state_tensor)
                return q_values.argmax().item()
    
    def store_experience(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool
    ):
        """
        Store experience in replay buffer.
        
        Args:
            state: Current state
            action: Action taken
            reward: Reward received
            next_state: Next state
            done: Whether episode ended
        """
        self.replay_buffer.push(state, action, reward, next_state, done)
    
    def train_step(self) -> Optional[float]:
        """
        Perform one training step (sample batch and update network).
        
        Returns:
            Loss value if training occurred, None otherwise
        """
        # Check if enough experiences in buffer
        if len(self.replay_buffer) < self.config.min_replay_size:
            return None
        
        # Sample batch from replay buffer
        states, actions, rewards, next_states, dones = self.replay_buffer.sample(
            self.config.batch_size
        )
        
        # Convert to tensors
        states = torch.FloatTensor(states).to(self.device)
        actions = torch.LongTensor(actions).to(self.device)
        rewards = torch.FloatTensor(rewards).to(self.device)
        next_states = torch.FloatTensor(next_states).to(self.device)
        dones = torch.FloatTensor(dones).to(self.device)
        
        # Compute current Q-values
        current_q_values = self.policy_net(states).gather(1, actions.unsqueeze(1))
        
        # Compute target Q-values
        with torch.no_grad():
            next_q_values = self.target_net(next_states).max(1)[0]
            target_q_values = rewards + (1 - dones) * self.config.gamma * next_q_values
        
        # Compute loss (TD error)
        loss = self.criterion(current_q_values.squeeze(), target_q_values)
        
        # Optimize the network
        self.optimizer.zero_grad()
        loss.backward()
        # Gradient clipping for stability
        torch.nn.utils.clip_grad_norm_(self.policy_net.parameters(), 1.0)
        self.optimizer.step()
        
        return loss.item()
    
    def update_target_network(self):
        """Update target network from policy network."""
        if self.config.soft_update:
            # Soft update (Polyak averaging)
            self.target_net.soft_update(self.policy_net, self.config.tau)
        else:
            # Hard update (full copy)
            self.target_net.update(self.policy_net)
    
    def decay_epsilon(self):
        """Decay exploration rate."""
        self.epsilon = max(
            self.config.epsilon_end,
            self.epsilon * self.config.epsilon_decay
        )
    
    def train_episode(
        self,
        env: SUMOTrafficEnvironment,
        max_steps: Optional[int] = None
    ) -> TrainingMetrics:
        """
        Train agent for one episode.
        
        Args:
            env: SUMO traffic environment
            max_steps: Maximum steps per episode
            
        Returns:
            Training metrics for the episode
        """
        if max_steps is None:
            max_steps = self.config.max_steps_per_episode
        
        # Reset environment
        state = env.reset()
        
        episode_reward = 0.0
        episode_loss = 0.0
        loss_count = 0
        
        for step in range(max_steps):
            # Select action
            action = self.select_action(state, training=True)
            
            # Execute action
            next_state, reward, done, info = env.step(action)
            
            # Store experience
            self.store_experience(state, action, reward, next_state, done)
            
            # Train network
            loss = self.train_step()
            if loss is not None:
                episode_loss += loss
                loss_count += 1
            
            # Update target network periodically
            self.total_steps += 1
            if self.total_steps % self.config.target_update_frequency == 0:
                self.update_target_network()
            
            # Update state and reward
            state = next_state
            episode_reward += reward
            
            if done:
                break
        
        # Decay epsilon
        self.decay_epsilon()
        self.episode_count += 1
        
        # Get episode metrics from environment
        env_metrics = env.get_episode_metrics()
        
        # Create training metrics
        metrics = TrainingMetrics(
            episode=self.episode_count,
            total_reward=episode_reward,
            average_reward=episode_reward / (step + 1),
            epsilon=self.epsilon,
            loss=episode_loss / loss_count if loss_count > 0 else 0.0,
            average_queue=env_metrics.get("average_queue_length", 0),
            average_delay=env_metrics.get("average_delay", 0),
            steps=step + 1
        )
        
        self.training_metrics.append(metrics)
        
        # Update best reward
        if episode_reward > self.best_reward:
            self.best_reward = episode_reward
        
        logger.info(
            f"Episode {self.episode_count}: "
            f"reward={episode_reward:.2f}, "
            f"avg_queue={metrics.average_queue:.1f}, "
            f"avg_delay={metrics.average_delay:.1f}, "
            f"epsilon={self.epsilon:.3f}, "
            f"loss={metrics.loss:.4f}"
        )
        
        return metrics
    
    def train(
        self,
        env: SUMOTrafficEnvironment,
        num_episodes: Optional[int] = None,
        callback: Optional[callable] = None
    ) -> List[TrainingMetrics]:
        """
        Train agent for multiple episodes.
        
        Args:
            env: SUMO traffic environment
            num_episodes: Number of episodes to train
            callback: Optional callback function called after each episode
            
        Returns:
            List of training metrics for all episodes
        """
        if num_episodes is None:
            num_episodes = self.config.max_episodes
        
        logger.info(f"Starting training for {num_episodes} episodes")
        
        for episode in range(num_episodes):
            # Train one episode
            metrics = self.train_episode(env)
            
            # Save checkpoint periodically
            if (episode + 1) % self.config.save_frequency == 0:
                self.save_checkpoint(f"checkpoint_ep{episode + 1}.pt")
            
            # Call callback if provided
            if callback:
                callback(metrics)
        
        # Save final model
        self.save_checkpoint("final_model.pt")
        
        logger.info(
            f"Training completed: {num_episodes} episodes, "
            f"best_reward={self.best_reward:.2f}"
        )
        
        return self.training_metrics
    
    def evaluate(
        self,
        env: SUMOTrafficEnvironment,
        num_episodes: int = 10
    ) -> Dict:
        """
        Evaluate trained agent.
        
        Args:
            env: SUMO traffic environment
            num_episodes: Number of evaluation episodes
            
        Returns:
            Dictionary with evaluation metrics
        """
        logger.info(f"Evaluating agent for {num_episodes} episodes")
        
        episode_rewards = []
        episode_queues = []
        episode_delays = []
        
        for episode in range(num_episodes):
            state = env.reset()
            episode_reward = 0.0
            
            for step in range(self.config.max_steps_per_episode):
                # Select action (greedy, no exploration)
                action = self.select_action(state, training=False)
                
                # Execute action
                next_state, reward, done, info = env.step(action)
                
                episode_reward += reward
                state = next_state
                
                if done:
                    break
            
            # Get episode metrics
            env_metrics = env.get_episode_metrics()
            episode_rewards.append(episode_reward)
            episode_queues.append(env_metrics.get("average_queue_length", 0))
            episode_delays.append(env_metrics.get("average_delay", 0))
        
        # Calculate statistics
        eval_metrics = {
            "num_episodes": num_episodes,
            "average_reward": np.mean(episode_rewards),
            "std_reward": np.std(episode_rewards),
            "average_queue_length": np.mean(episode_queues),
            "average_delay": np.mean(episode_delays),
            "min_reward": np.min(episode_rewards),
            "max_reward": np.max(episode_rewards)
        }
        
        logger.info(
            f"Evaluation results: "
            f"avg_reward={eval_metrics['average_reward']:.2f}, "
            f"avg_queue={eval_metrics['average_queue_length']:.1f}, "
            f"avg_delay={eval_metrics['average_delay']:.1f}"
        )
        
        return eval_metrics
    
    def save_checkpoint(self, filename: str):
        """
        Save agent checkpoint.
        
        Args:
            filename: Checkpoint filename
        """
        filepath = os.path.join(self.config.checkpoint_dir, filename)
        
        checkpoint = {
            "policy_net_state_dict": self.policy_net.state_dict(),
            "target_net_state_dict": self.target_net.network.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "config": self.config.to_dict(),
            "epsilon": self.epsilon,
            "total_steps": self.total_steps,
            "episode_count": self.episode_count,
            "best_reward": self.best_reward,
            "training_metrics": [m.to_dict() for m in self.training_metrics]
        }
        
        torch.save(checkpoint, filepath)
        logger.info(f"Saved checkpoint to {filepath}")
    
    def load_checkpoint(self, filepath: str):
        """
        Load agent checkpoint.
        
        Args:
            filepath: Path to checkpoint file
        """
        checkpoint = torch.load(filepath, map_location=self.device)
        
        self.policy_net.load_state_dict(checkpoint["policy_net_state_dict"])
        self.target_net.network.load_state_dict(checkpoint["target_net_state_dict"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        
        self.epsilon = checkpoint["epsilon"]
        self.total_steps = checkpoint["total_steps"]
        self.episode_count = checkpoint["episode_count"]
        self.best_reward = checkpoint["best_reward"]
        
        # Restore training metrics
        self.training_metrics = [
            TrainingMetrics(**m) for m in checkpoint["training_metrics"]
        ]
        
        logger.info(f"Loaded checkpoint from {filepath}")
    
    def save_policy(self, filepath: str):
        """
        Save only the policy network (for deployment).
        
        Args:
            filepath: Path to save policy
        """
        torch.save({
            "state_dict": self.policy_net.state_dict(),
            "config": self.config.to_dict()
        }, filepath)
        logger.info(f"Saved policy to {filepath}")
    
    def load_policy(self, filepath: str):
        """
        Load policy network.
        
        Args:
            filepath: Path to policy file
        """
        checkpoint = torch.load(filepath, map_location=self.device)
        self.policy_net.load_state_dict(checkpoint["state_dict"])
        logger.info(f"Loaded policy from {filepath}")
    
    def get_training_history(self) -> List[Dict]:
        """
        Get training history as list of dictionaries.
        
        Returns:
            List of training metrics dictionaries
        """
        return [m.to_dict() for m in self.training_metrics]
    
    def get_convergence_metrics(self) -> Dict:
        """
        Calculate convergence metrics from training history.
        
        Returns:
            Dictionary with convergence statistics
        """
        if not self.training_metrics:
            return {}
        
        rewards = [m.total_reward for m in self.training_metrics]
        
        # Find convergence point (when reward stabilizes)
        window_size = 10
        if len(rewards) >= window_size:
            moving_avg = np.convolve(
                rewards,
                np.ones(window_size) / window_size,
                mode='valid'
            )
            convergence_episode = len(moving_avg) // 2  # Rough estimate
        else:
            convergence_episode = len(rewards)
        
        return {
            "total_episodes": len(self.training_metrics),
            "convergence_episode": convergence_episode,
            "final_reward": rewards[-1] if rewards else 0,
            "best_reward": self.best_reward,
            "average_reward_last_10": np.mean(rewards[-10:]) if len(rewards) >= 10 else np.mean(rewards)
        }
