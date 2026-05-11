"""
Multi-Agent Reinforcement Learning (MARL) agent for coordinated traffic signal control.

This module implements independent learning with coordination mechanisms
for multiple intersection agents.
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

from app.services.rl.dqn_network import DQNNetwork, ReplayBuffer, TargetNetwork
from app.services.rl.marl_environment import MARLEnvironment, MARLConfig

logger = logging.getLogger(__name__)


@dataclass
class MARLAgentConfig:
    """Configuration for MARL agent system"""
    # Agent configurations (per agent)
    agent_configs: Dict[str, Dict] = field(default_factory=dict)
    
    # Shared learning parameters
    shared_learning_rate: float = 0.001
    shared_gamma: float = 0.99
    
    # Experience sharing
    enable_experience_sharing: bool = True
    shared_buffer_size: int = 50000
    
    # Coordination
    coordination_mechanism: str = "independent"  # "independent", "shared_experience", "communication"
    
    # Training
    max_episodes: int = 1000
    max_steps_per_episode: int = 3600
    
    # Checkpointing
    save_frequency: int = 50
    checkpoint_dir: str = "models/rl/marl"
    
    def to_dict(self) -> Dict:
        """Convert config to dictionary"""
        return {
            "agent_configs": self.agent_configs,
            "shared_learning_rate": self.shared_learning_rate,
            "shared_gamma": self.shared_gamma,
            "enable_experience_sharing": self.enable_experience_sharing,
            "coordination_mechanism": self.coordination_mechanism
        }


@dataclass
class MARLTrainingMetrics:
    """Metrics tracked during MARL training"""
    episode: int
    agent_rewards: Dict[str, float]
    global_reward: float
    average_queue: float
    average_delay: float
    network_efficiency: float
    epsilon: float
    losses: Dict[str, float]
    steps: int
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "episode": self.episode,
            "agent_rewards": self.agent_rewards,
            "global_reward": self.global_reward,
            "average_queue": self.average_queue,
            "average_delay": self.average_delay,
            "network_efficiency": self.network_efficiency,
            "epsilon": self.epsilon,
            "losses": self.losses,
            "steps": self.steps
        }


class MARLAgent:
    """
    Multi-Agent RL system for coordinated traffic signal control.
    
    Features:
    - Independent DQN agents for each intersection
    - Optional experience sharing between agents
    - Coordination through neighbor state observation
    - Global and local performance tracking
    """
    
    def __init__(
        self,
        config: MARLAgentConfig,
        marl_env: MARLEnvironment,
        device: Optional[str] = None
    ):
        """
        Initialize MARL agent system.
        
        Args:
            config: MARL agent configuration
            marl_env: MARL environment
            device: Device to use ('cuda' or 'cpu')
        """
        self.config = config
        self.marl_env = marl_env
        
        # Set device
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        
        logger.info(f"Using device: {self.device}")
        
        # Create individual agents
        self.agents: Dict[str, Dict] = {}
        self._initialize_agents()
        
        # Shared experience replay buffer (if enabled)
        if config.enable_experience_sharing:
            self.shared_buffer = ReplayBuffer(config.shared_buffer_size)
        else:
            self.shared_buffer = None
        
        # Training state
        self.epsilon = 1.0
        self.epsilon_decay = 0.995
        self.epsilon_min = 0.01
        self.total_steps = 0
        self.episode_count = 0
        
        # Metrics tracking
        self.training_metrics: List[MARLTrainingMetrics] = []
        self.best_global_reward = float('-inf')
        
        # Create checkpoint directory
        os.makedirs(config.checkpoint_dir, exist_ok=True)
        
        logger.info(
            f"Initialized MARL agent system with {len(self.agents)} agents"
        )
    
    def _initialize_agents(self):
        """Initialize individual DQN agents for each intersection."""
        for agent_id in self.marl_env.intersection_ids:
            # Get state and action sizes
            state_size = self.marl_env.get_state_size(agent_id)
            action_size = self.marl_env.get_action_size(agent_id)
            
            # Get agent-specific config or use defaults
            agent_config = self.config.agent_configs.get(agent_id, {})
            hidden_size = agent_config.get("hidden_size", 128)
            learning_rate = agent_config.get("learning_rate", self.config.shared_learning_rate)
            
            # Create policy and target networks
            policy_net = DQNNetwork(state_size, action_size, hidden_size).to(self.device)
            target_net = TargetNetwork(policy_net)
            target_net.network.to(self.device)
            
            # Create optimizer
            optimizer = optim.Adam(policy_net.parameters(), lr=learning_rate)
            
            # Create individual replay buffer
            replay_buffer = ReplayBuffer(10000)
            
            # Store agent components
            self.agents[agent_id] = {
                "policy_net": policy_net,
                "target_net": target_net,
                "optimizer": optimizer,
                "replay_buffer": replay_buffer,
                "state_size": state_size,
                "action_size": action_size,
                "total_reward": 0.0,
                "episode_count": 0
            }
            
            logger.info(
                f"Initialized agent {agent_id}: "
                f"state_size={state_size}, action_size={action_size}"
            )
    
    def select_actions(
        self,
        states: Dict[str, np.ndarray],
        training: bool = True
    ) -> Dict[str, int]:
        """
        Select actions for all agents using epsilon-greedy policy.
        
        Args:
            states: Dictionary mapping agent IDs to states
            training: Whether in training mode
            
        Returns:
            Dictionary mapping agent IDs to actions
        """
        actions = {}
        
        for agent_id, state in states.items():
            if agent_id not in self.agents:
                continue
            
            agent = self.agents[agent_id]
            
            if training and np.random.random() < self.epsilon:
                # Explore: random action
                action = np.random.randint(agent["action_size"])
            else:
                # Exploit: greedy action
                with torch.no_grad():
                    state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
                    q_values = agent["policy_net"](state_tensor)
                    action = q_values.argmax().item()
            
            actions[agent_id] = action
        
        return actions
    
    def store_experiences(
        self,
        states: Dict[str, np.ndarray],
        actions: Dict[str, int],
        rewards: Dict[str, float],
        next_states: Dict[str, np.ndarray],
        dones: Dict[str, bool]
    ):
        """
        Store experiences for all agents.
        
        Args:
            states: Dictionary of states
            actions: Dictionary of actions
            rewards: Dictionary of rewards
            next_states: Dictionary of next states
            dones: Dictionary of done flags
        """
        for agent_id in self.agents.keys():
            if agent_id not in states:
                continue
            
            # Store in individual buffer
            self.agents[agent_id]["replay_buffer"].push(
                states[agent_id],
                actions[agent_id],
                rewards[agent_id],
                next_states[agent_id],
                dones[agent_id]
            )
            
            # Store in shared buffer if enabled
            if self.shared_buffer is not None:
                self.shared_buffer.push(
                    states[agent_id],
                    actions[agent_id],
                    rewards[agent_id],
                    next_states[agent_id],
                    dones[agent_id]
                )
    
    def train_step(self, batch_size: int = 64) -> Dict[str, Optional[float]]:
        """
        Perform one training step for all agents.
        
        Args:
            batch_size: Training batch size
            
        Returns:
            Dictionary mapping agent IDs to loss values
        """
        losses = {}
        
        for agent_id, agent in self.agents.items():
            # Choose buffer based on coordination mechanism
            if self.config.coordination_mechanism == "shared_experience" and self.shared_buffer:
                buffer = self.shared_buffer
            else:
                buffer = agent["replay_buffer"]
            
            # Check if enough experiences
            if len(buffer) < 1000:
                losses[agent_id] = None
                continue
            
            # Sample batch
            states, actions, rewards, next_states, dones = buffer.sample(batch_size)
            
            # Convert to tensors
            states = torch.FloatTensor(states).to(self.device)
            actions = torch.LongTensor(actions).to(self.device)
            rewards = torch.FloatTensor(rewards).to(self.device)
            next_states = torch.FloatTensor(next_states).to(self.device)
            dones = torch.FloatTensor(dones).to(self.device)
            
            # Compute current Q-values
            current_q_values = agent["policy_net"](states).gather(1, actions.unsqueeze(1))
            
            # Compute target Q-values
            with torch.no_grad():
                next_q_values = agent["target_net"](next_states).max(1)[0]
                target_q_values = rewards + (1 - dones) * self.config.shared_gamma * next_q_values
            
            # Compute loss
            criterion = nn.MSELoss()
            loss = criterion(current_q_values.squeeze(), target_q_values)
            
            # Optimize
            agent["optimizer"].zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(agent["policy_net"].parameters(), 1.0)
            agent["optimizer"].step()
            
            losses[agent_id] = loss.item()
        
        return losses
    
    def update_target_networks(self, tau: float = 0.001):
        """
        Update target networks for all agents.
        
        Args:
            tau: Soft update parameter
        """
        for agent in self.agents.values():
            agent["target_net"].soft_update(agent["policy_net"], tau)
    
    def decay_epsilon(self):
        """Decay exploration rate."""
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
    
    def train_episode(
        self,
        max_steps: Optional[int] = None
    ) -> MARLTrainingMetrics:
        """
        Train all agents for one episode.
        
        Args:
            max_steps: Maximum steps per episode
            
        Returns:
            Training metrics for the episode
        """
        if max_steps is None:
            max_steps = self.config.max_steps_per_episode
        
        # Reset environment
        states = self.marl_env.reset()
        
        episode_rewards = {agent_id: 0.0 for agent_id in self.agents.keys()}
        episode_losses = {agent_id: 0.0 for agent_id in self.agents.keys()}
        loss_counts = {agent_id: 0 for agent_id in self.agents.keys()}
        
        for step in range(max_steps):
            # Select actions for all agents
            actions = self.select_actions(states, training=True)
            
            # Execute actions
            next_states, rewards, dones, infos = self.marl_env.step(actions)
            
            # Store experiences
            self.store_experiences(states, actions, rewards, next_states, dones)
            
            # Train all agents
            losses = self.train_step()
            for agent_id, loss in losses.items():
                if loss is not None:
                    episode_losses[agent_id] += loss
                    loss_counts[agent_id] += 1
            
            # Update target networks periodically
            self.total_steps += 1
            if self.total_steps % 100 == 0:
                self.update_target_networks()
            
            # Update states and rewards
            states = next_states
            for agent_id, reward in rewards.items():
                episode_rewards[agent_id] += reward
            
            # Check if any agent is done
            if any(dones.values()):
                break
        
        # Decay epsilon
        self.decay_epsilon()
        self.episode_count += 1
        
        # Get episode metrics
        env_metrics = self.marl_env.get_episode_metrics()
        global_metrics = env_metrics.get("global", {})
        
        # Calculate average losses
        avg_losses = {}
        for agent_id in self.agents.keys():
            if loss_counts[agent_id] > 0:
                avg_losses[agent_id] = episode_losses[agent_id] / loss_counts[agent_id]
            else:
                avg_losses[agent_id] = 0.0
        
        # Create training metrics
        global_reward = sum(episode_rewards.values())
        
        metrics = MARLTrainingMetrics(
            episode=self.episode_count,
            agent_rewards=episode_rewards,
            global_reward=global_reward,
            average_queue=global_metrics.get("total_queue", 0),
            average_delay=global_metrics.get("total_delay", 0),
            network_efficiency=global_metrics.get("network_efficiency", 0),
            epsilon=self.epsilon,
            losses=avg_losses,
            steps=step + 1
        )
        
        self.training_metrics.append(metrics)
        
        # Update best reward
        if global_reward > self.best_global_reward:
            self.best_global_reward = global_reward
        
        logger.info(
            f"Episode {self.episode_count}: "
            f"global_reward={global_reward:.2f}, "
            f"avg_queue={metrics.average_queue:.1f}, "
            f"avg_delay={metrics.average_delay:.1f}, "
            f"efficiency={metrics.network_efficiency:.3f}, "
            f"epsilon={self.epsilon:.3f}"
        )
        
        return metrics
    
    def train(
        self,
        num_episodes: Optional[int] = None,
        callback: Optional[callable] = None
    ) -> List[MARLTrainingMetrics]:
        """
        Train all agents for multiple episodes.
        
        Args:
            num_episodes: Number of episodes to train
            callback: Optional callback function
            
        Returns:
            List of training metrics
        """
        if num_episodes is None:
            num_episodes = self.config.max_episodes
        
        logger.info(f"Starting MARL training for {num_episodes} episodes")
        
        for episode in range(num_episodes):
            # Train one episode
            metrics = self.train_episode()
            
            # Save checkpoint periodically
            if (episode + 1) % self.config.save_frequency == 0:
                self.save_checkpoint(f"checkpoint_ep{episode + 1}.pt")
            
            # Call callback if provided
            if callback:
                callback(metrics)
        
        # Save final model
        self.save_checkpoint("final_model.pt")
        
        logger.info(
            f"MARL training completed: {num_episodes} episodes, "
            f"best_global_reward={self.best_global_reward:.2f}"
        )
        
        return self.training_metrics
    
    def evaluate(self, num_episodes: int = 10) -> Dict:
        """
        Evaluate trained MARL agents.
        
        Args:
            num_episodes: Number of evaluation episodes
            
        Returns:
            Dictionary with evaluation metrics
        """
        logger.info(f"Evaluating MARL agents for {num_episodes} episodes")
        
        episode_rewards = []
        episode_queues = []
        episode_delays = []
        episode_efficiencies = []
        
        for episode in range(num_episodes):
            states = self.marl_env.reset()
            episode_reward = 0.0
            
            for step in range(self.config.max_steps_per_episode):
                # Select actions (greedy, no exploration)
                actions = self.select_actions(states, training=False)
                
                # Execute actions
                next_states, rewards, dones, infos = self.marl_env.step(actions)
                
                episode_reward += sum(rewards.values())
                states = next_states
                
                if any(dones.values()):
                    break
            
            # Get episode metrics
            env_metrics = self.marl_env.get_episode_metrics()
            global_metrics = env_metrics.get("global", {})
            
            episode_rewards.append(episode_reward)
            episode_queues.append(global_metrics.get("total_queue", 0))
            episode_delays.append(global_metrics.get("total_delay", 0))
            episode_efficiencies.append(global_metrics.get("network_efficiency", 0))
        
        # Calculate statistics
        eval_metrics = {
            "num_episodes": num_episodes,
            "average_global_reward": np.mean(episode_rewards),
            "std_global_reward": np.std(episode_rewards),
            "average_queue_length": np.mean(episode_queues),
            "average_delay": np.mean(episode_delays),
            "average_network_efficiency": np.mean(episode_efficiencies),
            "min_reward": np.min(episode_rewards),
            "max_reward": np.max(episode_rewards)
        }
        
        logger.info(
            f"MARL evaluation results: "
            f"avg_reward={eval_metrics['average_global_reward']:.2f}, "
            f"avg_queue={eval_metrics['average_queue_length']:.1f}, "
            f"avg_delay={eval_metrics['average_delay']:.1f}, "
            f"efficiency={eval_metrics['average_network_efficiency']:.3f}"
        )
        
        return eval_metrics
    
    def save_checkpoint(self, filename: str):
        """
        Save MARL checkpoint.
        
        Args:
            filename: Checkpoint filename
        """
        filepath = os.path.join(self.config.checkpoint_dir, filename)
        
        # Save all agent networks
        agent_states = {}
        for agent_id, agent in self.agents.items():
            agent_states[agent_id] = {
                "policy_net_state_dict": agent["policy_net"].state_dict(),
                "target_net_state_dict": agent["target_net"].network.state_dict(),
                "optimizer_state_dict": agent["optimizer"].state_dict()
            }
        
        checkpoint = {
            "agent_states": agent_states,
            "config": self.config.to_dict(),
            "epsilon": self.epsilon,
            "total_steps": self.total_steps,
            "episode_count": self.episode_count,
            "best_global_reward": self.best_global_reward,
            "training_metrics": [m.to_dict() for m in self.training_metrics]
        }
        
        torch.save(checkpoint, filepath)
        logger.info(f"Saved MARL checkpoint to {filepath}")
    
    def load_checkpoint(self, filepath: str):
        """
        Load MARL checkpoint.
        
        Args:
            filepath: Path to checkpoint file
        """
        checkpoint = torch.load(filepath, map_location=self.device)
        
        # Load agent states
        agent_states = checkpoint["agent_states"]
        for agent_id, agent in self.agents.items():
            if agent_id in agent_states:
                agent["policy_net"].load_state_dict(
                    agent_states[agent_id]["policy_net_state_dict"]
                )
                agent["target_net"].network.load_state_dict(
                    agent_states[agent_id]["target_net_state_dict"]
                )
                agent["optimizer"].load_state_dict(
                    agent_states[agent_id]["optimizer_state_dict"]
                )
        
        self.epsilon = checkpoint["epsilon"]
        self.total_steps = checkpoint["total_steps"]
        self.episode_count = checkpoint["episode_count"]
        self.best_global_reward = checkpoint["best_global_reward"]
        
        # Restore training metrics
        self.training_metrics = [
            MARLTrainingMetrics(**m) for m in checkpoint["training_metrics"]
        ]
        
        logger.info(f"Loaded MARL checkpoint from {filepath}")
    
    def get_training_history(self) -> List[Dict]:
        """Get training history as list of dictionaries."""
        return [m.to_dict() for m in self.training_metrics]
    
    def get_agent_info(self, agent_id: str) -> Dict:
        """
        Get information about a specific agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Dictionary with agent information
        """
        if agent_id not in self.agents:
            return {}
        
        agent = self.agents[agent_id]
        neighbor_info = self.marl_env.get_neighbor_info(agent_id)
        
        return {
            "agent_id": agent_id,
            "state_size": agent["state_size"],
            "action_size": agent["action_size"],
            "total_reward": agent["total_reward"],
            "neighbors": neighbor_info
        }
