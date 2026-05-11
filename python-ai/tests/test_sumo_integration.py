import pytest
import os
from app.services.sumo.osm_importer import OSMImporter
from app.services.sumo.config import SUMOConfig
from app.services.sumo.vehicle_types import VehicleTypeManager
from app.services.sumo.demand_generator import DemandGenerator


class TestOSMImporter:
    """Test OSM data import functionality"""
    
    def test_osm_importer_initialization(self):
        """Test OSM importer can be initialized"""
        importer = OSMImporter()
        assert importer is not None
    
    def test_georgetown_bbox_defined(self):
        """Test Georgetown bounding box is properly defined"""
        importer = OSMImporter()
        bbox = importer.get_georgetown_bbox()
        
        assert bbox is not None
        assert len(bbox) == 4
        assert all(isinstance(coord, (int, float)) for coord in bbox)
    
    def test_network_download_structure(self):
        """Test network download returns expected structure"""
        importer = OSMImporter()
        # Test with small area to avoid long downloads
        try:
            network = importer.download_network(
                north=6.8100,
                south=6.8000,
                east=-58.1500,
                west=-58.1600
            )
            assert network is not None
        except Exception as e:
            # Network download may fail without internet
            pytest.skip(f"Network download failed: {e}")


class TestSUMOConfig:
    """Test SUMO configuration functionality"""
    
    def test_sumo_config_initialization(self):
        """Test SUMO config can be initialized"""
        config = SUMOConfig()
        assert config is not None
    
    def test_config_file_generation(self):
        """Test configuration file generation"""
        config = SUMOConfig()
        config_content = config.generate_config(
            net_file="test.net.xml",
            route_file="test.rou.xml",
            begin_time=0,
            end_time=3600
        )
        
        assert config_content is not None
        assert "test.net.xml" in config_content
        assert "test.rou.xml" in config_content


class TestVehicleTypeManager:
    """Test vehicle type management"""
    
    def test_vehicle_types_defined(self):
        """Test all vehicle types are defined"""
        manager = VehicleTypeManager()
        vehicle_types = manager.get_vehicle_types()
        
        assert 'car' in vehicle_types
        assert 'motorcycle' in vehicle_types
        assert 'minibus' in vehicle_types
        assert 'truck' in vehicle_types
    
    def test_vehicle_mix_percentages(self):
        """Test vehicle mix matches Guyana statistics"""
        manager = VehicleTypeManager()
        mix = manager.get_default_vehicle_mix()
        
        assert mix['cars'] == 55
        assert mix['motorcycles'] == 25
        assert mix['minibuses'] == 15
        assert mix['trucks'] == 5
        assert sum(mix.values()) == 100
    
    def test_vehicle_type_properties(self):
        """Test vehicle type properties are valid"""
        manager = VehicleTypeManager()
        car_props = manager.get_vehicle_properties('car')
        
        assert 'length' in car_props
        assert 'maxSpeed' in car_props
        assert 'accel' in car_props
        assert 'decel' in car_props
        assert car_props['maxSpeed'] > 0


class TestDemandGenerator:
    """Test traffic demand generation"""
    
    def test_demand_generator_initialization(self):
        """Test demand generator can be initialized"""
        generator = DemandGenerator()
        assert generator is not None
    
    def test_peak_hour_profiles(self):
        """Test peak hour demand profiles"""
        generator = DemandGenerator()
        
        morning_peak = generator.get_demand_profile('morning_peak')
        assert morning_peak is not None
        assert morning_peak['start_time'] == 7 * 3600  # 7 AM
        assert morning_peak['end_time'] == 9 * 3600    # 9 AM
        
        evening_peak = generator.get_demand_profile('evening_peak')
        assert evening_peak is not None
        assert evening_peak['start_time'] == 16 * 3600  # 4 PM
        assert evening_peak['end_time'] == 18.5 * 3600  # 6:30 PM
    
    def test_vehicle_generation_rate(self):
        """Test vehicle generation produces valid rates"""
        generator = DemandGenerator()
        rate = generator.calculate_generation_rate('peak', 'car')
        
        assert rate > 0
        assert isinstance(rate, (int, float))
    
    def test_demand_profile_validation(self):
        """Test demand profile validation"""
        generator = DemandGenerator()
        
        with pytest.raises(ValueError):
            generator.get_demand_profile('invalid_profile')
