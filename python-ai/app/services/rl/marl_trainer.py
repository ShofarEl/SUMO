"""
MARL Training Pipeline with coordination mechanisms and performance tracking.

This module provides a comprehensive training pipeline for multi-agent
reinforcement learning with support for different coordination strategies.
"""
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple, Callable
from dataclasses import dataclass, field
import time
import json
import os

from app.services.rl.marl_agent import MARLAgent, MARLAgentConfig, MARLTrainingMetrics
from app.services.rl.marl_environment import MARLEnvironment, MARLConfig
from app.services.sumo.simulation_runner import SUMOSimulationRunner, SimulationConfig

logger = logging.getLogger(__name__)


@dataclass
class TrainingConfig:
    """Configuration for MARL training pipeline"""
    num_episodes: int = 1000
    max_steps_per_episode: int = 3600
    evaluation_frequency: int = 50
    evaluation_episodes: int = 10
    save_frequency: int = 50
    log_frequency: int = 10
    early_stopping_patience: int = 100
    early_stopping_threshold: float = 0.01
    
    # Coordination mechanisms
    enable_communication: bool = True
    enable_experience_sharing: bool = True
    coordination_strategy: str = "independent"  # "independent", "centralized", "decentralized"
    
    # Performance tracking
    track_individual_performance: bool = True
    track_global_performance: bool = True
    track_coordination_metrics: bool = True


@dataclass
class CoordinationMetrics:
    """Metrics for measuring coordination effectiveness"""
    synchronization_score: float = 0.0
    communication_efficiency: float = 0.0
    global_vs_local_reward_ratio: float = 0.0
    neighbor_correlation: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "synchronization_score": self.synchronization_score,
            "communication_efficiency": self.communication_efficiency,
            "global_vs_local_reward_ratio": self.global_vs_local_reward_ratio,
            "neighbor_correlation": self.neighbor_correlation
        }


