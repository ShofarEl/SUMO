"""
Traffic Density Calculation Service

This module provides utilities for calculating and visualizing traffic density
across the Georgetown road network.
"""

import logging
from typing import Dict, List, Optional
import numpy as np

logger = logging.getLogger(__name__)


class TrafficDensityCalculator:
    """Calculate traffic density metrics for visualization"""
    
    def __init__(self):
        """Initialize traffic density calculator"""
        self.density_cache = {}
    
    def calculate_intersection_density(
        self,
        intersections: List[Dict],
        traffic_data: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Calculate traffic density for each intersection
        
        Args:
            intersections: List of intersection dictionaries
            traffic_data: Optional real-time traffic data
            
        Returns:
            List of intersections with density values
        """
        density_intersections = []
        
        for intersection in intersections:
            # Base density on intersection characteristics
            base_density = self._calculate_base_density(intersection)
            
            # Adjust for real-time data if available
            if traffic_data and intersection.get('osm_id') in traffic_data:
                real_time_density = traffic_data[intersection['osm_id']].get('density', 0)
                density = (base_density + real_time_density) / 2
            else:
                density = base_density
            
            density_intersections.append({
                'lat': intersection['lat'],
                'lon': intersection['lon'],
                'intensity': density,
                'intersection_id': intersection.get('_id') or intersection.get('id'),
                'name': intersection.get('name', 'Unknown')
            })
        
        return density_intersections
    
    def _calculate_base_density(self, intersection: Dict) -> float:
        """
        Calculate base traffic density for an intersection
        
        Based on:
        - Number of connections (degree)
        - Whether it's a congestion hotspot
        - Number of connected streets
        
        Args:
            intersection: Intersection dictionary
            
        Returns:
            Density value between 0 and 1
        """
        density = 0.3  # Base density
        
        # Increase density based on degree
        degree = intersection.get('degree', 0)
        if degree >= 4:
            density += 0.3
        elif degree >= 3:
            density += 0.2
        
        # Hotspots have higher density
        if intersection.get('is_congestion_hotspot'):
            density += 0.4
        
        # More streets = more traffic
        num_streets = len(intersection.get('streets', []))
        if num_streets >= 3:
            density += 0.1
        
        # Normalize to 0-1 range
        return min(density, 1.0)
    
    def calculate_road_segment_density(
        self,
        segments: List[Dict],
        traffic_data: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Calculate traffic density for road segments
        
        Args:
            segments: List of road segment dictionaries
            traffic_data: Optional real-time traffic data
            
        Returns:
            List of segments with density values
        """
        density_segments = []
        
        for segment in segments:
            # Base density on road characteristics
            base_density = self._calculate_segment_base_density(segment)
            
            # Adjust for real-time data if available
            if traffic_data and segment.get('osm_id') in traffic_data:
                real_time_density = traffic_data[segment['osm_id']].get('density', 0)
                density = (base_density + real_time_density) / 2
            else:
                density = base_density
            
            density_segments.append({
                'segment_id': segment.get('_id') or segment.get('osm_id'),
                'from_node': segment.get('from_node'),
                'to_node': segment.get('to_node'),
                'density': density,
                'name': segment.get('name', 'Unnamed Road')
            })
        
        return density_segments
    
    def _calculate_segment_base_density(self, segment: Dict) -> float:
        """
        Calculate base traffic density for a road segment
        
        Args:
            segment: Road segment dictionary
            
        Returns:
            Density value between 0 and 1
        """
        density = 0.3  # Base density
        
        # Highway type affects density
        highway_type = segment.get('highway', 'unclassified')
        if highway_type in ['primary', 'trunk']:
            density += 0.3
        elif highway_type in ['secondary', 'tertiary']:
            density += 0.2
        
        # More lanes = more traffic capacity but also more usage
        lanes = segment.get('lanes', 1)
        if isinstance(lanes, (int, float)):
            if lanes >= 3:
                density += 0.2
            elif lanes >= 2:
                density += 0.1
        
        # Normalize to 0-1 range
        return min(density, 1.0)
    
    def generate_heatmap_grid(
        self,
        intersections: List[Dict],
        bbox: Dict[str, float],
        grid_size: int = 20
    ) -> List[Dict]:
        """
        Generate a grid-based heatmap for traffic density
        
        Args:
            intersections: List of intersections with density
            bbox: Bounding box (north, south, east, west)
            grid_size: Number of grid cells per dimension
            
        Returns:
            List of grid cells with density values
        """
        # Create grid
        lat_step = (bbox['north'] - bbox['south']) / grid_size
        lon_step = (bbox['east'] - bbox['west']) / grid_size
        
        grid_cells = []
        
        for i in range(grid_size):
            for j in range(grid_size):
                cell_lat = bbox['south'] + (i + 0.5) * lat_step
                cell_lon = bbox['west'] + (j + 0.5) * lon_step
                
                # Calculate density for this cell based on nearby intersections
                density = self._calculate_cell_density(
                    cell_lat, cell_lon, intersections, lat_step, lon_step
                )
                
                if density > 0.1:  # Only include cells with significant density
                    grid_cells.append({
                        'lat': cell_lat,
                        'lon': cell_lon,
                        'intensity': density
                    })
        
        return grid_cells
    
    def _calculate_cell_density(
        self,
        cell_lat: float,
        cell_lon: float,
        intersections: List[Dict],
        lat_radius: float,
        lon_radius: float
    ) -> float:
        """
        Calculate density for a grid cell based on nearby intersections
        
        Args:
            cell_lat: Cell latitude
            cell_lon: Cell longitude
            intersections: List of intersections
            lat_radius: Latitude search radius
            lon_radius: Longitude search radius
            
        Returns:
            Density value for the cell
        """
        total_density = 0
        count = 0
        
        # Find intersections within radius
        for intersection in intersections:
            lat_diff = abs(intersection['lat'] - cell_lat)
            lon_diff = abs(intersection['lon'] - cell_lon)
            
            if lat_diff <= lat_radius * 2 and lon_diff <= lon_radius * 2:
                # Calculate distance-weighted density
                distance = np.sqrt(lat_diff**2 + lon_diff**2)
                max_distance = np.sqrt((lat_radius * 2)**2 + (lon_radius * 2)**2)
                
                if distance < max_distance:
                    weight = 1 - (distance / max_distance)
                    density = intersection.get('intensity', 0.5)
                    total_density += density * weight
                    count += 1
        
        if count > 0:
            return min(total_density / count, 1.0)
        
        return 0.0
    
    def update_real_time_density(
        self,
        intersection_id: str,
        queue_length: float,
        vehicle_count: int,
        delay: float
    ) -> float:
        """
        Calculate real-time density based on simulation data
        
        Args:
            intersection_id: Intersection identifier
            queue_length: Current queue length in meters
            vehicle_count: Number of vehicles waiting
            delay: Average delay in seconds
            
        Returns:
            Real-time density value (0-1)
        """
        # Normalize metrics
        queue_factor = min(queue_length / 100, 1.0)  # Normalize to 100m max
        vehicle_factor = min(vehicle_count / 20, 1.0)  # Normalize to 20 vehicles max
        delay_factor = min(delay / 60, 1.0)  # Normalize to 60s max
        
        # Weighted average
        density = (queue_factor * 0.4 + vehicle_factor * 0.3 + delay_factor * 0.3)
        
        # Cache the result
        self.density_cache[intersection_id] = density
        
        return density
    
    def get_cached_density(self, intersection_id: str) -> Optional[float]:
        """
        Get cached density value for an intersection
        
        Args:
            intersection_id: Intersection identifier
            
        Returns:
            Cached density value or None
        """
        return self.density_cache.get(intersection_id)
    
    def clear_cache(self):
        """Clear the density cache"""
        self.density_cache.clear()
        logger.info("Cleared traffic density cache")


def calculate_congestion_level(density: float) -> str:
    """
    Convert density value to congestion level description
    
    Args:
        density: Density value (0-1)
        
    Returns:
        Congestion level string
    """
    if density < 0.3:
        return "Low"
    elif density < 0.6:
        return "Moderate"
    elif density < 0.8:
        return "High"
    else:
        return "Severe"
