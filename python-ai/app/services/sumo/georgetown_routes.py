"""
Georgetown-Specific Route Definitions and OD Matrix Generation

This module defines routes specific to Georgetown's road network and
generates origin-destination matrices calibrated to known hotspots.
"""

from typing import Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RouteDefinition:
    """Route definition with metadata"""
    id: str
    name: str
    edges: List[str]
    origin: str
    destination: str
    hotspot: Optional[str] = None
    description: Optional[str] = None


class GeorgetownRoutes:
    """Georgetown-specific route definitions"""
    
    # Key origin-destination pairs based on Georgetown geography
    # These are placeholder edge IDs - actual IDs come from SUMO network
    MAJOR_ROUTES = {
        "demerara_bridge_inbound": RouteDefinition(
            id="route_bridge_in",
            name="Demerara Bridge Inbound",
            edges=[],  # Will be populated from actual network
            origin="demerara_bridge_west",
            destination="georgetown_center",
            hotspot="demerara_bridge_approach",
            description="Major inbound route from West Demerara"
        ),
        "demerara_bridge_outbound": RouteDefinition(
            id="route_bridge_out",
            name="Demerara Bridge Outbound",
            edges=[],
            origin="georgetown_center",
            destination="demerara_bridge_west",
            hotspot="demerara_bridge_approach",
            description="Major outbound route to West Demerara"
        ),
        "vlissengen_north_south": RouteDefinition(
            id="route_vlissengen_ns",
            name="Vlissengen Road North-South",
            edges=[],
            origin="vlissengen_north",
            destination="vlissengen_south",
            hotspot="vlissengen_road",
            description="North-South corridor on Vlissengen Road"
        ),
        "vlissengen_south_north": RouteDefinition(
            id="route_vlissengen_sn",
            name="Vlissengen Road South-North",
            edges=[],
            origin="vlissengen_south",
            destination="vlissengen_north",
            hotspot="vlissengen_road",
            description="South-North corridor on Vlissengen Road"
        ),
        "sheriff_east_west": RouteDefinition(
            id="route_sheriff_ew",
            name="Sheriff Street East-West",
            edges=[],
            origin="sheriff_east",
            destination="sheriff_west",
            hotspot="sheriff_street",
            description="East-West corridor on Sheriff Street"
        ),
        "sheriff_west_east": RouteDefinition(
            id="route_sheriff_we",
            name="Sheriff Street West-East",
            edges=[],
            origin="sheriff_west",
            destination="sheriff_east",
            hotspot="sheriff_street",
            description="West-East corridor on Sheriff Street"
        ),
        "camp_street_corridor": RouteDefinition(
            id="route_camp",
            name="Camp Street Corridor",
            edges=[],
            origin="camp_north",
            destination="camp_south",
            hotspot="camp_street",
            description="Central Georgetown corridor"
        ),
        "regent_street_corridor": RouteDefinition(
            id="route_regent",
            name="Regent Street Corridor",
            edges=[],
            origin="regent_east",
            destination="regent_west",
            hotspot="regent_street",
            description="Commercial district corridor"
        )
    }
    
    @classmethod
    def get_route_definitions(cls) -> List[RouteDefinition]:
        """Get all route definitions"""
        return list(cls.MAJOR_ROUTES.values())
    
    @classmethod
    def get_route(cls, route_id: str) -> Optional[RouteDefinition]:
        """Get specific route definition"""
        return cls.MAJOR_ROUTES.get(route_id)
    
    @classmethod
    def get_hotspot_routes(cls, hotspot: str) -> List[RouteDefinition]:
        """Get all routes passing through a hotspot"""
        return [
            route for route in cls.MAJOR_ROUTES.values()
            if route.hotspot == hotspot
        ]


