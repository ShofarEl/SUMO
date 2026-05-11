"""
Intersection Configuration Service

This module handles identification and configuration of traffic signal
intersections in Georgetown, including signal phase definitions and timing.
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import xml.etree.ElementTree as ET
from pathlib import Path

logger = logging.getLogger(__name__)


class IntersectionConfig:
    """Configuration manager for traffic signal intersections"""
    
    # Standard signal phase durations (in seconds)
    DEFAULT_CYCLE_LENGTH = 90  # Total cycle length
    DEFAULT_GREEN_TIME = 30    # Green phase duration
    DEFAULT_YELLOW_TIME = 3    # Yellow phase duration
    DEFAULT_RED_TIME = 57      # Red phase duration (includes other phases)
    
    # Signal phase types
    PHASE_TYPES = {
        "NS_GREEN": "North-South green, East-West red",
        "EW_GREEN": "East-West green, North-South red",
        "NS_LEFT": "North-South left turn",
        "EW_LEFT": "East-West left turn",
        "ALL_RED": "All directions red (clearance)"
    }
    
    def __init__(self):
        """Initialize intersection configuration manager"""
        self.configurations = {}
    
    def create_standard_signal_config(
        self,
        intersection_id: str,
        cycle_length: int = DEFAULT_CYCLE_LENGTH,
        num_phases: int = 2
    ) -> Dict:
        """
        Create standard signal configuration for an intersection
        
        Args:
            intersection_id: Intersection identifier
            cycle_length: Total cycle length in seconds
            num_phases: Number of signal phases (2 or 4)
            
        Returns:
            Signal configuration dictionary
        """
        if num_phases == 2:
            # Simple 2-phase signal (NS and EW)
            phases = self._create_two_phase_config(cycle_length)
        elif num_phases == 4:
            # 4-phase signal with protected left turns
            phases = self._create_four_phase_config(cycle_length)
        else:
            raise ValueError(f"Unsupported number of phases: {num_phases}")
        
        config = {
            "intersection_id": intersection_id,
            "cycle_length": cycle_length,
            "num_phases": num_phases,
            "phases": phases,
            "type": "actuated",  # Can be "fixed" or "actuated"
            "created_at": datetime.utcnow().isoformat()
        }
        
        self.configurations[intersection_id] = config
        logger.info(f"Created {num_phases}-phase signal config for intersection {intersection_id}")
        
        return config
    
    def _create_two_phase_config(self, cycle_length: int) -> List[Dict]:
        """
        Create 2-phase signal configuration
        
        Phase 1: North-South green
        Phase 2: East-West green
        
        Args:
            cycle_length: Total cycle length in seconds
            
        Returns:
            List of phase configurations
        """
        yellow_time = self.DEFAULT_YELLOW_TIME
        all_red_time = 2  # Clearance time
        
        # Calculate green times
        available_time = cycle_length - 2 * (yellow_time + all_red_time)
        green_time = available_time // 2
        
        phases = [
            {
                "phase_id": 1,
                "name": "NS_GREEN",
                "description": "North-South green, East-West red",
                "duration": green_time,
                "green_directions": ["N", "S"],
                "yellow_duration": yellow_time,
                "all_red_duration": all_red_time
            },
            {
                "phase_id": 2,
                "name": "EW_GREEN",
                "description": "East-West green, North-South red",
                "duration": green_time,
                "green_directions": ["E", "W"],
                "yellow_duration": yellow_time,
                "all_red_duration": all_red_time
            }
        ]
        
        return phases
    
    def _create_four_phase_config(self, cycle_length: int) -> List[Dict]:
        """
        Create 4-phase signal configuration with protected left turns
        
        Phase 1: North-South through
        Phase 2: North-South left turn
        Phase 3: East-West through
        Phase 4: East-West left turn
        
        Args:
            cycle_length: Total cycle length in seconds
            
        Returns:
            List of phase configurations
        """
        yellow_time = self.DEFAULT_YELLOW_TIME
        all_red_time = 2
        left_turn_time = 15  # Shorter time for left turns
        
        # Calculate through green times
        available_time = cycle_length - 4 * (yellow_time + all_red_time) - 2 * left_turn_time
        through_time = available_time // 2
        
        phases = [
            {
                "phase_id": 1,
                "name": "NS_THROUGH",
                "description": "North-South through traffic",
                "duration": through_time,
                "green_directions": ["N", "S"],
                "yellow_duration": yellow_time,
                "all_red_duration": all_red_time
            },
            {
                "phase_id": 2,
                "name": "NS_LEFT",
                "description": "North-South left turn",
                "duration": left_turn_time,
                "green_directions": ["N_LEFT", "S_LEFT"],
                "yellow_duration": yellow_time,
                "all_red_duration": all_red_time
            },
            {
                "phase_id": 3,
                "name": "EW_THROUGH",
                "description": "East-West through traffic",
                "duration": through_time,
                "green_directions": ["E", "W"],
                "yellow_duration": yellow_time,
                "all_red_duration": all_red_time
            },
            {
                "phase_id": 4,
                "name": "EW_LEFT",
                "description": "East-West left turn",
                "duration": left_turn_time,
                "green_directions": ["E_LEFT", "W_LEFT"],
                "yellow_duration": yellow_time,
                "all_red_duration": all_red_time
            }
        ]
        
        return phases
    
    def create_adaptive_signal_config(
        self,
        intersection_id: str,
        min_green: int = 10,
        max_green: int = 60,
        detector_gap: float = 3.0
    ) -> Dict:
        """
        Create adaptive (actuated) signal configuration
        
        Args:
            intersection_id: Intersection identifier
            min_green: Minimum green time in seconds
            max_green: Maximum green time in seconds
            detector_gap: Gap time for vehicle detection in seconds
            
        Returns:
            Adaptive signal configuration
        """
        config = {
            "intersection_id": intersection_id,
            "type": "actuated",
            "min_green": min_green,
            "max_green": max_green,
            "detector_gap": detector_gap,
            "extension_time": 3.0,  # Time to extend green per vehicle
            "yellow_time": self.DEFAULT_YELLOW_TIME,
            "all_red_time": 2,
            "created_at": datetime.utcnow().isoformat()
        }
        
        self.configurations[intersection_id] = config
        logger.info(f"Created adaptive signal config for intersection {intersection_id}")
        
        return config
    
    def configure_key_intersections(self) -> Dict[str, Dict]:
        """
        Configure signal timing for Georgetown's key congested intersections
        
        Returns:
            Dictionary of intersection configurations
        """
        key_configs = {}
        
        # Vlissengen Road - High traffic, 4-phase signal
        key_configs["vlissengen_road"] = self.create_standard_signal_config(
            intersection_id="vlissengen_road",
            cycle_length=120,
            num_phases=4
        )
        
        # Sheriff Street - Medium traffic, 2-phase signal
        key_configs["sheriff_street"] = self.create_standard_signal_config(
            intersection_id="sheriff_street",
            cycle_length=90,
            num_phases=2
        )
        
        # Demerara Bridge Approach - High traffic, adaptive signal
        key_configs["demerara_bridge_approach"] = self.create_adaptive_signal_config(
            intersection_id="demerara_bridge_approach",
            min_green=15,
            max_green=90
        )
        
        # Camp Street - Medium traffic, 2-phase signal
        key_configs["camp_street"] = self.create_standard_signal_config(
            intersection_id="camp_street",
            cycle_length=90,
            num_phases=2
        )
        
        # Regent Street - Commercial area, 2-phase signal
        key_configs["regent_street"] = self.create_standard_signal_config(
            intersection_id="regent_street",
            cycle_length=90,
            num_phases=2
        )
        
        logger.info(f"Configured {len(key_configs)} key intersections")
        return key_configs
    
    def extract_intersection_geometry(
        self,
        intersection_data: Dict
    ) -> Dict:
        """
        Extract and structure intersection geometry data
        
        Args:
            intersection_data: Raw intersection data from OSM
            
        Returns:
            Structured geometry data
        """
        geometry = {
            "osm_id": intersection_data.get("osm_id"),
            "location": {
                "lat": intersection_data.get("lat"),
                "lon": intersection_data.get("lon")
            },
            "roads": [],
            "degree": intersection_data.get("degree", 0)
        }
        
        # Extract connected roads
        streets = intersection_data.get("streets", [])
        for street in streets:
            road = {
                "name": street,
                "direction": self._infer_direction(street),
                "lanes": 2  # Default, should be extracted from OSM data
            }
            geometry["roads"].append(road)
        
        return geometry
    
    def _infer_direction(self, street_name: str) -> str:
        """
        Infer primary direction from street name
        
        Args:
            street_name: Name of the street
            
        Returns:
            Direction string (N, S, E, W, or "unknown")
        """
        street_lower = street_name.lower()
        
        # Simple heuristic based on common naming patterns
        if "north" in street_lower:
            return "N"
        elif "south" in street_lower:
            return "S"
        elif "east" in street_lower:
            return "E"
        elif "west" in street_lower:
            return "W"
        else:
            return "unknown"
    
    def export_to_sumo_tls(
        self,
        config: Dict,
        output_file: str
    ) -> str:
        """
        Export signal configuration to SUMO TLS (Traffic Light System) format
        
        Args:
            config: Signal configuration dictionary
            output_file: Output file path
            
        Returns:
            Path to exported file
        """
        root = ET.Element("additional")
        
        # Create traffic light logic
        tls = ET.SubElement(root, "tlLogic")
        tls.set("id", config["intersection_id"])
        tls.set("type", config.get("type", "static"))
        tls.set("programID", "0")
        tls.set("offset", "0")
        
        # Add phases
        for phase in config.get("phases", []):
            phase_elem = ET.SubElement(tls, "phase")
            phase_elem.set("duration", str(phase["duration"]))
            
            # Create state string (simplified - would need actual lane configuration)
            # G = green, y = yellow, r = red
            state = self._create_phase_state(phase)
            phase_elem.set("state", state)
        
        # Write to file
        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ")
        tree.write(output_file, encoding="utf-8", xml_declaration=True)
        
        logger.info(f"Exported TLS configuration to: {output_file}")
        return output_file
    
    def _create_phase_state(self, phase: Dict) -> str:
        """
        Create SUMO phase state string
        
        Args:
            phase: Phase configuration
            
        Returns:
            State string (e.g., "GGrrrrGGrrrr")
        """
        # Simplified state string - in practice, this would be based on
        # actual lane configuration from the network
        green_dirs = phase.get("green_directions", [])
        
        if "N" in green_dirs and "S" in green_dirs:
            return "GGGrrrrr"  # NS green, EW red
        elif "E" in green_dirs and "W" in green_dirs:
            return "rrrGGGGG"  # NS red, EW green
        else:
            return "rrrrrrrr"  # All red
    
    def get_configuration(self, intersection_id: str) -> Optional[Dict]:
        """
        Get signal configuration for an intersection
        
        Args:
            intersection_id: Intersection identifier
            
        Returns:
            Configuration dictionary or None
        """
        return self.configurations.get(intersection_id)
    
    def update_phase_timing(
        self,
        intersection_id: str,
        phase_id: int,
        new_duration: int
    ) -> bool:
        """
        Update timing for a specific phase
        
        Args:
            intersection_id: Intersection identifier
            phase_id: Phase identifier
            new_duration: New duration in seconds
            
        Returns:
            True if updated successfully
        """
        config = self.configurations.get(intersection_id)
        if not config:
            logger.warning(f"Configuration not found for intersection {intersection_id}")
            return False
        
        phases = config.get("phases", [])
        for phase in phases:
            if phase["phase_id"] == phase_id:
                old_duration = phase["duration"]
                phase["duration"] = new_duration
                logger.info(
                    f"Updated phase {phase_id} timing for {intersection_id}: "
                    f"{old_duration}s -> {new_duration}s"
                )
                return True
        
        logger.warning(f"Phase {phase_id} not found in intersection {intersection_id}")
        return False
    
    def calculate_cycle_length(self, phases: List[Dict]) -> int:
        """
        Calculate total cycle length from phases
        
        Args:
            phases: List of phase configurations
            
        Returns:
            Total cycle length in seconds
        """
        total = 0
        for phase in phases:
            total += phase.get("duration", 0)
            total += phase.get("yellow_duration", 0)
            total += phase.get("all_red_duration", 0)
        
        return total
    
    def validate_configuration(self, config: Dict) -> Tuple[bool, List[str]]:
        """
        Validate signal configuration
        
        Args:
            config: Signal configuration dictionary
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check required fields
        if "intersection_id" not in config:
            errors.append("Missing intersection_id")
        
        if "phases" in config:
            phases = config["phases"]
            
            # Check phase durations
            for phase in phases:
                if phase.get("duration", 0) <= 0:
                    errors.append(f"Invalid duration for phase {phase.get('phase_id')}")
                
                if phase.get("yellow_duration", 0) < 0:
                    errors.append(f"Invalid yellow duration for phase {phase.get('phase_id')}")
            
            # Check total cycle length
            cycle_length = self.calculate_cycle_length(phases)
            if cycle_length < 30:
                errors.append(f"Cycle length too short: {cycle_length}s (minimum 30s)")
            elif cycle_length > 300:
                errors.append(f"Cycle length too long: {cycle_length}s (maximum 300s)")
        
        is_valid = len(errors) == 0
        return is_valid, errors


def create_intersection_database_entry(
    osm_id: str,
    name: str,
    lat: float,
    lon: float,
    signal_config: Dict,
    is_congestion_hotspot: bool = False,
    description: Optional[str] = None
) -> Dict:
    """
    Create a complete intersection database entry
    
    Args:
        osm_id: OpenStreetMap node ID
        name: Intersection name
        lat: Latitude
        lon: Longitude
        signal_config: Signal configuration dictionary
        is_congestion_hotspot: Whether this is a known congestion point
        description: Optional description
        
    Returns:
        Complete intersection document for database storage
    """
    return {
        "osm_id": osm_id,
        "name": name,
        "location": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "lat": lat,
        "lon": lon,
        "signal_config": signal_config,
        "is_congestion_hotspot": is_congestion_hotspot,
        "description": description,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
