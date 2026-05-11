"""
OpenStreetMap Data Importer for Georgetown

This module handles downloading OSM data for Georgetown, Guyana and converting
it to SUMO network format using OSMnx and SUMO's netconvert tool.
"""

import os
import logging
import subprocess
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import json

import osmnx as ox
import networkx as nx
import geopandas as gpd
from shapely.geometry import Point, box

logger = logging.getLogger(__name__)


class GeorgetownOSMImporter:
    """Import and process OpenStreetMap data for Georgetown, Guyana"""
    
    # Georgetown bounding box coordinates (lat, lon)
    # These coordinates cover the main Georgetown city center area
    GEORGETOWN_BBOX = {
        "north": 6.8200,   # Northern boundary (near Demerara Bridge)
        "south": 6.7900,   # Southern boundary (South Georgetown)
        "east": -58.1400,  # Eastern boundary (East Georgetown)
        "west": -58.1700   # Western boundary (West Georgetown)
    }
    
    # Key congested intersections in Georgetown
    KEY_INTERSECTIONS = {
        "vlissengen_road": {
            "name": "Vlissengen Road Junction",
            "lat": 6.8100,
            "lon": -58.1550,
            "description": "Major intersection on Vlissengen Road"
        },
        "sheriff_street": {
            "name": "Sheriff Street Junction",
            "lat": 6.8050,
            "lon": -58.1450,
            "description": "Key junction on Sheriff Street"
        },
        "demerara_bridge_approach": {
            "name": "Demerara Harbour Bridge Approach",
            "lat": 6.8200,
            "lon": -58.1650,
            "description": "Approach to Demerara Harbour Bridge"
        },
        "camp_street": {
            "name": "Camp Street Junction",
            "lat": 6.8080,
            "lon": -58.1580,
            "description": "Central Georgetown intersection"
        },
        "regent_street": {
            "name": "Regent Street Junction",
            "lat": 6.8090,
            "lon": -58.1570,
            "description": "Commercial district intersection"
        }
    }
    
    def __init__(self, data_dir: str = "data/osm"):
        """
        Initialize OSM importer
        
        Args:
            data_dir: Directory for storing OSM data
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure OSMnx
        ox.settings.log_console = True
        ox.settings.use_cache = True
        ox.settings.cache_folder = str(self.data_dir / "cache")
    
    def download_georgetown_network(
        self,
        network_type: str = "drive",
        simplify: bool = True,
        retain_all: bool = False
    ) -> nx.MultiDiGraph:
        """
        Download Georgetown road network from OpenStreetMap
        
        Args:
            network_type: Type of network ('drive', 'walk', 'bike', 'all')
            simplify: Whether to simplify the network topology
            retain_all: Whether to retain all nodes (not just intersections)
            
        Returns:
            NetworkX MultiDiGraph representing the road network
        """
        logger.info(f"Downloading Georgetown network from OSM (type: {network_type})")
        
        try:
            # Download network using bounding box
            # OSMnx v1.0+ uses bbox as a tuple (north, south, east, west)
            G = ox.graph_from_bbox(
                bbox=(
                    self.GEORGETOWN_BBOX["north"],
                    self.GEORGETOWN_BBOX["south"],
                    self.GEORGETOWN_BBOX["east"],
                    self.GEORGETOWN_BBOX["west"]
                ),
                network_type=network_type,
                simplify=simplify,
                retain_all=retain_all
            )
            
            logger.info(f"Downloaded network: {len(G.nodes)} nodes, {len(G.edges)} edges")
            
            return G
            
        except Exception as e:
            logger.error(f"Error downloading Georgetown network: {e}")
            raise
    
    def save_network_to_graphml(self, G: nx.MultiDiGraph, output_file: Optional[str] = None) -> str:
        """
        Save network to GraphML format
        
        Args:
            G: NetworkX graph
            output_file: Output file path (optional)
            
        Returns:
            Path to saved file
        """
        if output_file is None:
            output_file = str(self.data_dir / "georgetown_network.graphml")
        
        ox.save_graphml(G, filepath=output_file)
        logger.info(f"Saved network to GraphML: {output_file}")
        
        return output_file
    
    def convert_to_sumo_network(
        self,
        graphml_file: str,
        output_file: Optional[str] = None,
        netconvert_options: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Convert GraphML network to SUMO network format using netconvert
        
        Args:
            graphml_file: Path to GraphML file
            output_file: Output SUMO network file path (optional)
            netconvert_options: Additional netconvert options
            
        Returns:
            Path to generated SUMO network file
        """
        if output_file is None:
            output_file = str(self.data_dir / "georgetown.net.xml")
        
        # Check if SUMO_HOME is set
        sumo_home = os.environ.get("SUMO_HOME")
        if not sumo_home:
            raise EnvironmentError("SUMO_HOME environment variable not set")
        
        # Path to netconvert
        netconvert = os.path.join(sumo_home, "bin", "netconvert")
        if not os.path.exists(netconvert):
            netconvert = "netconvert"  # Try system PATH
        
        # Build netconvert command
        cmd = [
            netconvert,
            "--osm-files", graphml_file,
            "--output-file", output_file,
            "--geometry.remove",
            "--ramps.guess",
            "--junctions.join",
            "--tls.guess-signals",
            "--tls.discard-simple",
            "--tls.join",
            "--tls.default-type", "actuated"
        ]
        
        # Add custom options
        if netconvert_options:
            for key, value in netconvert_options.items():
                cmd.extend([f"--{key}", str(value)])
        
        logger.info(f"Running netconvert: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            logger.info(f"Successfully converted to SUMO network: {output_file}")
            if result.stdout:
                logger.debug(f"netconvert output: {result.stdout}")
            
            return output_file
            
        except subprocess.CalledProcessError as e:
            logger.error(f"netconvert failed: {e.stderr}")
            raise
        except FileNotFoundError:
            logger.error("netconvert not found. Ensure SUMO is installed and SUMO_HOME is set.")
            raise
    
    def extract_intersections(self, G: nx.MultiDiGraph) -> List[Dict]:
        """
        Extract intersection nodes from network
        
        Args:
            G: NetworkX graph
            
        Returns:
            List of intersection dictionaries with node data
        """
        intersections = []
        
        for node, data in G.nodes(data=True):
            # Consider nodes with 3+ edges as intersections
            if G.degree(node) >= 3:
                intersection = {
                    "osm_id": str(node),
                    "lat": data.get("y"),
                    "lon": data.get("x"),
                    "degree": G.degree(node),
                    "street_count": data.get("street_count", 0)
                }
                
                # Add street names if available
                streets = set()
                for _, _, edge_data in G.edges(node, data=True):
                    if "name" in edge_data:
                        streets.add(edge_data["name"])
                
                intersection["streets"] = list(streets)
                intersections.append(intersection)
        
        logger.info(f"Extracted {len(intersections)} intersections")
        return intersections
    
    def extract_road_segments(self, G: nx.MultiDiGraph) -> List[Dict]:
        """
        Extract road segments (edges) from network
        
        Args:
            G: NetworkX graph
            
        Returns:
            List of road segment dictionaries
        """
        segments = []
        
        for u, v, key, data in G.edges(keys=True, data=True):
            segment = {
                "osm_id": data.get("osmid", f"{u}_{v}_{key}"),
                "from_node": str(u),
                "to_node": str(v),
                "name": data.get("name", "Unnamed Road"),
                "highway": data.get("highway", "unclassified"),
                "length": data.get("length", 0),
                "lanes": data.get("lanes", 1),
                "maxspeed": data.get("maxspeed", 50),
                "oneway": data.get("oneway", False)
            }
            
            # Get geometry if available
            if "geometry" in data:
                segment["geometry"] = data["geometry"].wkt
            
            segments.append(segment)
        
        logger.info(f"Extracted {len(segments)} road segments")
        return segments
    
    def identify_key_intersections(
        self,
        intersections: List[Dict],
        radius_meters: float = 100
    ) -> List[Dict]:
        """
        Identify key congested intersections from predefined locations
        
        Args:
            intersections: List of all intersections
            radius_meters: Search radius in meters
            
        Returns:
            List of key intersections with metadata
        """
        key_intersections = []
        
        for key, info in self.KEY_INTERSECTIONS.items():
            target_point = Point(info["lon"], info["lat"])
            
            # Find closest intersection
            closest_intersection = None
            min_distance = float("inf")
            
            for intersection in intersections:
                int_point = Point(intersection["lon"], intersection["lat"])
                distance = target_point.distance(int_point) * 111000  # Rough conversion to meters
                
                if distance < min_distance and distance < radius_meters:
                    min_distance = distance
                    closest_intersection = intersection
            
            if closest_intersection:
                key_intersection = {
                    **closest_intersection,
                    "key_id": key,
                    "name": info["name"],
                    "description": info["description"],
                    "is_congestion_hotspot": True,
                    "distance_from_target": min_distance
                }
                key_intersections.append(key_intersection)
                logger.info(f"Identified key intersection: {info['name']} (distance: {min_distance:.1f}m)")
            else:
                logger.warning(f"Could not find intersection near {info['name']}")
        
        return key_intersections
    
    def export_network_data(
        self,
        G: nx.MultiDiGraph,
        output_file: Optional[str] = None
    ) -> str:
        """
        Export network data to JSON format for storage in MongoDB
        
        Args:
            G: NetworkX graph
            output_file: Output JSON file path (optional)
            
        Returns:
            Path to exported JSON file
        """
        if output_file is None:
            output_file = str(self.data_dir / "georgetown_network_data.json")
        
        # Extract data
        intersections = self.extract_intersections(G)
        segments = self.extract_road_segments(G)
        key_intersections = self.identify_key_intersections(intersections)
        
        # Compile network data
        network_data = {
            "name": "Georgetown Road Network",
            "source": "OpenStreetMap",
            "bbox": self.GEORGETOWN_BBOX,
            "statistics": {
                "total_nodes": len(G.nodes),
                "total_edges": len(G.edges),
                "total_intersections": len(intersections),
                "key_intersections": len(key_intersections)
            },
            "intersections": intersections,
            "road_segments": segments,
            "key_intersections": key_intersections
        }
        
        # Write to JSON
        with open(output_file, "w") as f:
            json.dump(network_data, f, indent=2)
        
        logger.info(f"Exported network data to: {output_file}")
        return output_file
    
    def import_full_georgetown_network(
        self,
        export_graphml: bool = True,
        export_sumo: bool = True,
        export_json: bool = True
    ) -> Dict[str, str]:
        """
        Complete workflow: download, convert, and export Georgetown network
        
        Args:
            export_graphml: Whether to export GraphML format
            export_sumo: Whether to convert to SUMO format
            export_json: Whether to export JSON data
            
        Returns:
            Dictionary with paths to generated files
        """
        logger.info("Starting full Georgetown network import")
        
        result = {}
        
        # Download network
        G = self.download_georgetown_network()
        result["network_graph"] = G
        
        # Export GraphML
        if export_graphml:
            graphml_file = self.save_network_to_graphml(G)
            result["graphml_file"] = graphml_file
        
        # Convert to SUMO
        if export_sumo and export_graphml:
            # First save as OSM XML for netconvert
            osm_file = str(self.data_dir / "georgetown.osm")
            ox.save_graph_xml(G, filepath=osm_file)
            result["osm_file"] = osm_file
            
            # Convert to SUMO network
            sumo_file = self.convert_to_sumo_network(osm_file)
            result["sumo_network_file"] = sumo_file
        
        # Export JSON data
        if export_json:
            json_file = self.export_network_data(G)
            result["json_file"] = json_file
        
        logger.info("Georgetown network import completed successfully")
        return result


def get_georgetown_bbox() -> Dict[str, float]:
    """
    Get Georgetown bounding box coordinates
    
    Returns:
        Dictionary with north, south, east, west coordinates
    """
    return GeorgetownOSMImporter.GEORGETOWN_BBOX


def get_key_intersections() -> Dict[str, Dict]:
    """
    Get predefined key intersections in Georgetown
    
    Returns:
        Dictionary of key intersections with metadata
    """
    return GeorgetownOSMImporter.KEY_INTERSECTIONS
