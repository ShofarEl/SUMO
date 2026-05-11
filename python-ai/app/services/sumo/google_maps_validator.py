"""
Google Maps Validation Module

This module validates SUMO simulation results against Google Maps travel time data
to ensure simulation accuracy.
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import asyncio
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Try to import Google Maps client
try:
    import googlemaps
    GOOGLEMAPS_AVAILABLE = True
except ImportError:
    logger.warning("googlemaps library not available. Install with: pip install googlemaps")
    GOOGLEMAPS_AVAILABLE = False


@dataclass
class RouteValidation:
    """Validation result for a route"""
    origin: str
    destination: str
    simulated_travel_time: float  # seconds
    google_maps_travel_time: float  # seconds
    deviation_seconds: float
    deviation_percent: float
    is_within_tolerance: bool
    timestamp: datetime


class GoogleMapsValidator:
    """Validate simulation results against Google Maps data"""
    
    # Acceptable deviation threshold (15% as per requirements)
    DEVIATION_THRESHOLD = 15.0
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Google Maps validator
        
        Args:
            api_key: Google Maps API key
        """
        if not GOOGLEMAPS_AVAILABLE:
            raise RuntimeError("googlemaps library not installed")
        
        self.api_key = api_key
        self.client = None
        
        if api_key:
            self.client = googlemaps.Client(key=api_key)
            logger.info("Google Maps client initialized")
        else:
            logger.warning("No API key provided. Validator will not be functional.")
    
    def get_travel_time(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        mode: str = "driving",
        traffic_model: str = "best_guess"
    ) -> Optional[float]:
        """
        Get travel time from Google Maps
        
        Args:
            origin: Origin coordinates (lat, lon)
            destination: Destination coordinates (lat, lon)
            mode: Travel mode (driving, walking, bicycling, transit)
            traffic_model: Traffic model (best_guess, pessimistic, optimistic)
            
        Returns:
            Travel time in seconds, or None if request fails
        """
        if not self.client:
            logger.error("Google Maps client not initialized")
            return None
        
        try:
            # Request directions
            result = self.client.directions(
                origin=origin,
                destination=destination,
                mode=mode,
                departure_time="now",
                traffic_model=traffic_model
            )
            
            if not result or len(result) == 0:
                logger.warning(f"No route found from {origin} to {destination}")
                return None
            
            # Extract duration in traffic
            leg = result[0]["legs"][0]
            
            # Prefer duration_in_traffic if available
            if "duration_in_traffic" in leg:
                duration = leg["duration_in_traffic"]["value"]
            else:
                duration = leg["duration"]["value"]
            
            logger.debug(f"Google Maps travel time: {duration}s ({duration/60:.1f} min)")
            return float(duration)
            
        except Exception as e:
            logger.error(f"Error getting Google Maps travel time: {e}")
            return None
    
    def get_typical_travel_time(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        time_of_day: Optional[str] = None
    ) -> Optional[float]:
        """
        Get typical travel time for a specific time of day
        
        Args:
            origin: Origin coordinates (lat, lon)
            destination: Destination coordinates (lat, lon)
            time_of_day: Time of day (morning_peak, off_peak, evening_peak)
            
        Returns:
            Typical travel time in seconds
        """
        if not self.client:
            return None
        
        # Map time periods to traffic models
        traffic_models = {
            "morning_peak": "pessimistic",
            "evening_peak": "pessimistic",
            "off_peak": "best_guess"
        }
        
        traffic_model = traffic_models.get(time_of_day, "best_guess")
        
        return self.get_travel_time(
            origin=origin,
            destination=destination,
            traffic_model=traffic_model
        )
    
    def validate_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        simulated_time: float,
        time_of_day: Optional[str] = None
    ) -> RouteValidation:
        """
        Validate simulated travel time against Google Maps
        
        Args:
            origin: Origin coordinates (lat, lon)
            destination: Destination coordinates (lat, lon)
            simulated_time: Simulated travel time in seconds
            time_of_day: Time of day for typical traffic
            
        Returns:
            RouteValidation object
        """
        # Get Google Maps travel time
        google_time = self.get_typical_travel_time(origin, destination, time_of_day)
        
        if google_time is None:
            logger.warning("Could not get Google Maps data for validation")
            # Return validation with no comparison
            return RouteValidation(
                origin=f"{origin[0]:.4f},{origin[1]:.4f}",
                destination=f"{destination[0]:.4f},{destination[1]:.4f}",
                simulated_travel_time=simulated_time,
                google_maps_travel_time=0.0,
                deviation_seconds=0.0,
                deviation_percent=0.0,
                is_within_tolerance=False,
                timestamp=datetime.utcnow()
            )
        
        # Calculate deviation
        deviation_seconds = abs(simulated_time - google_time)
        deviation_percent = (deviation_seconds / google_time) * 100 if google_time > 0 else 0.0
        
        is_within_tolerance = deviation_percent <= self.DEVIATION_THRESHOLD
        
        logger.info(
            f"Route validation: Simulated={simulated_time:.0f}s, "
            f"Google={google_time:.0f}s, Deviation={deviation_percent:.1f}%"
        )
        
        return RouteValidation(
            origin=f"{origin[0]:.4f},{origin[1]:.4f}",
            destination=f"{destination[0]:.4f},{destination[1]:.4f}",
            simulated_travel_time=simulated_time,
            google_maps_travel_time=google_time,
            deviation_seconds=deviation_seconds,
            deviation_percent=deviation_percent,
            is_within_tolerance=is_within_tolerance,
            timestamp=datetime.utcnow()
        )
    
    def validate_multiple_routes(
        self,
        routes: List[Dict],
        time_of_day: Optional[str] = None
    ) -> List[RouteValidation]:
        """
        Validate multiple routes
        
        Args:
            routes: List of route dictionaries with origin, destination, simulated_time
            time_of_day: Time of day for typical traffic
            
        Returns:
            List of RouteValidation objects
        """
        validations = []
        
        for route in routes:
            validation = self.validate_route(
                origin=route["origin"],
                destination=route["destination"],
                simulated_time=route["simulated_time"],
                time_of_day=time_of_day
            )
            validations.append(validation)
        
        return validations
    
    def get_validation_summary(
        self,
        validations: List[RouteValidation]
    ) -> Dict:
        """
        Get summary statistics for validations
        
        Args:
            validations: List of RouteValidation objects
            
        Returns:
            Summary statistics dictionary
        """
        if not validations:
            return {}
        
        # Filter out validations without Google Maps data
        valid_validations = [
            v for v in validations
            if v.google_maps_travel_time > 0
        ]
        
        if not valid_validations:
            return {
                "total_routes": len(validations),
                "validated_routes": 0,
                "message": "No Google Maps data available"
            }
        
        deviations = [v.deviation_percent for v in valid_validations]
        within_tolerance = [v for v in valid_validations if v.is_within_tolerance]
        
        return {
            "total_routes": len(validations),
            "validated_routes": len(valid_validations),
            "routes_within_tolerance": len(within_tolerance),
            "tolerance_rate": len(within_tolerance) / len(valid_validations) * 100,
            "average_deviation_percent": sum(deviations) / len(deviations),
            "max_deviation_percent": max(deviations),
            "min_deviation_percent": min(deviations),
            "threshold_percent": self.DEVIATION_THRESHOLD
        }


