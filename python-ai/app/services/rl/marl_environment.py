"""
Multi-Agent Reinforcement Learning (MARL) environment for coordinated traffic signal control.

This module extends the single-agent SUMO environment to support multiple
intersection agents that can observe neighbor states and coordinate actions.
"""
import numpy as np
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
import traci

from app.services.rl.sumo_environment import SUMOTrafficEnvironment, EnvironmentConfig

logger = logging.getLogger(__name__)


@dataclass
class MARLConfig:
    """Configuration for MARL environment"""
    intersection_ids: List[str]
    enable_communication: bool = True
    communication_radius: float = 500.0  # meters
    shared_reward: bool = True
    reward_weights: Dict[str, float] = field(default_factory=lambda: {
        "local": 0.7,
        "global": 0.3
    })
    state_features: List[str] = field(default_factory=lambda: [
        "queue_length",
        "vehicle_arrivals",
        "current_phase",
        "time_since_phase_change",
        "neighbor_phases",
        "neighbor_queues"
    ])


class MARLEnvironment:
    """
    Multi-Agent RL environment for coordinated traffic signal control.
    
    Features:
    - Multiple intersection agents with local observations
    - Neighbor state sharing for coordination
    - Shared and local reward components
    - Communication between nearby intersections
    """
    
    def __init__(
        self,
        config: MARLConfig,
        connection_label: str = "default"
    ):
        """
        Initialize MARL environment.
        
        Args:
            config: MARL configuration
            connection_label: TraCI connection label
        """
        self.config = config
        self.connection_label = connection_label
        self.intersection_ids = config.intersection_ids
        self.num_agents = len(config.intersection_ids)
        
        # Create individual environments for each intersection
        self.agent_environments: Dict[str, SUMOTrafficEnvironment] = {}
        self.agent_configs: Dict[str, EnvironmentConfig] = {}
        
        for intersection_id in config.intersection_ids:
            env_config = EnvironmentConfig(
                intersection_id=intersection_id,
                state_features=config.state_features
            )
            self.agent_configs[intersection_id] = env_config
            self.agent_environments[intersection_id] = SUMOTrafficEnvironment(
                env_config,
                connection_label
            )
        
        # Neighbor relationships (adjacency)
        self.neighbors: Dict[str, List[str]] = {}
        
        # Global metrics tracking
        self.global_metrics = {
            "total_queue": 0,
            "total_delay": 0,
            "total_throughput": 0,
            "network_efficiency": 0.0
        }
        
        # Episode tracking
        self.current_step = 0
        self.episode_rewards: Dict[str, float] = {
            agent_id: 0.0 for agent_id in self.intersection_ids
        }
        
        logger.info(
            f"Initialized MARL environment with {self.num_agents} agents: "
            f"{', '.join(self.intersection_ids)}"
        )
    
    def initialize(self):
        """Initialize all agent environments and compute neighbor relationships."""
        try:
            # Initialize each agent environment
            for agent_id, env in self.agent_environments.items():
                env.initialize()
            
            # Compute neighbor relationships based on distance
            self._compute_neighbors()
            
            logger.info(
                f"MARL environment initialized: {self.num_agents} agents, "
                f"neighbor relationships computed"
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize MARL environment: {e}")
            raise
    
    def _compute_neighbors(self):
        """
        Compute neighbor relationships between intersections based on distance.
        
        Two intersections are neighbors if they are within communication_radius.
        """
        try:
            # Get intersection positions
            positions = {}
            for intersection_id in self.intersection_ids:
                if intersection_id in traci.trafficlight.getIDList():
                    # Get position from controlled lanes
                    controlled_lanes = traci.trafficlight.getControlledLanes(intersection_id)
                    if controlled_lanes:
                        # Use first lane position as intersection position
                        lane_shape = traci.lane.getShape(controlled_lanes[0])
                        if lane_shape:
                            positions[intersection_id] = lane_shape[0]  # First point
            
            # Compute neighbors based on distance
            for agent_id in self.intersection_ids:
                self.neighbors[agent_id] = []
                
                if agent_id not in positions:
                    continue
                
                agent_pos = positions[agent_id]
                
                for other_id in self.intersection_ids:
                    if other_id == agent_id or other_id not in positions:
                        continue
                    
                    other_pos = positions[other_id]
                    
                    # Calculate Euclidean distance
                    distance = np.sqrt(
                        (agent_pos[0] - other_pos[0])**2 +
                        (agent_pos[1] - other_pos[1])**2
                    )
                    
                    if distance <= self.config.communication_radius:
                        self.neighbors[agent_id].append(other_id)
            
            # Log neighbor relationships
            for agent_id, neighbor_list in self.neighbors.items():
                logger.info(
                    f"Agent {agent_id} has {len(neighbor_list)} neighbors: "
                    f"{', '.join(neighbor_list) if neighbor_list else 'none'}"
                )
            
        except Exception as e:
            logger.error(f"Error computing neighbors: {e}")
            # Initialize empty neighbor lists
            for agent_id in self.intersection_ids:
                self.neighbors[agent_id] = []
    
    def reset(self) -> Dict[str, np.ndarray]:
        """
        Reset all agent environments.
        
        Returns:
            Dictionary mapping agent IDs to initial state observations
        """
        self.current_step = 0
        self.episode_rewards = {agent_id: 0.0 for agent_id in self.intersection_ids}
        
        # Reset each agent environment
        states = {}
        for agent_id, env in self.agent_environments.items():
            local_state = env.reset()
            # Augment with neighbor information
            states[agent_id] = self._augment_state_with_neighbors(agent_id, local_state)
        
        logger.debug(f"MARL environment reset: {self.num_agents} agents")
        return states
    
    def step(
        self,
        actions: Dict[str, int]
    ) -> Tuple[Dict[str, np.ndarray], Dict[str, float], Dict[str, bool], Dict[str, Dict]]:
        """
        Execute one environment step for all agents.
        
        Args:
            actions: Dictionary mapping agent IDs to actions
            
        Returns:
            Tuple of (next_states, rewards, dones, infos) as dictionaries
        """
        self.current_step += 1
        
        # Execute actions for all agents
        next_states = {}
        local_rewards = {}
        dones = {}
        infos = {}
        
        for agent_id, action in actions.items():
            if agent_id not in self.agent_environments:
                continue
            
            env = self.agent_environments[agent_id]
            local_state, local_reward, done, info = env.step(action)
            
            # Augment state with neighbor information
            next_states[agent_id] = self._augment_state_with_neighbors(agent_id, local_state)
            local_rewards[agent_id] = local_reward
            dones[agent_id] = done
            infos[agent_id] = info
        
        # Calculate global metrics
        self._update_global_metrics()
        
        # Calculate final rewards (local + global components)
        rewards = self._calculate_coordinated_rewards(local_rewards)
        
        # Update episode rewards
        for agent_id, reward in rewards.items():
            self.episode_rewards[agent_id] += reward
        
        # Add global metrics to infos
        for agent_id in infos:
            infos[agent_id]["global_metrics"] = self.global_metrics.copy()
        
        return next_states, rewards, dones, infos
    
    def _augment_state_with_neighbors(
        self,
        agent_id: str,
        local_state: np.ndarray
    ) -> np.ndarray:
        """
        Augment agent's local state with neighbor information.
        
        Args:
            agent_id: Agent ID
            local_state: Agent's local state observation
            
        Returns:
            Augmented state with neighbor information
        """
        if not self.config.enable_communication:
            return local_state
        
        # Get neighbor states
        neighbor_features = []
        
        for neighbor_id in self.neighbors.get(agent_id, []):
            if neighbor_id in self.agent_environments:
                neighbor_env = self.agent_environments[neighbor_id]
                
                # Get neighbor's current phase
                neighbor_phase = neighbor_env.current_phase
                neighbor_features.append(neighbor_phase)
                
                # Get neighbor's queue length
                neighbor_queue = neighbor_env._get_total_queue_length()
                neighbor_features.append(neighbor_queue)
        
        # Pad neighbor features if fewer neighbors than max
        max_neighbors = 4  # Assume max 4 neighbors
        while len(neighbor_features) < max_neighbors * 2:
            neighbor_features.append(0)
        
        # Truncate if more neighbors
        neighbor_features = neighbor_features[:max_neighbors * 2]
        
        # Concatenate local state with neighbor features
        augmented_state = np.concatenate([
            local_state,
            np.array(neighbor_features, dtype=np.float32)
        ])
        
        return augmented_state
    
    def _update_global_metrics(self):
        """Update global network-wide metrics."""
        total_queue = 0
        total_delay = 0
        total_throughput = 0
        
        for env in self.agent_environments.values():
            total_queue += env._get_total_queue_length()
            total_delay += env._get_total_delay()
            total_throughput += env._get_throughput()
        
        self.global_metrics["total_queue"] = total_queue
        self.global_metrics["total_delay"] = total_delay
        self.global_metrics["total_throughput"] = total_throughput
        
        # Calculate network efficiency (throughput / (delay + queue))
        if total_delay + total_queue > 0:
            self.global_metrics["network_efficiency"] = (
                total_throughput / (total_delay + total_queue * 0.1)
            )
        else:
            self.global_metrics["network_efficiency"] = total_throughput
    
    def _calculate_coordinated_rewards(
        self,
        local_rewards: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Calculate coordinated rewards combining local and global components.
        
        Args:
            local_rewards: Dictionary of local rewards for each agent
            
        Returns:
            Dictionary of final rewards for each agent
        """
        if not self.config.shared_reward:
            return local_rewards
        
        # Calculate global reward (network-wide performance)
        global_reward = -(
            self.global_metrics["total_delay"] +
            self.global_metrics["total_queue"] * 0.1
        )
        
        # Combine local and global rewards
        coordinated_rewards = {}
        local_weight = self.config.reward_weights["local"]
        global_weight = self.config.reward_weights["global"]
        
        for agent_id, local_reward in local_rewards.items():
            coordinated_rewards[agent_id] = (
                local_weight * local_reward +
                global_weight * global_reward
            )
        
        return coordinated_rewards
    
    def get_state_size(self, agent_id: str) -> int:
        """
        Get state space size for an agent (including neighbor information).
        
        Args:
            agent_id: Agent ID
            
        Returns:
            State space dimension
        """
        if agent_id not in self.agent_environments:
            return 0
        
        local_size = self.agent_environments[agent_id].state_size
        
        if self.config.enable_communication:
            # Add neighbor features (phase + queue for up to 4 neighbors)
            neighbor_size = 4 * 2  # max_neighbors * features_per_neighbor
            return local_size + neighbor_size
        
        return local_size
    
    def get_action_size(self, agent_id: str) -> int:
        """
        Get action space size for an agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Action space dimension
        """
        if agent_id not in self.agent_environments:
            return 0
        
        return self.agent_environments[agent_id].action_size
    
    def get_episode_metrics(self) -> Dict:
        """
        Get summary metrics for completed episode.
        
        Returns:
            Dictionary with episode statistics for all agents and global metrics
        """
        agent_metrics = {}
        
        for agent_id, env in self.agent_environments.items():
            agent_metrics[agent_id] = env.get_episode_metrics()
        
        # Add global metrics
        global_summary = {
            "total_queue": self.global_metrics["total_queue"],
            "total_delay": self.global_metrics["total_delay"],
            "total_throughput": self.global_metrics["total_throughput"],
            "network_efficiency": self.global_metrics["network_efficiency"],
            "episode_rewards": self.episode_rewards.copy()
        }
        
        return {
            "agents": agent_metrics,
            "global": global_summary
        }
    
    def get_neighbor_info(self, agent_id: str) -> Dict:
        """
        Get information about an agent's neighbors.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Dictionary with neighbor information
        """
        if agent_id not in self.neighbors:
            return {"neighbors": [], "count": 0}
        
        neighbor_list = self.neighbors[agent_id]
        neighbor_info = []
        
        for neighbor_id in neighbor_list:
            if neighbor_id in self.agent_environments:
                env = self.agent_environments[neighbor_id]
                neighbor_info.append({
                    "id": neighbor_id,
                    "phase": env.current_phase,
                    "queue_length": env._get_total_queue_length(),
                    "delay": env._get_total_delay()
                })
        
        return {
            "neighbors": neighbor_info,
            "count": len(neighbor_info)
        }
    
    def render(self) -> str:
        """
        Render current environment state as string.
        
        Returns:
            String representation of multi-agent state
        """
        lines = [f"MARL Environment - Step {self.current_step}"]
        lines.append(f"Global: Queue={self.global_metrics['total_queue']}, "
                    f"Delay={self.global_metrics['total_delay']:.1f}, "
                    f"Throughput={self.global_metrics['total_throughput']}")
        
        for agent_id, env in self.agent_environments.items():
            lines.append(f"  {agent_id}: {env.render()}")
        
        return "\n".join(lines)
    
    def close(self):
        """Clean up environment resources."""
        for env in self.agent_environments.values():
            env.close()
        
        self.agent_environments.clear()
        logger.info("MARL environment closed")
