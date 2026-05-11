"""
Agent performance evaluation module.

Evaluates trained RL agents against baseline strategies and calculates
performance improvements.
"""
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import traci

from app.services.rl.dqn_agent import DQNAgent
from app.services.rl.sumo_environment import SUMOTrafficEnvironment, EnvironmentConfig
from app.services.sumo.simulation_runner import SUMOSimulationRunner, SimulationConfig

logger = logging.getLogger(__name__)


@dataclass
class EvaluationMetrics:
    """Performance metrics for agent evaluation"""
    strategy: str
    num_episodes: int
    average_delay: float
    std_delay: float
    average_queue_length: float
    std_queue_length: float
    average_throughput: float
    total_vehicles: int
    average_reward: float
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "strategy": self.strategy,
            "num_episodes": self.num_episodes,
            "average_delay": self.average_delay,
            "std_delay": self.std_delay,
            "average_queue_length": self.average_queue_length,
            "std_queue_length": self.std_queue_length,
            "average_throughput": self.average_throughput,
            "total_vehicles": self.total_vehicles,
            "average_reward": self.average_reward
        }


@dataclass
class ComparisonResults:
    """Comparison results between strategies"""
    baseline_metrics: EvaluationMetrics
    agent_metrics: EvaluationMetrics
    delay_reduction_percent: float
    queue_reduction_percent: float
    throughput_increase_percent: float
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "baseline": self.baseline_metrics.to_dict(),
            "agent": self.agent_metrics.to_dict(),
            "improvements": {
                "delay_reduction_percent": self.delay_reduction_percent,
                "queue_reduction_percent": self.queue_reduction_percent,
                "throughput_increase_percent": self.throughput_increase_percent
            }
        }


class FixedTimingController:
    """
    Fixed-timing baseline controller.
    
    Uses simple fixed-duration signal phases as baseline for comparison.
    """
    
    def __init__(
        self,
        intersection_id: str,
        cycle_length: int = 60,
        num_phases: int = 4
    ):
        """
        Initialize fixed-timing controller.
        
        Args:
            intersection_id: Traffic light ID
            cycle_length: Total cycle length in seconds
            num_phases: Number of signal phases
        """
        self.intersection_id = intersection_id
        self.cycle_length = cycle_length
        self.num_phases = num_phases
        self.phase_duration = cycle_length // num_phases
        
        self.current_phase = 0
        self.time_in_phase = 0
    
    def select_action(self, state: np.ndarray) -> int:
        """
        Select action based on fixed timing.
        
        Args:
            state: Current state (ignored)
            
        Returns:
            Action (signal phase)
        """
        # Increment time
        self.time_in_phase += 1
        
        # Check if phase should change
        if self.time_in_phase >= self.phase_duration:
            self.current_phase = (self.current_phase + 1) % self.num_phases
            self.time_in_phase = 0
        
        return self.current_phase
    
    def reset(self):
        """Reset controller state"""
        self.current_phase = 0
        self.time_in_phase = 0