class ODMatrixGenerator:
    """Generate origin-destination matrices for Georgetown"""
    
    def __init__(self):
        """Initialize OD matrix generator"""
        self.routes = GeorgetownRoutes()
    
    def generate_morning_peak_od(
        self,
        base_demand: float = 800
    ) -> Dict[Tuple[str, str], float]:
        """
        Generate OD matrix for morning peak (7-9am)
        
        Morning peak characteristics:
        - High inbound traffic to Georgetown center
        - Demerara Bridge is major bottleneck
        - Commuter traffic dominates
        
        Args:
            base_demand: Base demand level (vehicles/hour)
            
        Returns:
            OD matrix dictionary
        """
        od_matrix = {}
        
        # Morning peak: Heavy inbound traffic
        inbound_multiplier = 2.5
        outbound_multiplier = 0.5
        
        for route_key, route in self.routes.MAJOR_ROUTES.items():
            # Determine if route is inbound or outbound
            is_inbound = "inbound" in route_key or "center" in route.destination
            
            multiplier = inbound_multiplier if is_inbound else outbound_multiplier
            
            # Apply hotspot multiplier
            if route.hotspot == "demerara_bridge_approach":
                multiplier *= 2.0  # Bridge is critical bottleneck
            elif route.hotspot in ["vlissengen_road", "sheriff_street"]:
                multiplier *= 1.5
            
            demand = base_demand * multiplier
            od_matrix[(route.origin, route.destination)] = demand
        
        logger.info(f"Generated morning peak OD matrix: {len(od_matrix)} pairs, "
                   f"total demand: {sum(od_matrix.values()):.0f} veh/h")
        return od_matrix
    
    def generate_off_peak_od(
        self,
        base_demand: float = 400
    ) -> Dict[Tuple[str, str], float]:
        """
        Generate OD matrix for off-peak hours (10am-3pm)
        
        Off-peak characteristics:
        - Balanced directional flow
        - Lower overall demand
        - More uniform distribution
        
        Args:
            base_demand: Base demand level (vehicles/hour)
            
        Returns:
            OD matrix dictionary
        """
        od_matrix = {}
        
        # Off-peak: Balanced traffic
        for route_key, route in self.routes.MAJOR_ROUTES.items():
            # Uniform distribution with slight hotspot emphasis
            multiplier = 1.0
            
            if route.hotspot == "demerara_bridge_approach":
                multiplier = 1.3
            elif route.hotspot in ["vlissengen_road", "sheriff_street"]:
                multiplier = 1.2
            
            demand = base_demand * multiplier
            od_matrix[(route.origin, route.destination)] = demand
        
        logger.info(f"Generated off-peak OD matrix: {len(od_matrix)} pairs, "
                   f"total demand: {sum(od_matrix.values()):.0f} veh/h")
        return od_matrix
    
    def generate_evening_peak_od(
        self,
        base_demand: float = 1000
    ) -> Dict[Tuple[str, str], float]:
        """
        Generate OD matrix for evening peak (4-6:30pm)
        
        Evening peak characteristics:
        - High outbound traffic from Georgetown center
        - Demerara Bridge heavily congested
        - Highest overall demand
        
        Args:
            base_demand: Base demand level (vehicles/hour)
            
        Returns:
            OD matrix dictionary
        """
        od_matrix = {}
        
        # Evening peak: Heavy outbound traffic
        inbound_multiplier = 0.6
        outbound_multiplier = 2.8
        
        for route_key, route in self.routes.MAJOR_ROUTES.items():
            # Determine if route is inbound or outbound
            is_outbound = "outbound" in route_key or "center" in route.origin
            
            multiplier = outbound_multiplier if is_outbound else inbound_multiplier
            
            # Apply hotspot multiplier
            if route.hotspot == "demerara_bridge_approach":
                multiplier *= 2.2  # Bridge is critical bottleneck in evening
            elif route.hotspot in ["vlissengen_road", "sheriff_street"]:
                multiplier *= 1.6
            
            demand = base_demand * multiplier
            od_matrix[(route.origin, route.destination)] = demand
        
        logger.info(f"Generated evening peak OD matrix: {len(od_matrix)} pairs, "
                   f"total demand: {sum(od_matrix.values()):.0f} veh/h")
        return od_matrix
    
    def generate_od_for_period(
        self,
        period: str,
        base_demand: Optional[float] = None
    ) -> Dict[Tuple[str, str], float]:
        """
        Generate OD matrix for specified time period
        
        Args:
            period: Time period (morning_peak, off_peak, evening_peak)
            base_demand: Optional base demand override
            
        Returns:
            OD matrix dictionary
        """
        if period == "morning_peak":
            return self.generate_morning_peak_od(base_demand or 800)
        elif period == "evening_peak":
            return self.generate_evening_peak_od(base_demand or 1000)
        else:  # off_peak
            return self.generate_off_peak_od(base_demand or 400)
    
    def calibrate_to_hotspot(
        self,
        od_matrix: Dict[Tuple[str, str], float],
        hotspot: str,
        target_volume: float
    ) -> Dict[Tuple[str, str], float]:
        """
        Calibrate OD matrix to match target volume at hotspot
        
        Args:
            od_matrix: Original OD matrix
            hotspot: Hotspot identifier
            target_volume: Target traffic volume (vehicles/hour)
            
        Returns:
            Calibrated OD matrix
        """
        # Find routes passing through hotspot
        hotspot_routes = self.routes.get_hotspot_routes(hotspot)
        
        if not hotspot_routes:
            logger.warning(f"No routes found for hotspot: {hotspot}")
            return od_matrix
        
        # Calculate current volume at hotspot
        current_volume = sum(
            od_matrix.get((route.origin, route.destination), 0)
            for route in hotspot_routes
        )
        
        if current_volume == 0:
            logger.warning(f"Current volume at {hotspot} is zero")
            return od_matrix
        
        # Calculate scaling factor
        scale_factor = target_volume / current_volume
        
        # Apply scaling to hotspot routes
        calibrated = od_matrix.copy()
        for route in hotspot_routes:
            od_pair = (route.origin, route.destination)
            if od_pair in calibrated:
                calibrated[od_pair] *= scale_factor
        
        logger.info(f"Calibrated {hotspot}: {current_volume:.0f} -> {target_volume:.0f} veh/h "
                   f"(factor: {scale_factor:.2f})")
        
        return calibrated
    
    def get_od_statistics(
        self,
        od_matrix: Dict[Tuple[str, str], float]
    ) -> Dict:
        """
        Calculate statistics for OD matrix
        
        Args:
            od_matrix: OD matrix
            
        Returns:
            Dictionary of statistics
        """
        if not od_matrix:
            return {}
        
        demands = list(od_matrix.values())
        
        return {
            "total_pairs": len(od_matrix),
            "total_demand": sum(demands),
            "average_demand": sum(demands) / len(demands),
            "min_demand": min(demands),
            "max_demand": max(demands),
            "demand_range": max(demands) - min(demands)
        }


