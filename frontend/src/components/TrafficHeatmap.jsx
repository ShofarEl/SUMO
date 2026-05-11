import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * TrafficHeatmap Component
 * 
 * Displays a heatmap overlay showing traffic density based on intersection data
 */
function TrafficHeatmap({ data, intensity = 0.5, radius = 25, blur = 15, visible = true }) {
  const map = useMap();

  useEffect(() => {
    if (!visible || !data || data.length === 0) {
      return;
    }

    // Convert data to heatmap format [lat, lon, intensity]
    const heatmapData = data.map(point => {
      const lat = point.lat || point[0];
      const lon = point.lon || point[1];
      const value = point.intensity || point[2] || 1;
      
      return [lat, lon, value];
    });

    // Create heatmap layer
    const heatLayer = L.heatLayer(heatmapData, {
      radius: radius,
      blur: blur,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'green',
        0.3: 'yellow',
        0.6: 'orange',
        0.8: 'red',
        1.0: 'darkred'
      }
    });

    // Add to map
    heatLayer.addTo(map);

    // Cleanup on unmount or when dependencies change
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, data, intensity, radius, blur, visible]);

  return null;
}

export default TrafficHeatmap;
