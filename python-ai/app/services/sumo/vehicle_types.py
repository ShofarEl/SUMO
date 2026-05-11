"""
Vehicle Type Definitions for Georgetown Traffic Simulation

This module defines vehicle types based on Guyana's vehicle fleet composition
and provides utilities for generating vehicle type distributions.
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class VehicleTypeManager:
    """Manage vehicle type definitions for SUMO simulations"""
    
    # Georgetown vehicle mix based on Guyana statistics
    GEORGETOWN_VEHICLE_MIX = {
        "car": 0.55,        # 55% cars
        "motorcycle": 0.25,  # 25% motorcycles
        "minibus": 0.15,     # 15% minibuses
        "truck": 0.05        # 5% trucks
    }
    
    # Vehicle type specifications
    VEHICLE_SPECS = {
        "car": {
            "vClass": "passenger",
            "length": 4.5,
            "width": 1.8,
            "height": 1.5,
            "maxSpeed": 50.0,      # m/s (~180 km/h max)
            "accel": 2.6,          # m/s²
            "decel": 4.5,          # m/s²
            "sigma": 0.5,          # Driver imperfection (0-1)
            "tau": 1.0,            # Desired time headway (seconds)
            "speedFactor": 1.0,    # Speed distribution factor
            "speedDev": 0.1,       # Speed deviation
            "color": "1,1,0",      # Yellow
            "emissionClass": "HBEFA3/PC_G_EU4"
        },
        "motorcycle": {
            "vClass": "motorcycle",
            "length": 2.2,
            "width": 0.8,
            "height": 1.3,
            "maxSpeed": 40.0,      # m/s (~144 km/h max)
            "accel": 3.0,          # m/s²
            "decel": 5.0,          # m/s²
            "sigma": 0.6,          # Higher imperfection
            "tau": 0.8,            # Shorter headway
            "speedFactor": 1.1,    # Tend to go faster
            "speedDev": 0.15,
            "color": "0,1,1",      # Cyan
            "emissionClass": "HBEFA3/LDV_G_EU4"
        },
        "minibus": {
            "vClass": "bus",
            "length": 7.0,
            "width": 2.4,
            "height": 2.8,
            "maxSpeed": 35.0,      # m/s (~126 km/h max)
            "accel": 1.8,          # m/s²
            "decel": 3.5,          # m/s²
            "sigma": 0.4,
            "tau": 1.2,            # Longer headway
            "speedFactor": 0.95,
            "speedDev": 0.1,
            "color": "0,0,1",      # Blue
            "emissionClass": "HBEFA3/Bus"
        },
        "truck": {
            "vClass": "truck",
            "length": 10.0,
            "width": 2.5,
            "height": 3.5,
            "maxSpeed": 30.0,      # m/s (~108 km/h max)
            "accel": 1.3,          # m/s²
            "decel": 3.0,          # m/s²
            "sigma": 0.3,
            "tau": 1.5,            # Longest headway
            "speedFactor": 0.9,
            "speedDev": 0.08,
            "color": "1,0,0",      # Red
            "emissionClass": "HBEFA3/HDV"
        }
    }
    
    def __init__(self, output_dir: str = "data/sumo/configs"):
        """
        Initialize vehicle type manager
        
        Args:
            output_dir: Directory for output files
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def create_vehicle_types_xml(self, output_file: Optional[str] = None) -> str:
        """
        Create SUMO vehicle type definitions XML file
        
        Args:
            output_file: Output file path (optional)
            
        Returns:
            Path to generated file
        """
        if output_file is None:
            output_file = str(self.output_dir / "vehicle_types.xml")
        
        root = ET.Element("additional")
        root.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")
        root.set("xsi:noNamespaceSchemaLocation", 
                "http://sumo.dlr.de/xsd/additional_file.xsd")
        
        # Create vehicle type definitions
        for vtype_id, specs in self.VEHICLE_SPECS.items():
            vtype = ET.SubElement(root, "vType")
            vtype.set("id", vtype_id)
            
            # Set all attributes
            for key, value in specs.items():
                vtype.set(key, str(value))
        
        # Write to file with proper formatting
        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ")
        tree.write(output_file, encoding="utf-8", xml_declaration=True)
        
        logger.info(f"Created vehicle types XML: {output_file}")
        return output_file
    
    def get_vehicle_mix(self) -> Dict[str, float]:
        """
        Get Georgetown vehicle mix percentages
        
        Returns:
            Dictionary mapping vehicle type to percentage (0-1)
        """
        return self.GEORGETOWN_VEHICLE_MIX.copy()
    
    def get_vehicle_type_list(self) -> List[str]:
        """
        Get list of vehicle type IDs
        
        Returns:
            List of vehicle type IDs
        """
        return list(self.VEHICLE_SPECS.keys())
    
    def get_vehicle_spec(self, vtype: str) -> Dict:
        """
        Get specifications for a vehicle type
        
        Args:
            vtype: Vehicle type ID
            
        Returns:
            Dictionary of vehicle specifications
        """
        return self.VEHICLE_SPECS.get(vtype, {}).copy()
    
    def validate_vehicle_mix(self, mix: Dict[str, float]) -> bool:
        """
        Validate that vehicle mix percentages sum to 1.0
        
        Args:
            mix: Dictionary of vehicle type percentages
            
        Returns:
            True if valid, False otherwise
        """
        total = sum(mix.values())
        tolerance = 0.02  # 2% tolerance
        
        if abs(total - 1.0) > tolerance:
            logger.warning(f"Vehicle mix sum is {total}, expected 1.0")
            return False
        
        # Check all types are valid
        for vtype in mix.keys():
            if vtype not in self.VEHICLE_SPECS:
                logger.warning(f"Unknown vehicle type: {vtype}")
                return False
        
        return True
    
    def create_custom_vehicle_mix(
        self,
        car: float = 0.55,
        motorcycle: float = 0.25,
        minibus: float = 0.15,
        truck: float = 0.05
    ) -> Dict[str, float]:
        """
        Create custom vehicle mix with validation
        
        Args:
            car: Percentage of cars (0-1)
            motorcycle: Percentage of motorcycles (0-1)
            minibus: Percentage of minibuses (0-1)
            truck: Percentage of trucks (0-1)
            
        Returns:
            Validated vehicle mix dictionary
            
        Raises:
            ValueError: If percentages don't sum to 1.0
        """
        mix = {
            "car": car,
            "motorcycle": motorcycle,
            "minibus": minibus,
            "truck": truck
        }
        
        if not self.validate_vehicle_mix(mix):
            raise ValueError(
                f"Invalid vehicle mix: {mix}. "
                f"Percentages must sum to 1.0 (±2%)"
            )
        
        return mix
    
    def get_vehicle_count_distribution(
        self,
        total_vehicles: int,
        mix: Optional[Dict[str, float]] = None
    ) -> Dict[str, int]:
        """
        Calculate number of vehicles of each type
        
        Args:
            total_vehicles: Total number of vehicles to generate
            mix: Vehicle mix percentages (uses default if None)
            
        Returns:
            Dictionary mapping vehicle type to count
        """
        if mix is None:
            mix = self.GEORGETOWN_VEHICLE_MIX
        
        distribution = {}
        remaining = total_vehicles
        
        # Calculate counts for each type
        types = list(mix.keys())
        for i, vtype in enumerate(types):
            if i == len(types) - 1:
                # Last type gets remaining vehicles
                distribution[vtype] = remaining
            else:
                count = int(total_vehicles * mix[vtype])
                distribution[vtype] = count
                remaining -= count
        
        logger.info(f"Vehicle distribution for {total_vehicles} vehicles: {distribution}")
        return distribution


def get_default_vehicle_mix() -> Dict[str, float]:
    """
    Get default Georgetown vehicle mix
    
    Returns:
        Dictionary of vehicle type percentages
    """
    return VehicleTypeManager.GEORGETOWN_VEHICLE_MIX.copy()


def get_vehicle_specs() -> Dict[str, Dict]:
    """
    Get all vehicle type specifications
    
    Returns:
        Dictionary of vehicle specifications
    """
    return VehicleTypeManager.VEHICLE_SPECS.copy()
