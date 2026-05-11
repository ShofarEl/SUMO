"""
SUMO Configuration Utilities

This module provides utilities for configuring SUMO simulations including
network setup, vehicle types, traffic demand, and simulation parameters.
"""

import os
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class SUMOConfig:
    """SUMO configuration manager for Georgetown traffic simulations"""
    
    def __init__(self, base_dir: str = "data/sumo"):
        """
        Initialize SUMO configuration manager
        
        Args:
            base_dir: Base directory for SUMO files
        """
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        # Define subdirectories
        self.network_dir = self.base_dir / "networks"
        self.routes_dir = self.base_dir / "routes"
        self.config_dir = self.base_dir / "configs"
        self.output_dir = self.base_dir / "outputs"
        
        # Create all directories
        for directory in [self.network_dir, self.routes_dir, self.config_dir, self.output_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def create_vehicle_types(self, output_file: Optional[str] = None) -> str:
        """
        Create vehicle type definitions for Georgetown traffic mix
        
        Vehicle mix based on Guyana statistics:
        - 55% cars
        - 25% motorcycles
        - 15% minibuses
        - 5% trucks
        
        Args:
            output_file: Output file path (optional)
            
        Returns:
            Path to generated vehicle types file
        """
        if output_file is None:
            output_file = str(self.config_dir / "vehicle_types.xml")
        
        root = ET.Element("additional")
        
        # Car type
        car = ET.SubElement(root, "vType")
        car.set("id", "car")
        car.set("vClass", "passenger")
        car.set("length", "4.5")
        car.set("width", "1.8")
        car.set("maxSpeed", "50")  # ~180 km/h max
        car.set("accel", "2.6")
        car.set("decel", "4.5")
        car.set("sigma", "0.5")
        car.set("color", "1,1,0")  # Yellow
        
        # Motorcycle type
        motorcycle = ET.SubElement(root, "vType")
        motorcycle.set("id", "motorcycle")
        motorcycle.set("vClass", "motorcycle")
        motorcycle.set("length", "2.2")
        motorcycle.set("width", "0.8")
        motorcycle.set("maxSpeed", "40")  # ~144 km/h max
        motorcycle.set("accel", "3.0")
        motorcycle.set("decel", "5.0")
        motorcycle.set("sigma", "0.6")
        motorcycle.set("color", "0,1,1")  # Cyan
        
        # Minibus type
        minibus = ET.SubElement(root, "vType")
        minibus.set("id", "minibus")
        minibus.set("vClass", "bus")
        minibus.set("length", "7.0")
        minibus.set("width", "2.4")
        minibus.set("maxSpeed", "35")  # ~126 km/h max
        minibus.set("accel", "1.8")
        minibus.set("decel", "3.5")
        minibus.set("sigma", "0.4")
        minibus.set("color", "0,0,1")  # Blue
        
        # Truck type
        truck = ET.SubElement(root, "vType")
        truck.set("id", "truck")
        truck.set("vClass", "truck")
        truck.set("length", "10.0")
        truck.set("width", "2.5")
        truck.set("maxSpeed", "30")  # ~108 km/h max
        truck.set("accel", "1.3")
        truck.set("decel", "3.0")
        truck.set("sigma", "0.3")
        truck.set("color", "1,0,0")  # Red
        
        # Write to file
        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ")
        tree.write(output_file, encoding="utf-8", xml_declaration=True)
        
        logger.info(f"Created vehicle types file: {output_file}")
        return output_file
    
    def create_simulation_config(
        self,
        network_file: str,
        route_file: str,
        output_file: Optional[str] = None,
        begin_time: int = 0,
        end_time: int = 3600,
        step_length: float = 1.0,
        additional_files: Optional[List[str]] = None
    ) -> str:
        """
        Create SUMO simulation configuration file
        
        Args:
            network_file: Path to network file (.net.xml)
            route_file: Path to route file (.rou.xml)
            output_file: Output config file path (optional)
            begin_time: Simulation start time in seconds
            end_time: Simulation end time in seconds
            step_length: Simulation step length in seconds
            additional_files: List of additional files (e.g., vehicle types)
            
        Returns:
            Path to generated config file
        """
        if output_file is None:
            output_file = str(self.config_dir / "simulation.sumocfg")
        
        root = ET.Element("configuration")
        
        # Input section
        input_elem = ET.SubElement(root, "input")
        net_file = ET.SubElement(input_elem, "net-file")
        net_file.set("value", network_file)
        
        route_file_elem = ET.SubElement(input_elem, "route-files")
        route_file_elem.set("value", route_file)
        
        if additional_files:
            add_files = ET.SubElement(input_elem, "additional-files")
            add_files.set("value", ",".join(additional_files))
        
        # Time section
        time_elem = ET.SubElement(root, "time")
        begin = ET.SubElement(time_elem, "begin")
        begin.set("value", str(begin_time))
        
        end = ET.SubElement(time_elem, "end")
        end.set("value", str(end_time))
        
        step = ET.SubElement(time_elem, "step-length")
        step.set("value", str(step_length))
        
        # Output section
        output_elem = ET.SubElement(root, "output")
        
        # Summary output
        summary = ET.SubElement(output_elem, "summary-output")
        summary.set("value", str(self.output_dir / "summary.xml"))
        
        # Trip info output
        tripinfo = ET.SubElement(output_elem, "tripinfo-output")
        tripinfo.set("value", str(self.output_dir / "tripinfo.xml"))
        
        # Queue output
        queue = ET.SubElement(output_elem, "queue-output")
        queue.set("value", str(self.output_dir / "queue.xml"))
        
        # Processing section
        processing_elem = ET.SubElement(root, "processing")
        
        # Collision detection
        collision = ET.SubElement(processing_elem, "collision.action")
        collision.set("value", "warn")
        
        # Time to teleport
        time_to_teleport = ET.SubElement(processing_elem, "time-to-teleport")
        time_to_teleport.set("value", "300")
        
        # Report section
        report_elem = ET.SubElement(root, "report")
        
        verbose = ET.SubElement(report_elem, "verbose")
        verbose.set("value", "true")
        
        no_warnings = ET.SubElement(report_elem, "no-warnings")
        no_warnings.set("value", "false")
        
        # Write to file
        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ")
        tree.write(output_file, encoding="utf-8", xml_declaration=True)
        
        logger.info(f"Created simulation config file: {output_file}")
        return output_file
    
    def get_vehicle_mix(self) -> Dict[str, float]:
        """
        Get Georgetown vehicle mix percentages
        
        Returns:
            Dictionary with vehicle type percentages
        """
        return {
            "car": 0.55,
            "motorcycle": 0.25,
            "minibus": 0.15,
            "truck": 0.05
        }
    
    def get_time_period_config(self, period: str) -> Dict[str, any]:
        """
        Get configuration for different time periods
        
        Args:
            period: Time period ('morning_peak', 'off_peak', 'evening_peak')
            
        Returns:
            Configuration dictionary with demand multipliers and time ranges
        """
        configs = {
            "morning_peak": {
                "start_hour": 7,
                "end_hour": 9,
                "demand_multiplier": 1.8,
                "description": "Morning peak (7-9am)"
            },
            "off_peak": {
                "start_hour": 10,
                "end_hour": 15,
                "demand_multiplier": 1.0,
                "description": "Off-peak hours"
            },
            "evening_peak": {
                "start_hour": 16,
                "end_hour": 18.5,
                "demand_multiplier": 2.0,
                "description": "Evening peak (4-6:30pm)"
            }
        }
        
        return configs.get(period, configs["off_peak"])
    
    def validate_network_file(self, network_file: str) -> bool:
        """
        Validate SUMO network file
        
        Args:
            network_file: Path to network file
            
        Returns:
            True if valid, False otherwise
        """
        try:
            tree = ET.parse(network_file)
            root = tree.getroot()
            
            # Check if it's a SUMO network file
            if root.tag != "net":
                logger.error(f"Invalid network file: root tag is {root.tag}, expected 'net'")
                return False
            
            # Check for required elements
            edges = root.findall("edge")
            junctions = root.findall("junction")
            
            if len(edges) == 0:
                logger.error("Network file has no edges")
                return False
            
            if len(junctions) == 0:
                logger.error("Network file has no junctions")
                return False
            
            logger.info(f"Network file validated: {len(edges)} edges, {len(junctions)} junctions")
            return True
            
        except Exception as e:
            logger.error(f"Error validating network file: {e}")
            return False
    
    def get_network_stats(self, network_file: str) -> Dict[str, int]:
        """
        Get statistics from SUMO network file
        
        Args:
            network_file: Path to network file
            
        Returns:
            Dictionary with network statistics
        """
        try:
            tree = ET.parse(network_file)
            root = tree.getroot()
            
            edges = root.findall("edge")
            junctions = root.findall("junction")
            connections = root.findall("connection")
            
            # Filter out internal edges
            regular_edges = [e for e in edges if not e.get("function") == "internal"]
            
            # Count traffic light junctions
            tl_junctions = [j for j in junctions if j.get("type") == "traffic_light"]
            
            stats = {
                "total_edges": len(regular_edges),
                "total_junctions": len(junctions),
                "traffic_light_junctions": len(tl_junctions),
                "connections": len(connections)
            }
            
            logger.info(f"Network stats: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error getting network stats: {e}")
            return {}


def get_sumo_binary() -> str:
    """
    Get path to SUMO binary
    
    Returns:
        Path to SUMO binary (sumo or sumo-gui)
    """
    sumo_home = os.environ.get("SUMO_HOME")
    
    if sumo_home:
        # Try sumo-gui first for visualization
        sumo_gui = os.path.join(sumo_home, "bin", "sumo-gui")
        if os.path.exists(sumo_gui):
            return sumo_gui
        
        # Fall back to command-line sumo
        sumo_bin = os.path.join(sumo_home, "bin", "sumo")
        if os.path.exists(sumo_bin):
            return sumo_bin
    
    # Try system PATH
    return "sumo"


def check_sumo_installation() -> Tuple[bool, str]:
    """
    Check if SUMO is properly installed
    
    Returns:
        Tuple of (is_installed, version_or_error_message)
    """
    try:
        import sumolib
        
        sumo_home = os.environ.get("SUMO_HOME")
        if not sumo_home:
            return False, "SUMO_HOME environment variable not set"
        
        if not os.path.exists(sumo_home):
            return False, f"SUMO_HOME path does not exist: {sumo_home}"
        
        # Try to get version
        version = sumolib.version.get_version()
        return True, f"SUMO {version}"
        
    except ImportError:
        return False, "sumolib not installed"
    except Exception as e:
        return False, str(e)
