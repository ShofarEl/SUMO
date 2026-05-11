"""
Simulation Data Collection and Storage

This module handles collection of simulation data and storage in MongoDB.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict
import statistics

logger = logging.getLogger(__name__)


@dataclass
class VehicleData:
    """Vehicle state data"""
    vehicle_id: str
    timestamp: float
    step: int
    position_x: float
    position_y: float
    speed: float
    angle: float
    vehicle_type: str
    edge_id: Optional[str] = None
    lane_id: Optional[str] = None
    waiting_time: float = 0.0


@dataclass
class SignalData:
    """Traffic signal state data"""
    tls_id: str
    timestamp: float
    step: int
    state: str
    phase: int
    next_switch: float


@dataclass
class EdgeData:
    """Edge/road segment data"""
    edge_id: str
    timestamp: float
    step: int
    vehicle_count: int
    halting_count: int
    mean_speed: float
    occupancy: float


@dataclass
class AggregatedMetrics:
    """Aggregated performance metrics"""
    simulation_id: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    total_steps: int
    
    # Vehicle metrics
    total_departed: int
    total_arrived: int
    total_teleported: int
    average_vehicles: float
    
    # Performance metrics
    average_speed: float
    average_waiting_time: float
    average_delay_per_vehicle: float
    total_delay: float
    
    # Throughput metrics
    throughput_per_hour: float
    
    # Queue metrics
    average_queue_length: float
    max_queue_length: int
    
    # Additional statistics
    speed_std_dev: Optional[float] = None
    waiting_time_std_dev: Optional[float] = None


class SimulationDataCollector:
    """Collect and aggregate simulation data"""
    
    def __init__(self):
        """Initialize data collector"""
        self.vehicle_data: List[VehicleData] = []
        self.signal_data: List[SignalData] = []
        self.edge_data: List[EdgeData] = []
        self.step_metrics: List[Dict] = []
    
    def collect_vehicle_data(
        self,
        vehicle_id: str,
        timestamp: float,
        step: int,
        position: tuple,
        speed: float,
        angle: float,
        vehicle_type: str,
        edge_id: Optional[str] = None,
        lane_id: Optional[str] = None,
        waiting_time: float = 0.0
    ):
        """Collect data for a single vehicle"""
        data = VehicleData(
            vehicle_id=vehicle_id,
            timestamp=timestamp,
            step=step,
            position_x=position[0],
            position_y=position[1],
            speed=speed,
            angle=angle,
            vehicle_type=vehicle_type,
            edge_id=edge_id,
            lane_id=lane_id,
            waiting_time=waiting_time
        )
        self.vehicle_data.append(data)
    
    def collect_signal_data(
        self,
        tls_id: str,
        timestamp: float,
        step: int,
        state: str,
        phase: int,
        next_switch: float
    ):
        """Collect traffic signal state data"""
        data = SignalData(
            tls_id=tls_id,
            timestamp=timestamp,
            step=step,
            state=state,
            phase=phase,
            next_switch=next_switch
        )
        self.signal_data.append(data)
    
    def collect_edge_data(
        self,
        edge_id: str,
        timestamp: float,
        step: int,
        vehicle_count: int,
        halting_count: int,
        mean_speed: float,
        occupancy: float
    ):
        """Collect edge/road segment data"""
        data = EdgeData(
            edge_id=edge_id,
            timestamp=timestamp,
            step=step,
            vehicle_count=vehicle_count,
            halting_count=halting_count,
            mean_speed=mean_speed,
            occupancy=occupancy
        )
        self.edge_data.append(data)
    
    def collect_step_metrics(self, metrics: Dict):
        """Collect metrics for a simulation step"""
        self.step_metrics.append(metrics)
    
    def calculate_aggregated_metrics(
        self,
        simulation_id: str,
        start_time: datetime,
        end_time: datetime,
        summary_stats: Dict
    ) -> AggregatedMetrics:
        """
        Calculate aggregated metrics from collected data
        
        Args:
            simulation_id: Simulation identifier
            start_time: Simulation start time
            end_time: Simulation end time
            summary_stats: Summary statistics from simulation runner
            
        Returns:
            AggregatedMetrics object
        """
        duration = (end_time - start_time).total_seconds()
        
        # Calculate queue metrics
        queue_lengths = []
        for metrics in self.step_metrics:
            if "queue_lengths" in metrics:
                total_queue = sum(metrics["queue_lengths"].values())
                queue_lengths.append(total_queue)
        
        avg_queue = statistics.mean(queue_lengths) if queue_lengths else 0.0
        max_queue = max(queue_lengths) if queue_lengths else 0
        
        # Calculate speed statistics
        speeds = [m.get("average_speed", 0) for m in self.step_metrics]
        speed_std = statistics.stdev(speeds) if len(speeds) > 1 else None
        
        # Calculate waiting time statistics
        waiting_times = [m.get("average_waiting_time", 0) for m in self.step_metrics]
        waiting_std = statistics.stdev(waiting_times) if len(waiting_times) > 1 else None
        
        return AggregatedMetrics(
            simulation_id=simulation_id,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            total_steps=summary_stats.get("total_steps", 0),
            total_departed=summary_stats.get("total_departed", 0),
            total_arrived=summary_stats.get("total_arrived", 0),
            total_teleported=summary_stats.get("total_teleported", 0),
            average_vehicles=summary_stats.get("average_vehicles", 0.0),
            average_speed=summary_stats.get("average_speed", 0.0),
            average_waiting_time=summary_stats.get("average_waiting_time", 0.0),
            average_delay_per_vehicle=summary_stats.get("average_delay_per_vehicle", 0.0),
            total_delay=summary_stats.get("total_delay", 0.0),
            throughput_per_hour=summary_stats.get("throughput_per_hour", 0.0),
            average_queue_length=avg_queue,
            max_queue_length=max_queue,
            speed_std_dev=speed_std,
            waiting_time_std_dev=waiting_std
        )
    
    def get_time_series_data(self) -> Dict[str, List]:
        """
        Get time series data for visualization
        
        Returns:
            Dictionary with time series arrays
        """
        timestamps = [m.get("timestamp", 0) for m in self.step_metrics]
        vehicle_counts = [m.get("vehicle_count", 0) for m in self.step_metrics]
        avg_speeds = [m.get("average_speed", 0) for m in self.step_metrics]
        avg_waiting = [m.get("average_waiting_time", 0) for m in self.step_metrics]
        
        return {
            "timestamps": timestamps,
            "vehicle_counts": vehicle_counts,
            "average_speeds": avg_speeds,
            "average_waiting_times": avg_waiting
        }
    
    def clear(self):
        """Clear all collected data"""
        self.vehicle_data.clear()
        self.signal_data.clear()
        self.edge_data.clear()
        self.step_metrics.clear()


class SimulationDataStorage:
    """Store simulation data in MongoDB"""
    
    def __init__(self, db):
        """
        Initialize storage with database connection
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.simulations_collection = db["simulations"]
        self.simulation_data_collection = db["simulation_data"]
    
    async def store_simulation_metadata(
        self,
        simulation_id: str,
        config: Dict,
        status: str = "running"
    ) -> str:
        """
        Store simulation metadata
        
        Args:
            simulation_id: Simulation identifier
            config: Simulation configuration
            status: Simulation status
            
        Returns:
            Inserted document ID
        """
        document = {
            "simulation_id": simulation_id,
            "config": config,
            "status": status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.simulations_collection.insert_one(document)
        logger.info(f"Stored simulation metadata: {simulation_id}")
        return str(result.inserted_id)
    
    async def update_simulation_status(
        self,
        simulation_id: str,
        status: str,
        results: Optional[Dict] = None
    ):
        """
        Update simulation status and results
        
        Args:
            simulation_id: Simulation identifier
            status: New status
            results: Optional results data
        """
        update_doc = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if results:
            update_doc["results"] = results
        
        await self.simulations_collection.update_one(
            {"simulation_id": simulation_id},
            {"$set": update_doc}
        )
        
        logger.info(f"Updated simulation status: {simulation_id} -> {status}")
    
    async def store_aggregated_metrics(
        self,
        metrics: AggregatedMetrics
    ) -> str:
        """
        Store aggregated metrics
        
        Args:
            metrics: AggregatedMetrics object
            
        Returns:
            Inserted document ID
        """
        document = asdict(metrics)
        document["data_type"] = "aggregated_metrics"
        document["created_at"] = datetime.utcnow()
        
        result = await self.simulation_data_collection.insert_one(document)
        logger.info(f"Stored aggregated metrics for simulation: {metrics.simulation_id}")
        return str(result.inserted_id)
    
    async def store_time_series_data(
        self,
        simulation_id: str,
        time_series: Dict[str, List]
    ) -> str:
        """
        Store time series data
        
        Args:
            simulation_id: Simulation identifier
            time_series: Time series data dictionary
            
        Returns:
            Inserted document ID
        """
        document = {
            "simulation_id": simulation_id,
            "data_type": "time_series",
            "time_series": time_series,
            "created_at": datetime.utcnow()
        }
        
        result = await self.simulation_data_collection.insert_one(document)
        logger.info(f"Stored time series data for simulation: {simulation_id}")
        return str(result.inserted_id)
    
    async def store_vehicle_trajectories(
        self,
        simulation_id: str,
        vehicle_data: List[VehicleData],
        sample_rate: int = 10
    ) -> str:
        """
        Store vehicle trajectory data (sampled)
        
        Args:
            simulation_id: Simulation identifier
            vehicle_data: List of VehicleData objects
            sample_rate: Store every Nth data point
            
        Returns:
            Inserted document ID
        """
        # Sample data to reduce storage
        sampled_data = [
            asdict(data) for i, data in enumerate(vehicle_data)
            if i % sample_rate == 0
        ]
        
        document = {
            "simulation_id": simulation_id,
            "data_type": "vehicle_trajectories",
            "sample_rate": sample_rate,
            "trajectories": sampled_data,
            "created_at": datetime.utcnow()
        }
        
        result = await self.simulation_data_collection.insert_one(document)
        logger.info(f"Stored {len(sampled_data)} vehicle trajectory samples for simulation: {simulation_id}")
        return str(result.inserted_id)
    
    async def get_simulation_results(
        self,
        simulation_id: str
    ) -> Optional[Dict]:
        """
        Get simulation results
        
        Args:
            simulation_id: Simulation identifier
            
        Returns:
            Simulation results dictionary or None
        """
        simulation = await self.simulations_collection.find_one(
            {"simulation_id": simulation_id}
        )
        
        if not simulation:
            return None
        
        # Get aggregated metrics
        metrics = await self.simulation_data_collection.find_one({
            "simulation_id": simulation_id,
            "data_type": "aggregated_metrics"
        })
        
        # Get time series
        time_series = await self.simulation_data_collection.find_one({
            "simulation_id": simulation_id,
            "data_type": "time_series"
        })
        
        return {
            "simulation": simulation,
            "metrics": metrics,
            "time_series": time_series.get("time_series") if time_series else None
        }
    
    async def create_indexes(self):
        """Create database indexes for performance"""
        # Simulation indexes
        await self.simulations_collection.create_index("simulation_id", unique=True)
        await self.simulations_collection.create_index("status")
        await self.simulations_collection.create_index("created_at")
        
        # Simulation data indexes
        await self.simulation_data_collection.create_index("simulation_id")
        await self.simulation_data_collection.create_index("data_type")
        await self.simulation_data_collection.create_index([
            ("simulation_id", 1),
            ("data_type", 1)
        ])
        
        logger.info("Created database indexes for simulation data")


def calculate_performance_metrics(
    aggregated_metrics: AggregatedMetrics,
    baseline_metrics: Optional[AggregatedMetrics] = None
) -> Dict:
    """
    Calculate performance metrics and improvements
    
    Args:
        aggregated_metrics: Current simulation metrics
        baseline_metrics: Optional baseline for comparison
        
    Returns:
        Dictionary of performance metrics
    """
    metrics = {
        "average_delay": aggregated_metrics.average_delay_per_vehicle,
        "average_queue_length": aggregated_metrics.average_queue_length,
        "throughput": aggregated_metrics.throughput_per_hour,
        "average_speed": aggregated_metrics.average_speed,
        "average_waiting_time": aggregated_metrics.average_waiting_time
    }
    
    if baseline_metrics:
        # Calculate improvements
        if baseline_metrics.average_delay_per_vehicle > 0:
            delay_reduction = (
                (baseline_metrics.average_delay_per_vehicle - aggregated_metrics.average_delay_per_vehicle)
                / baseline_metrics.average_delay_per_vehicle * 100
            )
            metrics["delay_reduction_percent"] = delay_reduction
        
        if baseline_metrics.average_queue_length > 0:
            queue_reduction = (
                (baseline_metrics.average_queue_length - aggregated_metrics.average_queue_length)
                / baseline_metrics.average_queue_length * 100
            )
            metrics["queue_reduction_percent"] = queue_reduction
        
        if baseline_metrics.throughput_per_hour > 0:
            throughput_increase = (
                (aggregated_metrics.throughput_per_hour - baseline_metrics.throughput_per_hour)
                / baseline_metrics.throughput_per_hour * 100
            )
            metrics["throughput_increase_percent"] = throughput_increase
    
    return metrics
