"""
SUMO Simulation Execution Engine

This module provides the simulation runner that executes SUMO simulations
using TraCI (Traffic Control Interface) for step-by-step control and data collection.
"""

import os
import sys
import logging
from typing import Dict, List, Optional, Callable, Any
from pathlib import Path
from dataclasses import dataclass, field
import time

logger = logging.getLogger(__name__)

# Import TraCI
try:
    import traci
    import traci.constants as tc
    TRACI_AVAILABLE = True
except ImportError:
    logger.warning("TraCI not available. SUMO simulations will not work.")
    TRACI_AVAILABLE = False


@dataclass
class SimulationConfig:
    """Configuration for SUMO simulation"""
    network_file: str
    route_file: str
    begin_time: int = 0
    end_time: int = 3600
    step_length: float = 1.0
    gui: bool = False
    additional_files: List[str] = field(default_factory=list)
    sumo_config_file: Optional[str] = None
    seed: Optional[int] = None
    
    def validate(self) -> bool:
        """Validate configuration"""
        if not os.path.exists(self.network_file):
            logger.error(f"Network file not found: {self.network_file}")
            return False
        
        if not os.path.exists(self.route_file):
            logger.error(f"Route file not found: {self.route_file}")
            return False
        
        if self.end_time <= self.begin_time:
            logger.error("End time must be greater than begin time")
            return False
        
        return True


@dataclass
class SimulationState:
    """Current state of simulation"""
    current_step: int = 0
    current_time: float = 0.0
    total_vehicles: int = 0
    departed_vehicles: int = 0
    arrived_vehicles: int = 0
    running_vehicles: int = 0
    waiting_vehicles: int = 0
    teleported_vehicles: int = 0
    is_running: bool = False
    is_paused: bool = False


@dataclass
class TrafficMetrics:
    """Traffic metrics collected during simulation"""
    timestamp: float
    step: int
    vehicle_count: int
    average_speed: float
    average_waiting_time: float
    total_delay: float
    queue_lengths: Dict[str, int]
    throughput: Dict[str, int]
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "timestamp": self.timestamp,
            "step": self.step,
            "vehicle_count": self.vehicle_count,
            "average_speed": self.average_speed,
            "average_waiting_time": self.average_waiting_time,
            "total_delay": self.total_delay,
            "queue_lengths": self.queue_lengths,
            "throughput": self.throughput
        }


