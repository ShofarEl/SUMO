"""
Network Data Storage Service

This module handles storing and retrieving Georgetown road network data
in MongoDB for use by the traffic simulation system.
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import networkx as nx

logger = logging.getLogger(__name__)


class NetworkStorageService:
    """Service for storing and retrieving network data in MongoDB"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize network storage service
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.networks_collection = db.networks
        self.intersections_collection = db.intersections
        self.road_segments_collection = db.road_segments
    
    async def store_network(
        self,
        name: str,
        source: str,
        bbox: Dict[str, float],
        statistics: Dict[str, int],
        sumo_file_path: Optional[str] = None,
        graphml_file_path: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Store network metadata in database
        
        Args:
            name: Network name
            source: Data source (e.g., "OpenStreetMap")
            bbox: Bounding box coordinates
            statistics: Network statistics
            sumo_file_path: Path to SUMO network file
            graphml_file_path: Path to GraphML file
            metadata: Additional metadata
            
        Returns:
            Network document ID
        """
        network_doc = {
            "name": name,
            "source": source,
            "bbox": bbox,
            "statistics": statistics,
            "sumo_file_path": sumo_file_path,
            "graphml_file_path": graphml_file_path,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.networks_collection.insert_one(network_doc)
        network_id = str(result.inserted_id)
        
        logger.info(f"Stored network: {name} (ID: {network_id})")
        return network_id
    
    async def store_intersections(
        self,
        network_id: str,
        intersections: List[Dict]
    ) -> int:
        """
        Store intersection data in database
        
        Args:
            network_id: Network document ID
            intersections: List of intersection dictionaries
            
        Returns:
            Number of intersections stored
        """
        if not intersections:
            return 0
        
        # Add network_id and timestamps to each intersection
        for intersection in intersections:
            intersection["network_id"] = network_id
            intersection["created_at"] = datetime.utcnow()
            
            # Create geospatial index data
            intersection["location"] = {
                "type": "Point",
                "coordinates": [intersection["lon"], intersection["lat"]]
            }
        
        result = await self.intersections_collection.insert_many(intersections)
        count = len(result.inserted_ids)
        
        logger.info(f"Stored {count} intersections for network {network_id}")
        return count
    
    async def store_road_segments(
        self,
        network_id: str,
        segments: List[Dict]
    ) -> int:
        """
        Store road segment data in database
        
        Args:
            network_id: Network document ID
            segments: List of road segment dictionaries
            
        Returns:
            Number of segments stored
        """
        if not segments:
            return 0
        
        # Add network_id and timestamps to each segment
        for segment in segments:
            segment["network_id"] = network_id
            segment["created_at"] = datetime.utcnow()
        
        result = await self.road_segments_collection.insert_many(segments)
        count = len(result.inserted_ids)
        
        logger.info(f"Stored {count} road segments for network {network_id}")
        return count
    
    async def get_network(self, network_id: str) -> Optional[Dict]:
        """
        Retrieve network metadata
        
        Args:
            network_id: Network document ID
            
        Returns:
            Network document or None
        """
        from bson import ObjectId
        
        network = await self.networks_collection.find_one({"_id": ObjectId(network_id)})
        
        if network:
            network["_id"] = str(network["_id"])
        
        return network
    
    async def get_latest_network(self) -> Optional[Dict]:
        """
        Get the most recently created network
        
        Returns:
            Network document or None
        """
        network = await self.networks_collection.find_one(
            sort=[("created_at", -1)]
        )
        
        if network:
            network["_id"] = str(network["_id"])
        
        return network
    
    async def get_intersections(
        self,
        network_id: str,
        key_only: bool = False
    ) -> List[Dict]:
        """
        Retrieve intersections for a network
        
        Args:
            network_id: Network document ID
            key_only: If True, only return key intersections
            
        Returns:
            List of intersection documents
        """
        query = {"network_id": network_id}
        
        if key_only:
            query["is_congestion_hotspot"] = True
        
        cursor = self.intersections_collection.find(query)
        intersections = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for intersection in intersections:
            intersection["_id"] = str(intersection["_id"])
        
        return intersections
    
    async def get_intersection_by_osm_id(
        self,
        network_id: str,
        osm_id: str
    ) -> Optional[Dict]:
        """
        Get intersection by OSM ID
        
        Args:
            network_id: Network document ID
            osm_id: OpenStreetMap node ID
            
        Returns:
            Intersection document or None
        """
        intersection = await self.intersections_collection.find_one({
            "network_id": network_id,
            "osm_id": osm_id
        })
        
        if intersection:
            intersection["_id"] = str(intersection["_id"])
        
        return intersection
    
    async def get_nearby_intersections(
        self,
        lon: float,
        lat: float,
        max_distance_meters: float = 1000,
        limit: int = 10
    ) -> List[Dict]:
        """
        Find intersections near a location
        
        Args:
            lon: Longitude
            lat: Latitude
            max_distance_meters: Maximum distance in meters
            limit: Maximum number of results
            
        Returns:
            List of nearby intersections
        """
        # MongoDB geospatial query
        query = {
            "location": {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat]
                    },
                    "$maxDistance": max_distance_meters
                }
            }
        }
        
        cursor = self.intersections_collection.find(query).limit(limit)
        intersections = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for intersection in intersections:
            intersection["_id"] = str(intersection["_id"])
        
        return intersections
    
    async def get_road_segments(
        self,
        network_id: str,
        limit: Optional[int] = None
    ) -> List[Dict]:
        """
        Retrieve road segments for a network
        
        Args:
            network_id: Network document ID
            limit: Maximum number of segments to return
            
        Returns:
            List of road segment documents
        """
        cursor = self.road_segments_collection.find({"network_id": network_id})
        
        if limit:
            cursor = cursor.limit(limit)
        
        segments = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for segment in segments:
            segment["_id"] = str(segment["_id"])
        
        return segments
    
    async def update_intersection_signal_config(
        self,
        intersection_id: str,
        signal_config: Dict
    ) -> bool:
        """
        Update signal configuration for an intersection
        
        Args:
            intersection_id: Intersection document ID
            signal_config: Signal configuration dictionary
            
        Returns:
            True if updated successfully
        """
        from bson import ObjectId
        
        result = await self.intersections_collection.update_one(
            {"_id": ObjectId(intersection_id)},
            {
                "$set": {
                    "signal_config": signal_config,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
    
    async def create_indexes(self):
        """Create database indexes for efficient queries"""
        
        # Network indexes
        await self.networks_collection.create_index("name")
        await self.networks_collection.create_index("created_at")
        
        # Intersection indexes
        await self.intersections_collection.create_index("network_id")
        await self.intersections_collection.create_index("osm_id")
        await self.intersections_collection.create_index("is_congestion_hotspot")
        await self.intersections_collection.create_index([("location", "2dsphere")])
        
        # Road segment indexes
        await self.road_segments_collection.create_index("network_id")
        await self.road_segments_collection.create_index("osm_id")
        await self.road_segments_collection.create_index("name")
        
        logger.info("Created database indexes for network data")
    
    async def delete_network(self, network_id: str) -> bool:
        """
        Delete a network and all associated data
        
        Args:
            network_id: Network document ID
            
        Returns:
            True if deleted successfully
        """
        from bson import ObjectId
        
        # Delete intersections
        await self.intersections_collection.delete_many({"network_id": network_id})
        
        # Delete road segments
        await self.road_segments_collection.delete_many({"network_id": network_id})
        
        # Delete network
        result = await self.networks_collection.delete_one({"_id": ObjectId(network_id)})
        
        logger.info(f"Deleted network {network_id}")
        return result.deleted_count > 0