class AgentEvaluator:
    """
    Evaluates RL agent performance against baseline strategies.
    
    Runs simulations with both the trained agent and baseline controllers,
    then compares performance metrics.
    """
    
    def __init__(
        self,
        agent: DQNAgent,
        env_config: EnvironmentConfig,
        sim_config: SimulationConfig
    ):
        """
        Initialize evaluator.
        
        Args:
            agent: Trained DQN agent
            env_config: Environment configuration
            sim_config: SUMO simulation configuration
        """
        self.agent = agent
        self.env_config = env_config
        self.sim_config = sim_config
        
        logger.info("Initialized agent evaluator")
    
    def evaluate_agent(
        self,
        num_episodes: int = 10,
        max_steps: int = 3600
    ) -> EvaluationMetrics:
        """
        Evaluate trained agent performance.
        
        Args:
            num_episodes: Number of evaluation episodes
            max_steps: Maximum steps per episode
            
        Returns:
            Evaluation metrics
        """
        logger.info(f"Evaluating agent for {num_episodes} episodes")
        
        delays = []
        queue_lengths = []
        throughputs = []
        rewards = []
        total_vehicles = 0
        
        for episode in range(num_episodes):
            # Create environment
            env = SUMOTrafficEnvironment(self.env_config)
            
            # Run episode
            episode_metrics = self._run_episode(
                env,
                self.agent,
                max_steps,
                training=False
            )
            
            delays.append(episode_metrics["average_delay"])
            queue_lengths.append(episode_metrics["average_queue"])
            throughputs.append(episode_metrics["throughput"])
            rewards.append(episode_metrics["total_reward"])
            total_vehicles += episode_metrics["total_vehicles"]
            
            env.close()
            
            logger.info(
                f"Episode {episode + 1}/{num_episodes}: "
                f"delay={episode_metrics['average_delay']:.2f}, "
                f"queue={episode_metrics['average_queue']:.2f}"
            )
        
        # Calculate statistics
        metrics = EvaluationMetrics(
            strategy="DQN Agent",
            num_episodes=num_episodes,
            average_delay=np.mean(delays),
            std_delay=np.std(delays),
            average_queue_length=np.mean(queue_lengths),
            std_queue_length=np.std(queue_lengths),
            average_throughput=np.mean(throughputs),
            total_vehicles=total_vehicles,
            average_reward=np.mean(rewards)
        )
        
        logger.info(
            f"Agent evaluation complete: "
            f"avg_delay={metrics.average_delay:.2f}, "
            f"avg_queue={metrics.average_queue_length:.2f}"
        )
        
        return metrics
    
    def evaluate_baseline(
        self,
        num_episodes: int = 10,
        max_steps: int = 3600,
        cycle_length: int = 60
    ) -> EvaluationMetrics:
        """
        Evaluate fixed-timing baseline performance.
        
        Args:
            num_episodes: Number of evaluation episodes
            max_steps: Maximum steps per episode
            cycle_length: Fixed signal cycle length
            
        Returns:
            Evaluation metrics
        """
        logger.info(f"Evaluating baseline for {num_episodes} episodes")
        
        delays = []
        queue_lengths = []
        throughputs = []
        rewards = []
        total_vehicles = 0
        
        # Create baseline controller
        baseline = FixedTimingController(
            self.env_config.intersection_id,
            cycle_length=cycle_length
        )
        
        for episode in range(num_episodes):
            # Create environment
            env = SUMOTrafficEnvironment(self.env_config)
            
            # Reset baseline
            baseline.reset()
            
            # Run episode
            episode_metrics = self._run_episode(
                env,
                baseline,
                max_steps,
                training=False
            )
            
            delays.append(episode_metrics["average_delay"])
            queue_lengths.append(episode_metrics["average_queue"])
            throughputs.append(episode_metrics["throughput"])
            rewards.append(episode_metrics["total_reward"])
            total_vehicles += episode_metrics["total_vehicles"]
            
            env.close()
            
            logger.info(
                f"Episode {episode + 1}/{num_episodes}: "
                f"delay={episode_metrics['average_delay']:.2f}, "
                f"queue={episode_metrics['average_queue']:.2f}"
            )
        
        # Calculate statistics
        metrics = EvaluationMetrics(
            strategy="Fixed Timing",
            num_episodes=num_episodes,
            average_delay=np.mean(delays),
            std_delay=np.std(delays),
            average_queue_length=np.mean(queue_lengths),
            std_queue_length=np.std(queue_lengths),
            average_throughput=np.mean(throughputs),
            total_vehicles=total_vehicles,
            average_reward=np.mean(rewards)
        )
        
        logger.info(
            f"Baseline evaluation complete: "
            f"avg_delay={metrics.average_delay:.2f}, "
            f"avg_queue={metrics.average_queue_length:.2f}"
        )
        
        return metrics
    
    def compare_with_baseline(
        self,
        num_episodes: int = 10,
        max_steps: int = 3600
    ) -> ComparisonResults:
        """
        Compare agent performance with baseline.
        
        Args:
            num_episodes: Number of evaluation episodes
            max_steps: Maximum steps per episode
            
        Returns:
            Comparison results with improvement percentages
        """
        logger.info("Comparing agent with baseline")
        
        # Evaluate baseline
        baseline_metrics = self.evaluate_baseline(num_episodes, max_steps)
        
        # Evaluate agent
        agent_metrics = self.evaluate_agent(num_episodes, max_steps)
        
        # Calculate improvements
        delay_reduction = self._calculate_improvement(
            baseline_metrics.average_delay,
            agent_metrics.average_delay
        )
        
        queue_reduction = self._calculate_improvement(
            baseline_metrics.average_queue_length,
            agent_metrics.average_queue_length
        )
        
        throughput_increase = self._calculate_improvement(
            agent_metrics.average_throughput,
            baseline_metrics.average_throughput
        )
        
        results = ComparisonResults(
            baseline_metrics=baseline_metrics,
            agent_metrics=agent_metrics,
            delay_reduction_percent=delay_reduction,
            queue_reduction_percent=queue_reduction,
            throughput_increase_percent=throughput_increase
        )
        
        logger.info(
            f"Comparison complete: "
            f"delay_reduction={delay_reduction:.1f}%, "
            f"queue_reduction={queue_reduction:.1f}%, "
            f"throughput_increase={throughput_increase:.1f}%"
        )
        
        return results
    
    def _run_episode(
        self,
        env: SUMOTrafficEnvironment,
        controller,
        max_steps: int,
        training: bool = False
    ) -> Dict:
        """
        Run one evaluation episode.
        
        Args:
            env: Traffic environment
            controller: Agent or baseline controller
            max_steps: Maximum steps
            training: Whether in training mode
            
        Returns:
            Episode metrics dictionary
        """
        state = env.reset()
        
        total_reward = 0.0
        total_delay = 0.0
        total_queue = 0.0
        step_count = 0
        
        for step in range(max_steps):
            # Select action
            if hasattr(controller, 'select_action'):
                action = controller.select_action(state)
            else:
                # DQN agent
                action = controller.select_action(state, training=training)
            
            # Execute action
            next_state, reward, done, info = env.step(action)
            
            total_reward += reward
            total_delay += info.get("delay", 0)
            total_queue += info.get("queue_length", 0)
            step_count += 1
            
            state = next_state
            
            if done:
                break
        
        # Calculate averages
        avg_delay = total_delay / step_count if step_count > 0 else 0
        avg_queue = total_queue / step_count if step_count > 0 else 0
        
        # Get throughput from environment
        env_metrics = env.get_episode_metrics()
        
        return {
            "total_reward": total_reward,
            "average_delay": avg_delay,
            "average_queue": avg_queue,
            "throughput": env_metrics.get("average_throughput", 0),
            "total_vehicles": step_count,  # Placeholder
            "steps": step_count
        }
    
    def _calculate_improvement(
        self,
        baseline_value: float,
        agent_value: float
    ) -> float:
        """
        Calculate percentage improvement.
        
        Args:
            baseline_value: Baseline metric value
            agent_value: Agent metric value
            
        Returns:
            Improvement percentage (positive = better)
        """
        if baseline_value == 0:
            return 0.0
        
        improvement = ((baseline_value - agent_value) / baseline_value) * 100
        return improvement
    
    def generate_evaluation_report(
        self,
        comparison: ComparisonResults
    ) -> Dict:
        """
        Generate comprehensive evaluation report.
        
        Args:
            comparison: Comparison results
            
        Returns:
            Report dictionary
        """
        report = {
            "summary": {
                "agent_strategy": comparison.agent_metrics.strategy,
                "baseline_strategy": comparison.baseline_metrics.strategy,
                "evaluation_episodes": comparison.agent_metrics.num_episodes
            },
            "performance_metrics": {
                "baseline": {
                    "average_delay": comparison.baseline_metrics.average_delay,
                    "average_queue_length": comparison.baseline_metrics.average_queue_length,
                    "average_throughput": comparison.baseline_metrics.average_throughput
                },
                "agent": {
                    "average_delay": comparison.agent_metrics.average_delay,
                    "average_queue_length": comparison.agent_metrics.average_queue_length,
                    "average_throughput": comparison.agent_metrics.average_throughput
                }
            },
            "improvements": {
                "delay_reduction_percent": comparison.delay_reduction_percent,
                "queue_reduction_percent": comparison.queue_reduction_percent,
                "throughput_increase_percent": comparison.throughput_increase_percent
            },
            "statistical_significance": {
                "baseline_delay_std": comparison.baseline_metrics.std_delay,
                "agent_delay_std": comparison.agent_metrics.std_delay,
                "baseline_queue_std": comparison.baseline_metrics.std_queue_length,
                "agent_queue_std": comparison.agent_metrics.std_queue_length
            },
            "meets_targets": {
                "delay_reduction_25_34_percent": (
                    25 <= comparison.delay_reduction_percent <= 34
                ),
                "queue_reduction_20_30_percent": (
                    20 <= comparison.queue_reduction_percent <= 30
                ),
                "throughput_increase_15_25_percent": (
                    15 <= comparison.throughput_increase_percent <= 25
                )
            }
        }
        
        return report