class SUMOSimulationRunner:
    """Execute and control SUMO simulations with TraCI"""
    
    def __init__(self, config: SimulationConfig):
        """
        Initialize simulation runner
        
        Args:
            config: Simulation configuration
        """
        if not TRACI_AVAILABLE:
            raise RuntimeError("TraCI is not available. Cannot run simulations.")
        
        self.config = config
        self.state = SimulationState()
        self.metrics_history: List[TrafficMetrics] = []
        self.connection_label = f"sim_{id(self)}"
        self.is_connected = False
        
        # Callbacks
        self.step_callback: Optional[Callable[[int, TrafficMetrics], None]] = None
        self.error_callback: Optional[Callable[[Exception], None]] = None
    
    def _get_sumo_binary(self) -> str:
        """Get SUMO binary path"""
        sumo_home = os.environ.get("SUMO_HOME")
        
        if self.config.gui:
            binary = "sumo-gui"
        else:
            binary = "sumo"
        
        if sumo_home:
            binary_path = os.path.join(sumo_home, "bin", binary)
            if os.path.exists(binary_path):
                return binary_path
        
        return binary
    
    def _build_sumo_command(self) -> List[str]:
        """Build SUMO command line arguments"""
        cmd = [self._get_sumo_binary()]
        
        # Network and routes
        cmd.extend(["--net-file", self.config.network_file])
        cmd.extend(["--route-files", self.config.route_file])
        
        # Time settings
        cmd.extend(["--begin", str(self.config.begin_time)])
        cmd.extend(["--end", str(self.config.end_time)])
        cmd.extend(["--step-length", str(self.config.step_length)])
        
        # Additional files
        if self.config.additional_files:
            cmd.extend(["--additional-files", ",".join(self.config.additional_files)])
        
        # Random seed
        if self.config.seed is not None:
            cmd.extend(["--seed", str(self.config.seed)])
        
        # Other settings
        cmd.extend([
            "--time-to-teleport", "300",
            "--collision.action", "warn",
            "--no-warnings", "false",
            "--verbose", "true"
        ])
        
        return cmd
    
    def start(self) -> bool:
        """
        Start SUMO simulation
        
        Returns:
            True if started successfully
        """
        try:
            # Validate configuration
            if not self.config.validate():
                logger.error("Invalid simulation configuration")
                return False
            
            # Build command
            cmd = self._build_sumo_command()
            logger.info(f"Starting SUMO: {' '.join(cmd)}")
            
            # Start TraCI
            traci.start(cmd, label=self.connection_label)
            self.is_connected = True
            self.state.is_running = True
            
            logger.info("SUMO simulation started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start SUMO: {e}", exc_info=True)
            if self.error_callback:
                self.error_callback(e)
            return False
    
    def step(self) -> bool:
        """
        Execute one simulation step
        
        Returns:
            True if step executed successfully
        """
        if not self.is_connected or not self.state.is_running:
            return False
        
        try:
            # Execute simulation step
            traci.simulationStep()
            
            # Update state
            self.state.current_step += 1
            self.state.current_time = traci.simulation.getTime()
            
            # Collect metrics
            metrics = self._collect_metrics()
            self.metrics_history.append(metrics)
            
            # Call step callback
            if self.step_callback:
                self.step_callback(self.state.current_step, metrics)
            
            # Check if simulation should end
            if traci.simulation.getMinExpectedNumber() <= 0:
                logger.info("No more vehicles in simulation")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error during simulation step: {e}", exc_info=True)
            if self.error_callback:
                self.error_callback(e)
            return False
    
    def run(self, max_steps: Optional[int] = None) -> bool:
        """
        Run simulation until completion or max steps
        
        Args:
            max_steps: Maximum number of steps (None for unlimited)
            
        Returns:
            True if completed successfully
        """
        if not self.start():
            return False
        
        try:
            step_count = 0
            while self.state.is_running:
                if max_steps and step_count >= max_steps:
                    logger.info(f"Reached maximum steps: {max_steps}")
                    break
                
                if not self.step():
                    break
                
                step_count += 1
                
                # Log progress periodically
                if step_count % 100 == 0:
                    logger.info(f"Step {step_count}: {self.state.running_vehicles} vehicles running")
            
            logger.info(f"Simulation completed: {step_count} steps")
            return True
            
        except KeyboardInterrupt:
            logger.info("Simulation interrupted by user")
            return False
        except Exception as e:
            logger.error(f"Simulation error: {e}", exc_info=True)
            if self.error_callback:
                self.error_callback(e)
            return False
        finally:
            self.stop()
    
    def pause(self):
        """Pause simulation"""
        self.state.is_paused = True
        logger.info("Simulation paused")
    
    def resume(self):
        """Resume simulation"""
        self.state.is_paused = False
        logger.info("Simulation resumed")
    
    def stop(self):
        """Stop and close simulation"""
        if self.is_connected:
            try:
                traci.close()
                self.is_connected = False
                self.state.is_running = False
                logger.info("Simulation stopped")
            except Exception as e:
                logger.error(f"Error stopping simulation: {e}")
    
    def _collect_metrics(self) -> TrafficMetrics:
        """
        Collect traffic metrics at current step
        
        Returns:
            TrafficMetrics object
        """
        try:
            # Get vehicle IDs
            vehicle_ids = traci.vehicle.getIDList()
            vehicle_count = len(vehicle_ids)
            
            # Update state
            self.state.running_vehicles = vehicle_count
            self.state.departed_vehicles = traci.simulation.getDepartedNumber()
            self.state.arrived_vehicles = traci.simulation.getArrivedNumber()
            self.state.teleported_vehicles = traci.simulation.getStartingTeleportNumber()
            
            # Calculate average speed
            if vehicle_count > 0:
                speeds = [traci.vehicle.getSpeed(vid) for vid in vehicle_ids]
                avg_speed = sum(speeds) / len(speeds)
            else:
                avg_speed = 0.0
            
            # Calculate average waiting time
            if vehicle_count > 0:
                waiting_times = [traci.vehicle.getWaitingTime(vid) for vid in vehicle_ids]
                avg_waiting = sum(waiting_times) / len(waiting_times)
                total_delay = sum(waiting_times)
            else:
                avg_waiting = 0.0
                total_delay = 0.0
            
            # Get queue lengths at edges
            queue_lengths = self._get_queue_lengths()
            
            # Get throughput (vehicles passed through edges)
            throughput = self._get_throughput()
            
            return TrafficMetrics(
                timestamp=self.state.current_time,
                step=self.state.current_step,
                vehicle_count=vehicle_count,
                average_speed=avg_speed,
                average_waiting_time=avg_waiting,
                total_delay=total_delay,
                queue_lengths=queue_lengths,
                throughput=throughput
            )
            
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            # Return empty metrics
            return TrafficMetrics(
                timestamp=self.state.current_time,
                step=self.state.current_step,
                vehicle_count=0,
                average_speed=0.0,
                average_waiting_time=0.0,
                total_delay=0.0,
                queue_lengths={},
                throughput={}
            )
    
    def _get_queue_lengths(self) -> Dict[str, int]:
        """Get queue lengths for all edges"""
        queue_lengths = {}
        
        try:
            edge_ids = traci.edge.getIDList()
            
            for edge_id in edge_ids:
                # Get number of halting vehicles on edge
                halting = traci.edge.getLastStepHaltingNumber(edge_id)
                if halting > 0:
                    queue_lengths[edge_id] = halting
        
        except Exception as e:
            logger.error(f"Error getting queue lengths: {e}")
        
        return queue_lengths
    
    def _get_throughput(self) -> Dict[str, int]:
        """Get throughput for all edges"""
        throughput = {}
        
        try:
            edge_ids = traci.edge.getIDList()
            
            for edge_id in edge_ids:
                # Get number of vehicles that passed through edge
                vehicle_count = traci.edge.getLastStepVehicleNumber(edge_id)
                if vehicle_count > 0:
                    throughput[edge_id] = vehicle_count
        
        except Exception as e:
            logger.error(f"Error getting throughput: {e}")
        
        return throughput
    
    def get_vehicle_positions(self) -> List[Dict]:
        """
        Get current positions of all vehicles
        
        Returns:
            List of vehicle position dictionaries
        """
        positions = []
        
        try:
            vehicle_ids = traci.vehicle.getIDList()
            
            for vid in vehicle_ids:
                pos = traci.vehicle.getPosition(vid)
                speed = traci.vehicle.getSpeed(vid)
                angle = traci.vehicle.getAngle(vid)
                vtype = traci.vehicle.getTypeID(vid)
                
                positions.append({
                    "id": vid,
                    "x": pos[0],
                    "y": pos[1],
                    "speed": speed,
                    "angle": angle,
                    "type": vtype
                })
        
        except Exception as e:
            logger.error(f"Error getting vehicle positions: {e}")
        
        return positions
    
    def get_signal_states(self) -> Dict[str, Dict]:
        """
        Get current signal states for all traffic lights
        
        Returns:
            Dictionary mapping TLS ID to state info
        """
        signal_states = {}
        
        try:
            tls_ids = traci.trafficlight.getIDList()
            
            for tls_id in tls_ids:
                state = traci.trafficlight.getRedYellowGreenState(tls_id)
                phase = traci.trafficlight.getPhase(tls_id)
                next_switch = traci.trafficlight.getNextSwitch(tls_id)
                
                signal_states[tls_id] = {
                    "state": state,
                    "phase": phase,
                    "next_switch": next_switch
                }
        
        except Exception as e:
            logger.error(f"Error getting signal states: {e}")
        
        return signal_states
    
    def get_summary_statistics(self) -> Dict:
        """
        Get summary statistics for completed simulation
        
        Returns:
            Dictionary of summary statistics
        """
        if not self.metrics_history:
            return {}
        
        # Calculate averages
        total_steps = len(self.metrics_history)
        avg_vehicles = sum(m.vehicle_count for m in self.metrics_history) / total_steps
        avg_speed = sum(m.average_speed for m in self.metrics_history) / total_steps
        avg_waiting = sum(m.average_waiting_time for m in self.metrics_history) / total_steps
        total_delay = sum(m.total_delay for m in self.metrics_history)
        
        # Calculate throughput
        total_arrived = self.state.arrived_vehicles
        simulation_duration = self.state.current_time
        throughput_per_hour = (total_arrived / simulation_duration) * 3600 if simulation_duration > 0 else 0
        
        return {
            "total_steps": total_steps,
            "simulation_duration": simulation_duration,
            "total_departed": self.state.departed_vehicles,
            "total_arrived": total_arrived,
            "total_teleported": self.state.teleported_vehicles,
            "average_vehicles": avg_vehicles,
            "average_speed": avg_speed,
            "average_waiting_time": avg_waiting,
            "total_delay": total_delay,
            "average_delay_per_vehicle": total_delay / total_arrived if total_arrived > 0 else 0,
            "throughput_per_hour": throughput_per_hour
        }
    
    def set_step_callback(self, callback: Callable[[int, TrafficMetrics], None]):
        """Set callback function called after each step"""
        self.step_callback = callback
    
    def set_error_callback(self, callback: Callable[[Exception], None]):
        """Set callback function called on errors"""
        self.error_callback = callback


def check_traci_available() -> bool:
    """Check if TraCI is available"""
    return TRACI_AVAILABLE