class ValidationStorage:
    """Store validation results in database"""
    
    def __init__(self, db):
        """
        Initialize storage
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.validations_collection = db["validation_results"]
    
    async def store_validation(
        self,
        simulation_id: str,
        validation: RouteValidation
    ) -> str:
        """
        Store validation result
        
        Args:
            simulation_id: Simulation identifier
            validation: RouteValidation object
            
        Returns:
            Inserted document ID
        """
        document = {
            "simulation_id": simulation_id,
            "origin": validation.origin,
            "destination": validation.destination,
            "simulated_travel_time": validation.simulated_travel_time,
            "google_maps_travel_time": validation.google_maps_travel_time,
            "deviation_seconds": validation.deviation_seconds,
            "deviation_percent": validation.deviation_percent,
            "is_within_tolerance": validation.is_within_tolerance,
            "timestamp": validation.timestamp
        }
        
        result = await self.validations_collection.insert_one(document)
        logger.info(f"Stored validation result for simulation: {simulation_id}")
        return str(result.inserted_id)
    
    async def store_validation_summary(
        self,
        simulation_id: str,
        summary: Dict
    ) -> str:
        """
        Store validation summary
        
        Args:
            simulation_id: Simulation identifier
            summary: Summary statistics dictionary
            
        Returns:
            Inserted document ID
        """
        document = {
            "simulation_id": simulation_id,
            "summary": summary,
            "timestamp": datetime.utcnow()
        }
        
        result = await self.validations_collection.insert_one(document)
        logger.info(f"Stored validation summary for simulation: {simulation_id}")
        return str(result.inserted_id)
    
    async def get_validation_results(
        self,
        simulation_id: str
    ) -> List[Dict]:
        """
        Get validation results for a simulation
        
        Args:
            simulation_id: Simulation identifier
            
        Returns:
            List of validation result documents
        """
        cursor = self.validations_collection.find(
            {"simulation_id": simulation_id}
        )
        
        results = await cursor.to_list(length=None)
        return results
    
    async def create_indexes(self):
        """Create database indexes"""
        await self.validations_collection.create_index("simulation_id")
        await self.validations_collection.create_index("timestamp")
        await self.validations_collection.create_index("is_within_tolerance")
        
        logger.info("Created indexes for validation results")


def create_mock_validator() -> GoogleMapsValidator:
    """
    Create mock validator for testing without API key
    
    Returns:
        GoogleMapsValidator with mock functionality
    """
    class MockValidator(GoogleMapsValidator):
        def __init__(self):
            self.api_key = "mock"
            self.client = None
        
        def get_travel_time(self, origin, destination, mode="driving", traffic_model="best_guess"):
            # Return mock travel time based on distance
            # Simple Euclidean distance approximation
            lat_diff = abs(origin[0] - destination[0])
            lon_diff = abs(origin[1] - destination[1])
            distance_deg = (lat_diff**2 + lon_diff**2)**0.5
            
            # Rough conversion: 1 degree ≈ 111 km, average speed 30 km/h
            distance_km = distance_deg * 111
            travel_time_hours = distance_km / 30
            travel_time_seconds = travel_time_hours * 3600
            
            # Add some variation based on traffic model
            if traffic_model == "pessimistic":
                travel_time_seconds *= 1.5
            elif traffic_model == "optimistic":
                travel_time_seconds *= 0.8
            
            return travel_time_seconds
    
    return MockValidator()


def check_googlemaps_available() -> bool:
    """Check if Google Maps library is available"""
    return GOOGLEMAPS_AVAILABLE