def create_georgetown_routes_from_network(
    network_edges: List[Dict],
    intersections: List[Dict]
) -> List[Dict]:
    """
    Create route definitions from actual SUMO network
    
    Args:
        network_edges: List of network edges from SUMO
        intersections: List of intersections
        
    Returns:
        List of route dictionaries with actual edge IDs
    """
    routes = []
    
    # This is a placeholder - actual implementation would use
    # shortest path algorithms on the network graph
    logger.info("Creating routes from network (placeholder implementation)")
    
    # For now, return template routes
    for route_def in GeorgetownRoutes.get_route_definitions():
        routes.append({
            "id": route_def.id,
            "name": route_def.name,
            "edges": route_def.edges or ["edge_placeholder"],
            "origin": route_def.origin,
            "destination": route_def.destination,
            "hotspot": route_def.hotspot,
            "description": route_def.description
        })
    
    return routes


def get_default_routes() -> List[Dict]:
    """
    Get default Georgetown route definitions
    
    Returns:
        List of route dictionaries
    """
    return [
        {
            "id": route.id,
            "name": route.name,
            "edges": route.edges or ["placeholder"],
            "origin": route.origin,
            "destination": route.destination,
            "hotspot": route.hotspot,
            "description": route.description
        }
        for route in GeorgetownRoutes.get_route_definitions()
    ]