class MARLTrainer:
    """
    Training pipeline for Multi-Agent Reinforcement Learning.
    
    Features:
    - Independent learning for each agent
    - Coordination mechanisms (communication, shared experience)
    - Individual and global performance tracking
    - Agent synchronization
    - Early stopping and checkpointing
    """
    
    def __init__(
        self,
        marl_agent: MARLAgent,
        marl_env: MARLEnvironment,
        config: TrainingConfig
    ):
        """
        Initialize MARL trainer.
        
        Args:
            marl_agent: MARL agent system
            marl_env: MARL environment
            config: Training configuration
        """
        self.marl_agent = marl_agent
        self.marl_env = marl_env
        self.config = config
        
        # Performance tracking
        self.training_history: List[Dict] = []
        self.evaluation_history: List[Dict] = []
        self.coordination_history: List[CoordinationMetrics] = []
        
        # Individual agent performance
        self.agent_performance: Dict[str, List[float]] = {
            agent_id: [] for agent_id in marl_agent.agents.keys()
        }
        
        # Global performance
        self.global_performance: List[float] = []
        
        # Early stopping
        self.best_performance = float('-inf')
        self.patience_counter = 0
        
        # Timing
        self.training_start_time = None
        self.episode_times: List[float] = []
        
        logger.info("Initialized MARL trainer")
    
    def train(
        self,
        progress_callback: Optional[Callable] = None
    ) -> Dict:
        """
        Execute full training pipeline.
        
        Args:
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with training results and statistics
        """
        logger.info(
            f"Starting MARL training: {self.config.num_episodes} episodes, "
            f"{len(self.marl_agent.agents)} agents"
        )
        
        self.training_start_time = time.time()
        
        for episode in range(self.config.num_episodes):
            episode_start = time.time()
            
            # Train one episode
            metrics = self.marl_agent.train_episode(
                max_steps=self.config.max_steps_per_episode
            )
            
            episode_time = time.time() - episode_start
            self.episode_times.append(episode_time)
            
            # Track performance
            self._track_performance(metrics)
            
            # Calculate coordination metrics
            if self.config.track_coordination_metrics:
                coord_metrics = self._calculate_coordination_metrics(metrics)
                self.coordination_history.append(coord_metrics)
            
            # Log progress
            if (episode + 1) % self.config.log_frequency == 0:
                self._log_progress(episode + 1, metrics, episode_time)
            
            # Evaluate periodically
            if (episode + 1) % self.config.evaluation_frequency == 0:
                eval_results = self._evaluate()
                self.evaluation_history.append({
                    "episode": episode + 1,
                    "results": eval_results
                })
                
                # Check for improvement
                current_performance = eval_results["average_global_reward"]
                if current_performance > self.best_performance:
                    self.best_performance = current_performance
                    self.patience_counter = 0
                    logger.info(f"New best performance: {self.best_performance:.2f}")
                else:
                    self.patience_counter += 1
            
            # Progress callback
            if progress_callback:
                progress_callback({
                    "episode": episode + 1,
                    "total_episodes": self.config.num_episodes,
                    "metrics": metrics.to_dict(),
                    "progress": (episode + 1) / self.config.num_episodes
                })
            
            # Early stopping check
            if self._should_stop_early():
                logger.info(
                    f"Early stopping triggered at episode {episode + 1} "
                    f"(patience: {self.patience_counter})"
                )
                break
        
        # Final evaluation
        final_eval = self._evaluate()
        
        # Generate training summary
        summary = self._generate_training_summary(final_eval)
        
        logger.info("MARL training completed")
        return summary
    
    def _track_performance(self, metrics: MARLTrainingMetrics):
        """
        Track individual and global performance metrics.
        
        Args:
            metrics: Training metrics from episode
        """
        # Track individual agent performance
        if self.config.track_individual_performance:
            for agent_id, reward in metrics.agent_rewards.items():
                self.agent_performance[agent_id].append(reward)
        
        # Track global performance
        if self.config.track_global_performance:
            self.global_performance.append(metrics.global_reward)
        
        # Store in history
        self.training_history.append(metrics.to_dict())
    
    def _calculate_coordination_metrics(
        self,
        metrics: MARLTrainingMetrics
    ) -> CoordinationMetrics:
        """
        Calculate metrics measuring coordination effectiveness.
        
        Args:
            metrics: Training metrics from episode
            
        Returns:
            Coordination metrics
        """
        coord_metrics = CoordinationMetrics()
        
        # Synchronization score: variance in agent rewards (lower is better)
        agent_rewards = list(metrics.agent_rewards.values())
        if len(agent_rewards) > 1:
            reward_variance = np.var(agent_rewards)
            reward_mean = np.mean(agent_rewards)
            if reward_mean != 0:
                coord_metrics.synchronization_score = 1.0 / (1.0 + reward_variance / abs(reward_mean))
            else:
                coord_metrics.synchronization_score = 0.0
        
        # Global vs local reward ratio
        total_local_reward = sum(agent_rewards)
        if total_local_reward != 0:
            coord_metrics.global_vs_local_reward_ratio = (
                metrics.global_reward / total_local_reward
            )
        
        # Communication efficiency (based on network efficiency)
        coord_metrics.communication_efficiency = metrics.network_efficiency
        
        # Neighbor correlation (placeholder - would need historical data)
        for agent_id in metrics.agent_rewards.keys():
            neighbor_info = self.marl_env.get_neighbor_info(agent_id)
            coord_metrics.neighbor_correlation[agent_id] = len(neighbor_info["neighbors"]) / 4.0
        
        return coord_metrics
    
    def _evaluate(self) -> Dict:
        """
        Evaluate current MARL agents.
        
        Returns:
            Evaluation results
        """
        logger.info("Running evaluation...")
        eval_results = self.marl_agent.evaluate(
            num_episodes=self.config.evaluation_episodes
        )
        
        logger.info(
            f"Evaluation: avg_reward={eval_results['average_global_reward']:.2f}, "
            f"avg_queue={eval_results['average_queue_length']:.1f}"
        )
        
        return eval_results
    
    def _log_progress(
        self,
        episode: int,
        metrics: MARLTrainingMetrics,
        episode_time: float
    ):
        """
        Log training progress.
        
        Args:
            episode: Current episode number
            metrics: Training metrics
            episode_time: Time taken for episode
        """
        # Calculate moving averages
        window = 10
        recent_global_rewards = self.global_performance[-window:]
        avg_global_reward = np.mean(recent_global_rewards) if recent_global_rewards else 0
        
        logger.info(
            f"Episode {episode}/{self.config.num_episodes} | "
            f"Global Reward: {metrics.global_reward:.2f} (avg: {avg_global_reward:.2f}) | "
            f"Queue: {metrics.average_queue:.1f} | "
            f"Delay: {metrics.average_delay:.1f} | "
            f"Efficiency: {metrics.network_efficiency:.3f} | "
            f"Epsilon: {metrics.epsilon:.3f} | "
            f"Time: {episode_time:.1f}s"
        )
        
        # Log individual agent performance
        if self.config.track_individual_performance:
            agent_rewards_str = ", ".join([
                f"{agent_id}: {reward:.1f}"
                for agent_id, reward in metrics.agent_rewards.items()
            ])
            logger.debug(f"Agent rewards: {agent_rewards_str}")
    
    def _should_stop_early(self) -> bool:
        """
        Check if early stopping criteria are met.
        
        Returns:
            True if training should stop early
        """
        if self.patience_counter >= self.config.early_stopping_patience:
            return True
        
        # Check if performance has plateaued
        if len(self.global_performance) >= 100:
            recent_performance = self.global_performance[-100:]
            performance_std = np.std(recent_performance)
            if performance_std < self.config.early_stopping_threshold:
                logger.info(f"Performance plateaued (std: {performance_std:.4f})")
                return True
        
        return False
    
    def _generate_training_summary(self, final_eval: Dict) -> Dict:
        """
        Generate comprehensive training summary.
        
        Args:
            final_eval: Final evaluation results
            
        Returns:
            Training summary dictionary
        """
        total_time = time.time() - self.training_start_time
        
        summary = {
            "training_info": {
                "total_episodes": len(self.training_history),
                "total_time_seconds": total_time,
                "average_episode_time": np.mean(self.episode_times) if self.episode_times else 0,
                "num_agents": len(self.marl_agent.agents)
            },
            "final_evaluation": final_eval,
            "best_performance": self.best_performance,
            "convergence": {
                "converged": self.patience_counter < self.config.early_stopping_patience,
                "convergence_episode": self._find_convergence_episode()
            },
            "individual_agent_performance": {},
            "coordination_metrics": {}
        }
        
        # Individual agent statistics
        for agent_id, rewards in self.agent_performance.items():
            if rewards:
                summary["individual_agent_performance"][agent_id] = {
                    "average_reward": np.mean(rewards),
                    "std_reward": np.std(rewards),
                    "min_reward": np.min(rewards),
                    "max_reward": np.max(rewards),
                    "final_reward": rewards[-1]
                }
        
        # Coordination statistics
        if self.coordination_history:
            recent_coord = self.coordination_history[-10:]
            summary["coordination_metrics"] = {
                "average_synchronization": np.mean([
                    c.synchronization_score for c in recent_coord
                ]),
                "average_communication_efficiency": np.mean([
                    c.communication_efficiency for c in recent_coord
                ]),
                "average_global_local_ratio": np.mean([
                    c.global_vs_local_reward_ratio for c in recent_coord
                ])
            }
        
        return summary
    
    def _find_convergence_episode(self) -> Optional[int]:
        """
        Find the episode where training converged.
        
        Returns:
            Episode number or None if not converged
        """
        if len(self.global_performance) < 50:
            return None
        
        # Use moving average to detect convergence
        window = 20
        threshold = 0.05
        
        for i in range(window, len(self.global_performance) - window):
            before = self.global_performance[i-window:i]
            after = self.global_performance[i:i+window]
            
            mean_before = np.mean(before)
            mean_after = np.mean(after)
            
            if mean_before != 0:
                change = abs(mean_after - mean_before) / abs(mean_before)
                if change < threshold:
                    return i
        
        return None
    
    def get_training_history(self) -> List[Dict]:
        """Get complete training history."""
        return self.training_history
    
    def get_coordination_history(self) -> List[Dict]:
        """Get coordination metrics history."""
        return [c.to_dict() for c in self.coordination_history]
    
    def get_agent_performance_summary(self) -> Dict:
        """
        Get summary of individual agent performance.
        
        Returns:
            Dictionary with agent performance statistics
        """
        summary = {}
        
        for agent_id, rewards in self.agent_performance.items():
            if not rewards:
                continue
            
            # Calculate statistics
            summary[agent_id] = {
                "total_episodes": len(rewards),
                "average_reward": np.mean(rewards),
                "std_reward": np.std(rewards),
                "min_reward": np.min(rewards),
                "max_reward": np.max(rewards),
                "trend": self._calculate_trend(rewards),
                "improvement": rewards[-1] - rewards[0] if len(rewards) > 1 else 0
            }
        
        return summary
    
    def _calculate_trend(self, values: List[float]) -> str:
        """
        Calculate trend direction from values.
        
        Args:
            values: List of values
            
        Returns:
            Trend description ("improving", "declining", "stable")
        """
        if len(values) < 10:
            return "insufficient_data"
        
        # Use linear regression slope
        x = np.arange(len(values))
        y = np.array(values)
        
        # Calculate slope
        slope = np.polyfit(x, y, 1)[0]
        
        if slope > 0.1:
            return "improving"
        elif slope < -0.1:
            return "declining"
        else:
            return "stable"
    
    def save_training_results(self, filepath: str):
        """
        Save training results to file.
        
        Args:
            filepath: Path to save results
        """
        results = {
            "training_history": self.training_history,
            "evaluation_history": self.evaluation_history,
            "coordination_history": self.get_coordination_history(),
            "agent_performance": self.get_agent_performance_summary(),
            "config": {
                "num_episodes": self.config.num_episodes,
                "max_steps_per_episode": self.config.max_steps_per_episode,
                "coordination_strategy": self.config.coordination_strategy
            }
        }
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Saved training results to {filepath}")
    
    def load_training_results(self, filepath: str):
        """
        Load training results from file.
        
        Args:
            filepath: Path to results file
        """
        with open(filepath, 'r') as f:
            results = json.load(f)
        
        self.training_history = results.get("training_history", [])
        self.evaluation_history = results.get("evaluation_history", [])
        
        # Restore coordination history
        coord_history = results.get("coordination_history", [])
        self.coordination_history = [
            CoordinationMetrics(**c) for c in coord_history
        ]
        
        logger.info(f"Loaded training results from {filepath}")


