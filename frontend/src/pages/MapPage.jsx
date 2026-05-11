import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GeorgetownMap from '../components/GeorgetownMap';
import IntersectionDetail from '../components/IntersectionDetail';
import './MapPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function MapPage() {
  const [intersections, setIntersections] = useState([]);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showKeyOnly, setShowKeyOnly] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedIntersection, setSelectedIntersection] = useState(null);

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch latest network info through backend
      const networkResponse = await axios.get(`${API_BASE_URL}/map/network/latest`, { headers });
      const network = networkResponse.data.data;
      setNetworkInfo(network);

      // Fetch intersections for the network
      const intersectionsResponse = await axios.get(
        `${API_BASE_URL}/map/intersections`,
        { headers }
      );
      setIntersections(intersectionsResponse.data.data || []);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching network data:', err);
      
      if (err.response?.status === 404) {
        setError('No network data found. Please import Georgetown network data first.');
      } else {
        setError('Failed to load map data. Please try again later.');
      }
      
      setLoading(false);
    }
  };

  const handleImportNetwork = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API_BASE_URL}/map/import-network`, {
        network_type: 'drive',
        simplify: true,
        export_graphml: true,
        export_sumo: true,
        export_json: true
      }, { headers });

      if (response.data.success) {
        // Refresh network data
        await fetchNetworkData();
      }
    } catch (err) {
      console.error('Error importing network:', err);
      setError('Failed to import network data. Please check the Python AI service.');
      setLoading(false);
    }
  };

  const handleConfigureIntersections = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API_BASE_URL}/map/configure-intersections`, {}, { headers });

      if (response.data.success) {
        // Refresh network data to get updated signal configs
        await fetchNetworkData();
        alert(`Successfully configured ${response.data.updated_count} key intersections`);
      }
    } catch (err) {
      console.error('Error configuring intersections:', err);
      setError('Failed to configure intersections.');
      setLoading(false);
    }
  };

  const handleIntersectionClick = (intersection) => {
    setSelectedIntersection(intersection);
  };

  const handleCloseDetail = () => {
    setSelectedIntersection(null);
  };

  if (loading) {
    return (
      <div className="map-page">
        <div className="map-loading">
          <div className="spinner"></div>
          <p>Loading Georgetown map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-page">
        <div className="map-error">
          <div className="error-content">
            <h2>Unable to Load Map</h2>
            <p>{error}</p>
            <button onClick={handleImportNetwork} className="btn-primary">
              Import Georgetown Network
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-page">
      <div className="map-header">
        <div className="header-content">
          <h1>Georgetown Road Network</h1>
          {networkInfo && (
            <div className="network-stats">
              <span className="stat">
                <strong>{networkInfo.statistics.total_intersections}</strong> Intersections
              </span>
              <span className="stat">
                <strong>{networkInfo.statistics.key_intersections}</strong> Key Hotspots
              </span>
              <span className="stat">
                <strong>{networkInfo.statistics.total_edges}</strong> Road Segments
              </span>
            </div>
          )}
        </div>
        <div className="header-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showKeyOnly}
              onChange={(e) => setShowKeyOnly(e.target.checked)}
            />
            Show Key Intersections Only
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
            />
            Show Traffic Density Heatmap
          </label>
          <button onClick={handleConfigureIntersections} className="btn-secondary">
            Configure Signals
          </button>
          <button onClick={fetchNetworkData} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div className="map-content">
        <GeorgetownMap
          intersections={intersections}
          onIntersectionClick={handleIntersectionClick}
          showKeyOnly={showKeyOnly}
          showHeatmap={showHeatmap}
        />
      </div>

      {selectedIntersection && (
        <IntersectionDetail
          intersection={selectedIntersection}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

export default MapPage;
