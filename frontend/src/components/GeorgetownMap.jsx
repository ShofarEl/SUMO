import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import TrafficHeatmap from './TrafficHeatmap';
import './GeorgetownMap.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for congestion hotspots
const hotspotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for regular intersections
const intersectionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Vehicle icons by type
const createVehicleIcon = (type) => {
  const colors = {
    car: '#4CAF50',
    motorcycle: '#2196F3',
    minibus: '#FF9800',
    truck: '#9C27B0'
  };
  
  const color = colors[type] || '#666';
  
  return L.divIcon({
    className: 'vehicle-marker',
    html: `<div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

// Signal phase colors
const getSignalColor = (phase) => {
  const colors = {
    green: '#4CAF50',
    yellow: '#FFC107',
    red: '#f44336',
    unknown: '#9E9E9E'
  };
  return colors[phase] || colors.unknown;
};

// Component to handle map bounds
function MapBounds({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  
  return null;
}

/**
 * GeorgetownMap Component
 * 
 * Interactive map visualization of Georgetown road network with intersections,
 * real-time vehicle positions, and signal phase states
 */
function GeorgetownMap({ 
  intersections = [], 
  onIntersectionClick = null,
  showKeyOnly = false,
  showHeatmap = false,
  trafficData = null,
  vehicles = [], // Array of vehicle positions { id, type, lat, lon, speed }
  signalStates = {}, // Object mapping intersection IDs to signal phases
  queueFormations = {}, // Object mapping intersection IDs to queue data
  center = [6.8041, -58.1550], // Georgetown center
  zoom = 13
}) {
  const [selectedIntersection, setSelectedIntersection] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [animatedVehicles, setAnimatedVehicles] = useState([]);

  // Filter intersections based on showKeyOnly prop
  const displayedIntersections = showKeyOnly
    ? intersections.filter(int => int.is_congestion_hotspot)
    : intersections;

  // Prepare heatmap data from intersections or traffic data
  const heatmapData = trafficData || displayedIntersections.map(int => ({
    lat: int.lat,
    lon: int.lon,
    intensity: int.is_congestion_hotspot ? 1.0 : 0.5
  }));

  // Calculate map bounds from intersections
  useEffect(() => {
    if (displayedIntersections.length > 0) {
      const lats = displayedIntersections.map(int => int.lat);
      const lons = displayedIntersections.map(int => int.lon);
      
      const bounds = [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)]
      ];
      
      setMapBounds(bounds);
    }
  }, [displayedIntersections]);

  const handleMarkerClick = useCallback((intersection) => {
    setSelectedIntersection(intersection);
    if (onIntersectionClick) {
      onIntersectionClick(intersection);
    }
  }, [onIntersectionClick]);

  // Animate vehicle movements
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      setAnimatedVehicles(vehicles);
    }
  }, [vehicles]);

  return (
    <div className="georgetown-map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {mapBounds && <MapBounds bounds={mapBounds} />}
        
        {/* Traffic density heatmap overlay */}
        {showHeatmap && heatmapData.length > 0 && (
          <TrafficHeatmap 
            data={heatmapData}
            intensity={0.6}
            radius={30}
            blur={20}
            visible={showHeatmap}
          />
        )}
        
        {displayedIntersections.map((intersection) => {
          const icon = intersection.is_congestion_hotspot ? hotspotIcon : intersectionIcon;
          const signalPhase = signalStates[intersection.id] || 'unknown';
          const signalColor = getSignalColor(signalPhase);
          const queueData = queueFormations[intersection.id];
          
          return (
            <React.Fragment key={intersection.id}>
              {/* Signal phase indicator circle around intersection */}
              {signalStates[intersection.id] && (
                <Circle
                  center={[intersection.lat, intersection.lon]}
                  radius={50}
                  pathOptions={{
                    color: signalColor,
                    fillColor: signalColor,
                    fillOpacity: 0.2,
                    weight: 3
                  }}
                />
              )}
              
              {/* Queue formation visualization */}
              {queueData && queueData.length > 0 && (
                <Circle
                  center={[intersection.lat, intersection.lon]}
                  radius={queueData.length}
                  pathOptions={{
                    color: '#f44336',
                    fillColor: '#f44336',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />
              )}
              
              <Marker
                position={[intersection.lat, intersection.lon]}
                icon={icon}
                eventHandlers={{
                  click: () => handleMarkerClick(intersection)
                }}
              >
                <Popup>
                  <div className="intersection-popup">
                    <h3>{intersection.name || 'Intersection'}</h3>
                    {intersection.is_congestion_hotspot && (
                      <span className="hotspot-badge">Congestion Hotspot</span>
                    )}
                    
                    {/* Signal phase status */}
                    {signalStates[intersection.id] && (
                      <div className="signal-status">
                        <strong>Signal Phase:</strong>
                        <span 
                          className="signal-indicator"
                          style={{ 
                            backgroundColor: signalColor,
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            marginLeft: '8px'
                          }}
                        />
                        <span style={{ marginLeft: '8px', textTransform: 'capitalize' }}>
                          {signalPhase}
                        </span>
                      </div>
                    )}
                    
                    {/* Queue information */}
                    {queueData && (
                      <div className="queue-info">
                        <strong>Queue Length:</strong> {queueData.length?.toFixed(1) || 0}m
                        <br />
                        <strong>Vehicles in Queue:</strong> {queueData.count || 0}
                      </div>
                    )}
                    
                    <div className="intersection-details">
                      <p><strong>OSM ID:</strong> {intersection.osm_id}</p>
                      <p><strong>Degree:</strong> {intersection.degree} connections</p>
                      {intersection.streets && intersection.streets.length > 0 && (
                        <div>
                          <strong>Streets:</strong>
                          <ul>
                            {intersection.streets.slice(0, 3).map((street, idx) => (
                              <li key={idx}>{street}</li>
                            ))}
                            {intersection.streets.length > 3 && (
                              <li>... and {intersection.streets.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {intersection.description && (
                        <p className="description">{intersection.description}</p>
                      )}
                    </div>
                    {intersection.signal_config && (
                      <div className="signal-info">
                        <strong>Signal Configuration:</strong>
                        <p>Cycle: {intersection.signal_config.cycle_length}s</p>
                        <p>Phases: {intersection.signal_config.num_phases}</p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
        
        {/* Vehicle markers */}
        {animatedVehicles.map((vehicle) => (
          <CircleMarker
            key={vehicle.id}
            center={[vehicle.lat, vehicle.lon]}
            radius={4}
            pathOptions={{
              color: 'white',
              fillColor: vehicle.type === 'car' ? '#4CAF50' :
                         vehicle.type === 'motorcycle' ? '#2196F3' :
                         vehicle.type === 'minibus' ? '#FF9800' :
                         vehicle.type === 'truck' ? '#9C27B0' : '#666',
              fillOpacity: 0.8,
              weight: 2
            }}
          >
            <Popup>
              <div className="vehicle-popup">
                <strong>Vehicle {vehicle.id}</strong>
                <p>Type: {vehicle.type}</p>
                <p>Speed: {vehicle.speed?.toFixed(1) || 0} m/s</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {selectedIntersection && (
        <div className="map-info-panel">
          <button 
            className="close-button"
            onClick={() => setSelectedIntersection(null)}
          >
            ×
          </button>
          <h3>{selectedIntersection.name || 'Intersection Details'}</h3>
          <div className="info-content">
            <p><strong>Location:</strong> {selectedIntersection.lat.toFixed(4)}, {selectedIntersection.lon.toFixed(4)}</p>
            <p><strong>Connections:</strong> {selectedIntersection.degree}</p>
            {selectedIntersection.streets && (
              <div>
                <strong>Connected Streets:</strong>
                <ul>
                  {selectedIntersection.streets.map((street, idx) => (
                    <li key={idx}>{street}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GeorgetownMap;
