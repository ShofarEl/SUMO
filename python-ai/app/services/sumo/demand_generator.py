"""
Traffic Demand Generation for Georgetown Simulations

This module generates traffic demand profiles for different time periods
using standard traffic engineering methods.
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
import logging
import random

logger = logging.getLogger(__name__)


@dataclass
class TimePeriod:
    """Time period configuration"""
    name: str
    start_hour: float
    end_hour: float
    demand_multiplier: float
    description: str


class DemandProfile:
    """Traffic demand profile for a time period"""
    
    # Time period definitions
    MORNING_PEAK = TimePeriod(
        name="morning_peak",
        start_hour=7.0,
        end_hour=9.0,
        demand_multiplier=1.8,
        description="Morning peak (7-9am)"
    )
    
    OFF_PEAK = TimePeriod(
        name="off_peak",
        start_hour=10.0,
        end_hour=15.0,
        demand_multiplier=1.0,
        description="Off-peak hours (10am-3pm)"
    )
    
    EVENING_PEAK = TimePeriod(
        name="evening_peak",
        start_hour=16.0,
        end_hour=18.5,
        demand_multiplier=2.0,
        description="Evening peak (4-6:30pm)"
    )
    
    @classmethod
    def get_period(cls, period_name: str) -> TimePeriod:
        """
        Get time period configuration by name
        
        Args:
            period_name: Name of time period
            
        Returns:
            TimePeriod configuration
        """
        periods = {
            "morning_peak": cls.MORNING_PEAK,
            "off_peak": cls.OFF_PEAK,
            "evening_peak": cls.EVENING_PEAK
        }
        return periods.get(period_name, cls.OFF_PEAK)
    
    @classmethod
    def get_all_periods(cls) -> Dict[str, TimePeriod]:
        """Get all time period configurations"""
        return {
            "morning_peak": cls.MORNING_PEAK,
            "off_peak": cls.OFF_PEAK,
            "evening_peak": cls.EVENING_PEAK
        }


class TrafficDemandGenerator:
    """Generate traffic demand for SUMO simulations"""
    
    # Base demand levels (vehicles per hour per entry point)
    BASE_DEMAND = {
        "low": 200,
        "medium": 400,
        "high": 600,
        "peak": 800
    }
    
    # Hotspot multipliers for known congestion areas
    HOTSPOT_MULTIPLIERS = {
        "demerara_bridge_approach": 2.5,  # Demerara Bridge is major bottleneck
        "vlissengen_road": 1.8,
        "sheriff_street": 1.6,
        "camp_street": 1.4,
        "regent_street": 1.3
    }
    
    def __init__(self, output_dir: str = "data/sumo/routes"):
        """
        Initialize demand generator
        
        Args:
            output_dir: Directory for output files
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def calculate_demand_rate(
        self,
        base_level: str,
        time_period: str,
        hotspot: Optional[str] = None
    ) -> float:
        """
        Calculate demand rate (vehicles/hour) for given conditions
        
        Args:
            base_level: Base demand level (low, medium, high, peak)
            time_period: Time period (morning_peak, off_peak, evening_peak)
            hotspot: Optional hotspot identifier for multiplier
            
        Returns:
            Demand rate in vehicles per hour
        """
        base = self.BASE_DEMAND.get(base_level, self.BASE_DEMAND["medium"])
        period = DemandProfile.get_period(time_period)
        
        demand = base * period.demand_multiplier
        
        # Apply hotspot multiplier if specified
        if hotspot and hotspot in self.HOTSPOT_MULTIPLIERS:
            demand *= self.HOTSPOT_MULTIPLIERS[hotspot]
            logger.debug(f"Applied hotspot multiplier for {hotspot}: {self.HOTSPOT_MULTIPLIERS[hotspot]}")
        
        return demand
    
    def generate_flow_xml(
        self,
        edge_id: str,
        vehicle_type: str,
        vehicles_per_hour: float,
        begin_time: int,
        end_time: int,
        route_id: str,
        flow_id: Optional[str] = None
    ) -> ET.Element:
        """
        Generate SUMO flow XML element
        
        Args:
            edge_id: Starting edge ID
            vehicle_type: Vehicle type ID
            vehicles_per_hour: Flow rate in vehicles/hour
            begin_time: Start time in seconds
            end_time: End time in seconds
            route_id: Route ID
            flow_id: Optional flow ID
            
        Returns:
            XML Element for flow
        """
        if flow_id is None:
            flow_id = f"flow_{edge_id}_{vehicle_type}_{begin_time}"
        
        flow = ET.Element("flow")
        flow.set("id", flow_id)
        flow.set("type", vehicle_type)
        flow.set("route", route_id)
        flow.set("begin", str(begin_time))
        flow.set("end", str(end_time))
        
        # Convert vehicles/hour to vehicles/second
        veh_per_second = vehicles_per_hour / 3600.0
        
        # Set flow rate (vehicles per hour)
        flow.set("vehsPerHour", f"{vehicles_per_hour:.2f}")
        
        # Alternative: set period between vehicles
        if veh_per_second > 0:
            period = 1.0 / veh_per_second
            flow.set("period", f"{period:.2f}")
        
        return flow
    
    def create_simple_route(
        self,
        route_id: str,
        edges: List[str]
    ) -> ET.Element:
        """
        Create simple route XML element
        
        Args:
            route_id: Route ID
            edges: List of edge IDs
            
        Returns:
            XML Element for route
        """
        route = ET.Element("route")
        route.set("id", route_id)
        route.set("edges", " ".join(edges))
        return route
    
    def generate_od_matrix(
        self,
        origins: List[str],
        destinations: List[str],
        base_demand: float,
        distribution: str = "uniform"
    ) -> Dict[Tuple[str, str], float]:
        """
        Generate origin-destination matrix
        
        Args:
            origins: List of origin edge IDs
            destinations: List of destination edge IDs
            base_demand: Base demand level
            distribution: Distribution type (uniform, random, gravity)
            
        Returns:
            Dictionary mapping (origin, destination) to demand
        """
        od_matrix = {}
        
        if distribution == "uniform":
            # Equal distribution across all OD pairs
            demand_per_pair = base_demand / (len(origins) * len(destinations))
            for origin in origins:
                for dest in destinations:
                    if origin != dest:
                        od_matrix[(origin, dest)] = demand_per_pair
        
        elif distribution == "random":
            # Random distribution with some variation
            total_pairs = len(origins) * len(destinations)
            for origin in origins:
                for dest in destinations:
                    if origin != dest:
                        # Random factor between 0.5 and 1.5
                        factor = random.uniform(0.5, 1.5)
                        od_matrix[(origin, dest)] = (base_demand / total_pairs) * factor
        
        elif distribution == "gravity":
            # Gravity model: higher demand for closer pairs
            # Simplified version without actual distances
            for origin in origins:
                for dest in destinations:
                    if origin != dest:
                        # Simulate distance effect with random factor
                        distance_factor = random.uniform(0.3, 1.0)
                        od_matrix[(origin, dest)] = base_demand * distance_factor / len(origins)
        
        logger.info(f"Generated OD matrix with {len(od_matrix)} pairs, total demand: {sum(od_matrix.values()):.0f}")
        return od_matrix
    
    def create_demand_file(
        self,
        routes: List[Dict],
        flows: List[Dict],
        output_file: Optional[str] = None,
        time_period: str = "off_peak"
    ) -> str:
        """
        Create SUMO route/demand file
        
        Args:
            routes: List of route dictionaries with 'id' and 'edges'
            flows: List of flow dictionaries with demand parameters
            output_file: Output file path (optional)
            time_period: Time period name for filename
            
        Returns:
            Path to generated file
        """
        if output_file is None:
            output_file = str(self.output_dir / f"demand_{time_period}.rou.xml")
        
        root = ET.Element("routes")
        root.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")
        root.set("xsi:noNamespaceSchemaLocation",
                "http://sumo.dlr.de/xsd/routes_file.xsd")
        
        # Add routes
        for route_def in routes:
            route = self.create_simple_route(
                route_id=route_def["id"],
                edges=route_def["edges"]
            )
            root.append(route)
        
        # Add flows
        for flow_def in flows:
            flow = self.generate_flow_xml(
                edge_id=flow_def["edge_id"],
                vehicle_type=flow_def["vehicle_type"],
                vehicles_per_hour=flow_def["vehicles_per_hour"],
                begin_time=flow_def["begin_time"],
                end_time=flow_def["end_time"],
                route_id=flow_def["route_id"],
                flow_id=flow_def.get("flow_id")
            )
            root.append(flow)
        
        # Write to file
        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ")
        tree.write(output_file, encoding="utf-8", xml_declaration=True)
        
        logger.info(f"Created demand file: {output_file} ({len(routes)} routes, {len(flows)} flows)")
        return output_file
    
    def generate_time_period_demand(
        self,
        period_name: str,
        routes: List[Dict],
        vehicle_mix: Dict[str, float],
        base_demand_level: str = "medium",
        output_file: Optional[str] = None
    ) -> str:
        """
        Generate demand file for a specific time period
        
        Args:
            period_name: Time period name (morning_peak, off_peak, evening_peak)
            routes: List of route definitions
            vehicle_mix: Vehicle type distribution
            base_demand_level: Base demand level
            output_file: Output file path (optional)
            
        Returns:
            Path to generated demand file
        """
        period = DemandProfile.get_period(period_name)
        
        # Calculate simulation time in seconds
        duration_hours = period.end_hour - period.start_hour
        begin_time = 0
        end_time = int(duration_hours * 3600)
        
        # Calculate total demand
        base_demand = self.BASE_DEMAND.get(base_demand_level, self.BASE_DEMAND["medium"])
        total_demand = base_demand * period.demand_multiplier
        
        # Generate flows for each route and vehicle type
        flows = []
        for route_def in routes:
            # Distribute demand across routes
            route_demand = total_demand / len(routes)
            
            # Apply hotspot multiplier if route has hotspot tag
            if "hotspot" in route_def:
                hotspot_mult = self.HOTSPOT_MULTIPLIERS.get(
                    route_def["hotspot"], 1.0
                )
                route_demand *= hotspot_mult
            
            # Create flows for each vehicle type
            for vtype, percentage in vehicle_mix.items():
                vtype_demand = route_demand * percentage
                
                flow_def = {
                    "edge_id": route_def["edges"][0],
                    "vehicle_type": vtype,
                    "vehicles_per_hour": vtype_demand,
                    "begin_time": begin_time,
                    "end_time": end_time,
                    "route_id": route_def["id"],
                    "flow_id": f"flow_{route_def['id']}_{vtype}"
                }
                flows.append(flow_def)
        
        # Create demand file
        return self.create_demand_file(
            routes=routes,
            flows=flows,
            output_file=output_file,
            time_period=period_name
        )
    
    def get_time_period_info(self, period_name: str) -> Dict:
        """
        Get information about a time period
        
        Args:
            period_name: Time period name
            
        Returns:
            Dictionary with period information
        """
        period = DemandProfile.get_period(period_name)
        return {
            "name": period.name,
            "start_hour": period.start_hour,
            "end_hour": period.end_hour,
            "duration_hours": period.end_hour - period.start_hour,
            "demand_multiplier": period.demand_multiplier,
            "description": period.description
        }


def get_time_periods() -> Dict[str, Dict]:
    """
    Get all available time periods
    
    Returns:
        Dictionary of time period configurations
    """
    periods = DemandProfile.get_all_periods()
    return {
        name: {
            "start_hour": p.start_hour,
            "end_hour": p.end_hour,
            "demand_multiplier": p.demand_multiplier,
            "description": p.description
        }
        for name, p in periods.items()
    }


def get_base_demand_levels() -> Dict[str, int]:
    """
    Get base demand levels
    
    Returns:
        Dictionary of demand levels
    """
    return TrafficDemandGenerator.BASE_DEMAND.copy()
