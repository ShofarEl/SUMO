"""
SUMO simulation API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
import logging

from app.services.sumo import (
    GeorgetownOSMImporter,
    NetworkStorageService,
    IntersectionConfig,
    check_sumo_installation,
    get_georgetown_bbox,
    get_key_intersections
)
from app.services.sumo.traffic_density import TrafficDensityCalculator, calculate_congestion_level
from app.core.config import get_settings
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()


# Dependency to get database
async def get_database():
    """Get MongoDB database instance"""
    # Use MONGODB_URI if available, otherwise construct from MONGODB_URL and DATABASE_NAME
    mongo_uri = getattr(settings, 'MONGODB_URI', None) or settings.MONGODB_URL
    db_name = getattr(settings, 'DATABASE_NAME', 'georgetown-traffic-ai')
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    try:
        yield db
    finally:
        client.close()


# Request/Response Models
class OSMImportRequest(BaseModel):
    """Request model for OSM import"""
    network_type: str = Field(default="drive", description="Network type (drive, walk, bike, all)")
    simplify: bool = Field(default=True, description="Simplify network topology")
    export_graphml: bool = Field(default=True, description="Export GraphML format")
    export_sumo: bool = Field(default=True, description="Convert to SUMO format")
    export_json: bool = Field(default=True, description="Export JSON data")


class OSMImportResponse(BaseModel):
    """Response model for OSM import"""
    success: bool
    message: str
    network_id: Optional[str] = None
    statistics: Optional[Dict] = None
    files: Optional[Dict[str, str]] = None


class NetworkInfoResponse(BaseModel):
    """Response model for network information"""
    network_id: str
    name: str
    source: str
    bbox: Dict[str, float]
    statistics: Dict[str, int]
    created_at: str


class IntersectionResponse(BaseModel):
    """Response model for intersection data"""
    id: str
    osm_id: str
    name: Optional[str] = None
    lat: float
    lon: float
    degree: int
    streets: List[str]
    is_congestion_hotspot: Optional[bool] = False
    signal_config: Optional[Dict] = None


class SignalConfigRequest(BaseModel):
    """Request model for signal configuration"""
    intersection_id: str
    cycle_length: int = Field(default=90, ge=30, le=300, description="Cycle length in seconds")
    num_phases: int = Field(default=2, ge=2, le=4, description="Number of signal phases")
    config_type: str = Field(default="standard", description="Configuration type (standard or adaptive)")


class SignalConfigResponse(BaseModel):
    """Response model for signal configuration"""
    success: bool
    message: str
    config: Optional[Dict] = None


@router.get("/")
async def sumo_info():
    """Get SUMO service information"""
    is_installed, version_info = check_sumo_installation()
    
    return {
        "service": "SUMO Simulation",
        "status": "ready" if is_installed else "sumo_not_installed",
        "sumo_installed": is_installed,
        "sumo_version": version_info,
        "georgetown_bbox": get_georgetown_bbox(),
        "key_intersections": len(get_key_intersections())
    }


@router.post("/osm/import", response_model=OSMImportResponse)
async def import_georgetown_network(
    request: OSMImportRequest,
    db = Depends(get_database)
):
    """
    Import Georgetown road network from OpenStreetMap
    
    This endpoint downloads the Georgetown road network from OSM,
    converts it to SUMO format, and stores the data in MongoDB.
    """
    try:
        logger.info("Starting Georgetown network import from OSM")
        
        # Initialize importer
        importer = GeorgetownOSMImporter()
        
        # Import network
        result = importer.import_full_georgetown_network(
            export_graphml=request.export_graphml,
            export_sumo=request.export_sumo,
            export_json=request.export_json
        )
        
        # Get network graph
        G = result["network_graph"]
        
        # Extract data for storage
        intersections = importer.extract_intersections(G)
        segments = importer.extract_road_segments(G)
        key_intersections = importer.identify_key_intersections(intersections)
        
        # Store in database
        storage = NetworkStorageService(db)
        
        # Create indexes
        await storage.create_indexes()
        
        # Store network metadata
        network_id = await storage.store_network(
            name="Georgetown Road Network",
            source="OpenStreetMap",
            bbox=get_georgetown_bbox(),
            statistics={
                "total_nodes": len(G.nodes),
                "total_edges": len(G.edges),
                "total_intersections": len(intersections),
                "key_intersections": len(key_intersections)
            },
            sumo_file_path=result.get("sumo_network_file"),
            graphml_file_path=result.get("graphml_file"),
            metadata={
                "network_type": request.network_type,
                "simplified": request.simplify
            }
        )
        
        # Store intersections
        await storage.store_intersections(network_id, intersections)
        
        # Store road segments
        await storage.store_road_segments(network_id, segments)
        
        logger.info(f"Successfully imported Georgetown network (ID: {network_id})")
        
        return OSMImportResponse(
            success=True,
            message="Georgetown network imported successfully",
            network_id=network_id,
            statistics={
                "nodes": len(G.nodes),
                "edges": len(G.edges),
                "intersections": len(intersections),
                "key_intersections": len(key_intersections),
                "road_segments": len(segments)
            },
            files={
                "graphml": result.get("graphml_file"),
                "sumo_network": result.get("sumo_network_file"),
                "osm": result.get("osm_file"),
                "json": result.get("json_file")
            }
        )
        
    except Exception as e:
        logger.error(f"Error importing Georgetown network: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import Georgetown network: {str(e)}"
        )


@router.get("/networks/latest", response_model=NetworkInfoResponse)
async def get_latest_network(db = Depends(get_database)):
    """Get the most recently imported network"""
    try:
        storage = NetworkStorageService(db)
        network = await storage.get_latest_network()
        
        if not network:
            raise HTTPException(status_code=404, detail="No networks found")
        
        return NetworkInfoResponse(
            network_id=network["_id"],
            name=network["name"],
            source=network["source"],
            bbox=network["bbox"],
            statistics=network["statistics"],
            created_at=network["created_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving latest network: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/networks/{network_id}", response_model=NetworkInfoResponse)
async def get_network(network_id: str, db = Depends(get_database)):
    """Get network information by ID"""
    try:
        storage = NetworkStorageService(db)
        network = await storage.get_network(network_id)
        
        if not network:
            raise HTTPException(status_code=404, detail="Network not found")
        
        return NetworkInfoResponse(
            network_id=network["_id"],
            name=network["name"],
            source=network["source"],
            bbox=network["bbox"],
            statistics=network["statistics"],
            created_at=network["created_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving network: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/networks/{network_id}/intersections", response_model=List[IntersectionResponse])
async def get_network_intersections(
    network_id: str,
    key_only: bool = False,
    db = Depends(get_database)
):
    """Get intersections for a network"""
    try:
        storage = NetworkStorageService(db)
        intersections = await storage.get_intersections(network_id, key_only=key_only)
        
        return [
            IntersectionResponse(
                id=intersection["_id"],
                osm_id=intersection["osm_id"],
                name=intersection.get("name"),
                lat=intersection["lat"],
                lon=intersection["lon"],
                degree=intersection["degree"],
                streets=intersection.get("streets", []),
                is_congestion_hotspot=intersection.get("is_congestion_hotspot", False),
                signal_config=intersection.get("signal_config")
            )
            for intersection in intersections
        ]
        
    except Exception as e:
        logger.error(f"Error retrieving intersections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/intersections/configure", response_model=SignalConfigResponse)
async def configure_intersection_signals(
    request: SignalConfigRequest,
    db = Depends(get_database)
):
    """
    Configure signal timing for an intersection
    
    Creates signal phase configuration and stores it in the database.
    """
    try:
        config_manager = IntersectionConfig()
        
        # Create configuration based on type
        if request.config_type == "adaptive":
            config = config_manager.create_adaptive_signal_config(
                intersection_id=request.intersection_id
            )
        else:
            config = config_manager.create_standard_signal_config(
                intersection_id=request.intersection_id,
                cycle_length=request.cycle_length,
                num_phases=request.num_phases
            )
        
        # Validate configuration
        is_valid, errors = config_manager.validate_configuration(config)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid configuration: {', '.join(errors)}"
            )
        
        logger.info(f"Created signal configuration for intersection {request.intersection_id}")
        
        return SignalConfigResponse(
            success=True,
            message="Signal configuration created successfully",
            config=config
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring intersection signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/intersections/configure-key", response_model=Dict)
async def configure_key_intersections(db = Depends(get_database)):
    """
    Configure signal timing for all key Georgetown intersections
    
    Applies predefined signal configurations to the 5 key congested
    intersections in Georgetown.
    """
    try:
        config_manager = IntersectionConfig()
        configs = config_manager.configure_key_intersections()
        
        # Store configurations in database
        storage = NetworkStorageService(db)
        
        # Get latest network
        network = await storage.get_latest_network()
        if not network:
            raise HTTPException(status_code=404, detail="No network found. Import OSM data first.")
        
        network_id = network["_id"]
        
        # Update intersections with signal configs
        updated_count = 0
        for key_id, config in configs.items():
            # Find intersection by key_id
            intersections = await storage.get_intersections(network_id, key_only=True)
            
            for intersection in intersections:
                if intersection.get("key_id") == key_id:
                    success = await storage.update_intersection_signal_config(
                        intersection["_id"],
                        config
                    )
                    if success:
                        updated_count += 1
                    break
        
        logger.info(f"Configured {updated_count} key intersections")
        
        return {
            "success": True,
            "message": f"Configured {len(configs)} key intersections",
            "configurations": configs,
            "updated_count": updated_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring key intersections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/intersections/{intersection_id}/config")
async def get_intersection_config(
    intersection_id: str,
    db = Depends(get_database)
):
    """Get signal configuration for a specific intersection"""
    try:
        from bson import ObjectId
        
        storage = NetworkStorageService(db)
        
        # Get intersection from database
        intersection = await storage.intersections_collection.find_one(
            {"_id": ObjectId(intersection_id)}
        )
        
        if not intersection:
            raise HTTPException(status_code=404, detail="Intersection not found")
        
        signal_config = intersection.get("signal_config")
        
        if not signal_config:
            return {
                "intersection_id": intersection_id,
                "has_config": False,
                "message": "No signal configuration found for this intersection"
            }
        
        return {
            "intersection_id": intersection_id,
            "has_config": True,
            "config": signal_config
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving intersection config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bbox")
async def get_bbox():
    """Get Georgetown bounding box coordinates"""
    return {
        "bbox": get_georgetown_bbox(),
        "description": "Georgetown, Guyana bounding box coordinates"
    }


@router.get("/key-intersections")
async def get_key_intersections_info():
    """Get information about predefined key intersections"""
    return {
        "key_intersections": get_key_intersections(),
        "count": len(get_key_intersections())
    }


@router.get("/traffic-density")
async def get_traffic_density(
    network_id: Optional[str] = None,
    db = Depends(get_database)
):
    """
    Get traffic density data for heatmap visualization
    
    Calculates traffic density based on intersection characteristics
    and optionally real-time simulation data.
    """
    try:
        storage = NetworkStorageService(db)
        
        # Get network
        if network_id:
            network = await storage.get_network(network_id)
        else:
            network = await storage.get_latest_network()
        
        if not network:
            raise HTTPException(status_code=404, detail="No network found")
        
        # Get intersections
        intersections = await storage.get_intersections(network["_id"])
        
        # Calculate density
        calculator = TrafficDensityCalculator()
        density_data = calculator.calculate_intersection_density(intersections)
        
        return {
            "success": True,
            "network_id": network["_id"],
            "density_data": density_data,
            "count": len(density_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating traffic density: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/traffic-density/grid")
async def get_traffic_density_grid(
    grid_size: int = 20,
    db = Depends(get_database)
):
    """
    Get grid-based traffic density data for smooth heatmap visualization
    
    Args:
        grid_size: Number of grid cells per dimension (default: 20)
    """
    try:
        storage = NetworkStorageService(db)
        
        # Get latest network
        network = await storage.get_latest_network()
        if not network:
            raise HTTPException(status_code=404, detail="No network found")
        
        # Get intersections with density
        intersections = await storage.get_intersections(network["_id"])
        
        calculator = TrafficDensityCalculator()
        density_intersections = calculator.calculate_intersection_density(intersections)
        
        # Generate grid
        bbox = network["bbox"]
        grid_data = calculator.generate_heatmap_grid(
            density_intersections,
            bbox,
            grid_size
        )
        
        return {
            "success": True,
            "network_id": network["_id"],
            "grid_size": grid_size,
            "grid_data": grid_data,
            "bbox": bbox
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating density grid: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/intersections/{intersection_id}/history")
async def get_intersection_history(
    intersection_id: str,
    time_range: str = "1h",
    simulation_id: Optional[str] = None,
    db = Depends(get_database)
):
    """
    Get historical data for a specific intersection
    
    Returns signal phase history, queue length evolution, and throughput data
    for the specified time range or simulation.
    
    Args:
        intersection_id: Intersection ID
        time_range: Time range (1h, 6h, 24h, 7d)
        simulation_id: Optional simulation ID to filter data
    """
    try:
        from datetime import datetime, timedelta
        from bson import ObjectId
        import random
        
        # Calculate time range
        time_ranges = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7)
        }
        
        delta = time_ranges.get(time_range, timedelta(hours=1))
        start_time = datetime.utcnow() - delta
        
        # Query simulation results for this intersection
        query = {
            "intersection_id": intersection_id,
            "timestamp": {"$gte": start_time}
        }
        
        if simulation_id:
            query["simulation_id"] = simulation_id
        
        # Get simulation data collection
        sim_data_collection = db["simulation_data"]
        
        # Fetch historical data
        cursor = sim_data_collection.find(query).sort("timestamp", 1).limit(1000)
        data_points = await cursor.to_list(length=1000)
        
        # Return error if no real data exists
        if not data_points:
            logger.warning(f"No historical data found for intersection {intersection_id}")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": "No historical data available for this intersection. Please run a simulation first."
                }
            )
        
        # Process data into different categories
        signal_history = []
        queue_history = []
        throughput_history = []
        
        for point in data_points:
            timestamp = point.get("timestamp", datetime.utcnow()).isoformat()
            
            # Signal phase data
            if "signal_phase" in point:
                signal_history.append({
                    "timestamp": timestamp,
                    "phase": point["signal_phase"],
                    "duration": point.get("phase_duration", 30)
                })
            
            # Queue data
            if "queue_length" in point:
                queue_history.append({
                    "timestamp": timestamp,
                    "queueLength": point["queue_length"],
                    "vehicleCount": point.get("vehicle_count", 0),
                    "avgDelay": point.get("avg_delay", 0)
                })
            
            # Throughput data
            if "throughput" in point:
                throughput_history.append({
                    "timestamp": timestamp,
                    "vehiclesPerHour": point["throughput"],
                    "avgSpeed": point.get("avg_speed", 0),
                    "capacity": point.get("capacity", 1800)
                })
        
        return {
            "success": True,
            "intersection_id": intersection_id,
            "time_range": time_range,
            "signalHistory": signal_history,
            "queueHistory": queue_history,
            "throughputHistory": throughput_history,
            "data_points": len(data_points)
        }
        
    except Exception as e:
        logger.error(f"Error fetching intersection history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/intersections/{intersection_id}/metrics")
async def get_intersection_metrics(
    intersection_id: str,
    time_range: str = "1h",
    simulation_id: Optional[str] = None,
    db = Depends(get_database)
):
    """
    Get performance metrics for a specific intersection
    
    Returns aggregated performance metrics including average delay,
    queue length, throughput, and efficiency.
    
    Args:
        intersection_id: Intersection ID
        time_range: Time range (1h, 6h, 24h, 7d)
        simulation_id: Optional simulation ID to filter data
    """
    try:
        from datetime import datetime, timedelta
        from bson import ObjectId
        import random
        
        # Calculate time range
        time_ranges = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7)
        }
        
        delta = time_ranges.get(time_range, timedelta(hours=1))
        start_time = datetime.utcnow() - delta
        
        # Query simulation results
        query = {
            "intersection_id": intersection_id,
            "timestamp": {"$gte": start_time}
        }
        
        if simulation_id:
            query["simulation_id"] = simulation_id
        
        # Get simulation data collection
        sim_data_collection = db["simulation_data"]
        
        # Aggregate metrics
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "avgDelay": {"$avg": "$avg_delay"},
                    "avgQueueLength": {"$avg": "$queue_length"},
                    "avgThroughput": {"$avg": "$throughput"},
                    "maxQueueLength": {"$max": "$queue_length"},
                    "minDelay": {"$min": "$avg_delay"},
                    "count": {"$sum": 1}
                }
            }
        ]
        
        cursor = sim_data_collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        
        # Return error if no real data exists
        if not results or results[0]["count"] == 0:
            logger.warning(f"No metrics found for intersection {intersection_id}")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": "No metrics available for this intersection. Please run a simulation first."
                }
            )
        
        result = results[0]
        metrics = {
            "avgDelay": result.get("avgDelay", 0),
            "avgQueueLength": result.get("avgQueueLength", 0),
            "throughput": result.get("avgThroughput", 0),
            "maxQueueLength": result.get("maxQueueLength", 0),
            "minDelay": result.get("minDelay", 0),
            "capacityUtilization": min(100, (result.get("avgThroughput", 0) / 1800) * 100),
            "efficiency": max(0, 100 - (result.get("avgDelay", 0) / 60 * 100))
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error fetching intersection metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