class MARLTrainingScheduler:
    """
    Scheduler for managing MARL training with different strategies.
    
    Supports curriculum learning and adaptive training schedules.
    """
    
    def __init__(self, trainer: MARLTrainer):
        """
        Initialize training scheduler.
        
        Args:
            trainer: MARL trainer instance
        """
        self.trainer = trainer
        self.current_phase = 0
        self.phases: List[Dict] = []
    
    def add_training_phase(
        self,
        name: str,
        num_episodes: int,
        config_updates: Optional[Dict] = None
    ):
        """
        Add a training phase to the schedule.
        
        Args:
            name: Phase name
            num_episodes: Number of episodes for this phase
            config_updates: Optional configuration updates
        """
        self.phases.append({
            "name": name,
            "num_episodes": num_episodes,
            "config_updates": config_updates or {}
        })
    
    def run_scheduled_training(self) -> Dict:
        """
        Execute training according to schedule.
        
        Returns:
            Combined training results
        """
        logger.info(f"Starting scheduled training with {len(self.phases)} phases")
        
        all_results = []
        
        for phase_idx, phase in enumerate(self.phases):
            logger.info(
                f"Starting phase {phase_idx + 1}/{len(self.phases)}: "
                f"{phase['name']} ({phase['num_episodes']} episodes)"
            )
            
            # Update configuration
            original_config = self.trainer.config.num_episodes
            self.trainer.config.num_episodes = phase["num_episodes"]
            
            # Apply config updates
            for key, value in phase["config_updates"].items():
                if hasattr(self.trainer.config, key):
                    setattr(self.trainer.config, key, value)
            
            # Run training phase
            phase_results = self.trainer.train()
            phase_results["phase_name"] = phase["name"]
            all_results.append(phase_results)
            
            # Restore original config
            self.trainer.config.num_episodes = original_config
        
        logger.info("Scheduled training completed")
        
        return {
            "phases": all_results,
            "total_episodes": sum(p["num_episodes"] for p in self.phases)
        }
