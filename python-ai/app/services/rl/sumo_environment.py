"""
OpenAI Gym-style environment wrapper for SUMO traffic simulation.

This module provides a reinforcement learning environment interface
for training adaptive traffic signal control agents.
"""
import numpy as np
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import traci

logger = logging.getLogger(__name__)


@dataclass
class EnvironmentConfig:
    """Configuration for SUMO RL environment"""
    intersection_id: str
    state_features: List[str] = None
    action_type: str = "phase_change"  # "phase_change" or "phase_duration"
    reward_type: str = "delay_queue"  # "delay_queue", "delay", "queue", "throughput"
    max_green_time: int = 60  # Maximum green phase duration (seconds)
    min_green_time: int = 10  # Minimum green phase duration (seconds)
    yellow_time: int = 3  # Yellow phase duration (seconds)
    
    def __post_init__(self):
        if self.state_features is None:
            self.state_features = [
                "queue_length",
                "vehicle_arrivals",
                "current_phase",
                "time_since_phase_change"
            ]


class SUMOTrafficEnvironment:
    """
    OpenAI Gym-style environment for SUMO traffic signal control.
    
    State space: Queue lengths, vehicle arrivals, signal phases
    Action space: Signal phase changes
    Reward: Negative of (delay + queue length)
    """
    
    def __init__(
        self,
        config: EnvironmentConfig,
        connection_label: str = "default"
    ):
        """
        Initialize SUMO RL environment.
        
        Args:
            config: Environment configuration
            connection_label: TraCI connection label
        """
        self.config = config
        self.connection_label = connection_label
        self.intersection_id = config.intersection_id
        
        # State and action spaces
        self.state_size = self._calculate_state_size()
        self.action_size = self._calculate_action_size()
        
        # Episode tracking
        self.current_step = 0
        self.episode_reward = 0.0
        self.episode_delay = 0.0
        self.episode_queue = 0.0
        
        # Traffic light control
        self.current_phase = 0
        self.time_since_phase_change = 0
        self.last_action = 0
        
        # Incoming lanes for the intersection
        self.incoming_lanes = []
        self.outgoing_lanes = []
        
        # Metrics tracking
        self.metrics_history = []
        
        logger.info(
            f"Initialized SUMO environment for intersection {self.intersection_id}: "
            f"state_size={self.state_size}, action_size={self.action_size}"
        )
    
    def _calculate_state_size(self) -> int:
        """Calculate state space dimension based on features."""
        # Base features per lane: queue_length, vehicle_arrivals
        # Plus: current_phase (one-hot encoded), time_since_phase_change
        # Assuming 4 incoming lanes (typical intersection)
        num_lanes = 4
        features_per_lane = 2  # queue_length, vehicle_arrivals
        
        state_size = num_lanes * features_per_lane
        
        if "current_phase" in self.config.state_features:
            state_size += 4  # One-hot encoding for 4 phases
        
        if "time_since_phase_change" in self.config.state_features:
            state_size += 1
        
        return state_size
    
    def _calculate_action_size(self) -> int:
        """Calculate action space dimension."""
        # Typical 4-phase signal control
        # Actions: 0=North-South, 1=East-West, 2=Left-turns, 3=All-red
        return 4
    
    def initialize(self):
        """Initialize environment with TraCI connection."""
        try:
            # Get incoming and outgoing lanes for intersection
            self.incoming_lanes = self._get_incoming_lanes()
            self.outgoing_lanes = self._get_outgoing_lanes()
            
            # Get initial traffic light state
            if self.intersection_id in traci.trafficlight.getIDList():
                self.current_phase = traci.trafficlight.getPhase(self.intersection_id)
            
            logger.info(
                f"Environment initialized: {len(self.incoming_lanes)} incoming lanes, "
                f"{len(self.outgoing_lanes)} outgoing lanes"
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize environment: {e}")
            raise
    
    def _get_incoming_lanes(self) -> List[str]:
        """Get list of incoming lanes for the intersection."""
        try:
            # Get controlled lanes from traffic light
            if self.intersection_id in traci.trafficlight.getIDList():
                controlled_lanes = traci.trafficlight.getControlledLanes(
                    self.intersection_id
                )
                # Remove duplicates
                return list(set(controlled_lanes))
            else:
                logger.warning(f"Traffic light {self.intersection_id} not found")
                return []
        except Exception as e:
            logger.error(f"Error getting incoming lanes: {e}")
            return []
    
    def _get_outgoing_lanes(self) -> List[str]:
        """Get list of outgoing lanes from the intersection."""
        try:
            # Get links from controlled lanes
            outgoing = set()
            for lane in self.incoming_lanes:
                links = traci.lane.getLinks(lane)
                for link in links:
                    outgoing.add(link[0])  # Target lane
            return list(outgoing)
        except Exception as e:
            logger.error(f"Error getting outgoing lanes: {e}")
            return []
    
    def reset(self) -> np.ndarray:
        """
        Reset environment to initial state.
        
        Returns:
            Initial state observation
        """
        self.current_step = 0
        self.episode_reward = 0.0
        self.episode_delay = 0.0
        self.episode_queue = 0.0
        self.time_since_phase_change = 0
        self.metrics_history = []
        
        # Get initial state
        state = self._get_state()
        
        logger.debug(f"Environment reset: state shape {state.shape}")
        return state
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict]:
        """
        Execute one environment step.
        
        Args:
            action: Action to take (signal phase index)
            
        Returns:
            Tuple of (next_state, reward, done, info)
        """
        # Apply action (change signal phase if different)
        self._apply_action(action)
        
        # Execute simulation step
        self.current_step += 1
        self.time_since_phase_change += 1
        
        # Get new state
        next_state = self._get_state()
        
        # Calculate reward
        reward = self._calculate_reward()
        self.episode_reward += reward
        
        # Check if episode is done (handled externally by simulation runner)
        done = False
        
        # Collect info
        info = self._get_info()
        
        # Track metrics
        self.metrics_history.append({
            "step": self.current_step,
            "action": action,
            "reward": reward,
            "queue_length": info["queue_length"],
            "delay": info["delay"],
            "phase": self.current_phase
        })
        
        return next_state, reward, done, info
    
    def _get_state(self) -> np.ndarray:
        """
        Get current state observation.
        
        Returns:
            State vector as numpy array
        """
        state_features = []
        
        # Queue lengths for each incoming lane
        queue_lengths = []
        for lane in self.incoming_lanes:
            try:
                queue = traci.lane.getLastStepHaltingNumber(lane)
                queue_lengths.append(queue)
            except:
                queue_lengths.append(0)
        
        # Pad or truncate to 4 lanes
        while len(queue_lengths) < 4:
            queue_lengths.append(0)
        queue_lengths = queue_lengths[:4]
        state_features.extend(queue_lengths)
        
        # Vehicle arrivals (vehicles on incoming lanes)
        vehicle_arrivals = []
        for lane in self.incoming_lanes:
            try:
                vehicles = traci.lane.getLastStepVehicleNumber(lane)
                vehicle_arrivals.append(vehicles)
            except:
                vehicle_arrivals.append(0)
        
        # Pad or truncate to 4 lanes
        while len(vehicle_arrivals) < 4:
            vehicle_arrivals.append(0)
        vehicle_arrivals = vehicle_arrivals[:4]
        state_features.extend(vehicle_arrivals)
        
        # Current phase (one-hot encoded)
        if "current_phase" in self.config.state_features:
            phase_one_hot = [0] * 4
            if 0 <= self.current_phase < 4:
                phase_one_hot[self.current_phase] = 1
            state_features.extend(phase_one_hot)
        
        # Time since last phase change (normalized)
        if "time_since_phase_change" in self.config.state_features:
            normalized_time = min(self.time_since_phase_change / self.config.max_green_time, 1.0)
            state_features.append(normalized_time)
        
        return np.array(state_features, dtype=np.float32)
    
    def _apply_action(self, action: int):
        """
        Apply action to traffic signal.
        
        Args:
            action: Signal phase index to activate
        """
        try:
            # Only change phase if different from current
            if action != self.current_phase:
                # Check minimum green time constraint
                if self.time_since_phase_change >= self.config.min_green_time:
                    # Set new phase
                    traci.trafficlight.setPhase(self.intersection_id, action)
                    self.current_phase = action
                    self.time_since_phase_change = 0
                    logger.debug(f"Changed phase to {action}")
            
            # Check maximum green time constraint
            if self.time_since_phase_change >= self.config.max_green_time:
                # Force phase change to next phase
                next_phase = (self.current_phase + 1) % self.action_size
                traci.trafficlight.setPhase(self.intersection_id, next_phase)
                self.current_phase = next_phase
                self.time_since_phase_change = 0
                logger.debug(f"Forced phase change to {next_phase} (max time reached)")
            
            self.last_action = action
            
        except Exception as e:
            logger.error(f"Error applying action: {e}")
    
    def _calculate_reward(self) -> float:
        """
        Calculate reward based on traffic conditions.
        
        Returns:
            Reward value (higher is better)
        """
        # Get current traffic metrics
        queue_length = self._get_total_queue_length()
        delay = self._get_total_delay()
        
        # Track cumulative metrics
        self.episode_queue += queue_length
        self.episode_delay += delay
        
        # Reward function: minimize delay and queue length
        if self.config.reward_type == "delay_queue":
            # Negative reward for delay and queue (agent minimizes)
            reward = -(delay + queue_length * 0.1)
        elif self.config.reward_type == "delay":
            reward = -delay
        elif self.config.reward_type == "queue":
            reward = -queue_length
        elif self.config.reward_type == "throughput":
            # Positive reward for vehicles passing through
            throughput = self._get_throughput()
            reward = throughput - queue_length * 0.1
        else:
            reward = -(delay + queue_length * 0.1)
        
        return reward
    
    def _get_total_queue_length(self) -> int:
        """Get total queue length across all incoming lanes."""
        total_queue = 0
        for lane in self.incoming_lanes:
            try:
                queue = traci.lane.getLastStepHaltingNumber(lane)
                total_queue += queue
            except:
                pass
        return total_queue
    
    def _get_total_delay(self) -> float:
        """Get total waiting time for vehicles on incoming lanes."""
        total_delay = 0.0
        for lane in self.incoming_lanes:
            try:
                vehicles = traci.lane.getLastStepVehicleIDs(lane)
                for vid in vehicles:
                    waiting_time = traci.vehicle.getWaitingTime(vid)
                    total_delay += waiting_time
            except:
                pass
        return total_delay
    
    def _get_throughput(self) -> int:
        """Get number of vehicles that passed through intersection."""
        throughput = 0
        for lane in self.outgoing_lanes:
            try:
                vehicles = traci.lane.getLastStepVehicleNumber(lane)
                throughput += vehicles
            except:
                pass
        return throughput
    
    def _get_info(self) -> Dict:
        """
        Get additional information about current state.
        
        Returns:
            Dictionary with metrics and debug info
        """
        return {
            "step": self.current_step,
            "phase": self.current_phase,
            "time_since_phase_change": self.time_since_phase_change,
            "queue_length": self._get_total_queue_length(),
            "delay": self._get_total_delay(),
            "throughput": self._get_throughput(),
            "episode_reward": self.episode_reward,
            "episode_delay": self.episode_delay,
            "episode_queue": self.episode_queue
        }
    
    def get_episode_metrics(self) -> Dict:
        """
        Get summary metrics for completed episode.
        
        Returns:
            Dictionary with episode statistics
        """
        if not self.metrics_history:
            return {}
        
        total_steps = len(self.metrics_history)
        avg_queue = sum(m["queue_length"] for m in self.metrics_history) / total_steps
        avg_delay = sum(m["delay"] for m in self.metrics_history) / total_steps
        total_reward = sum(m["reward"] for m in self.metrics_history)
        
        return {
            "total_steps": total_steps,
            "total_reward": total_reward,
            "average_reward": total_reward / total_steps if total_steps > 0 else 0,
            "average_queue_length": avg_queue,
            "average_delay": avg_delay,
            "episode_delay": self.episode_delay,
            "episode_queue": self.episode_queue
        }
    
    def render(self) -> str:
        """
        Render current environment state as string.
        
        Returns:
            String representation of state
        """
        state = self._get_state()
        info = self._get_info()
        
        return (
            f"Step: {self.current_step} | "
            f"Phase: {self.current_phase} | "
            f"Queue: {info['queue_length']} | "
            f"Delay: {info['delay']:.1f} | "
            f"Reward: {self.episode_reward:.2f}"
        )
    
    def close(self):
        """Clean up environment resources."""
        self.metrics_history = []
        logger.info("Environment closed")
