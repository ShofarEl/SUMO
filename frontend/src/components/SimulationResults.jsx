import { useState, useEffect } from 'react';
import axios from 'axios';
import './SimulationResults.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SimulationResults = ({ simulationId, onClose }) => {
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (simulationId) {
      fetchResults();
    }
  }, [simulationId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/simulations/${simulationId}/results`);

      if (response.data.success) {
        setSimulation(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getControlStrategyLabel = (strategy) => {
    const labels = {
      fixed: 'Fixed Timing (Baseline)',
      lstm: 'LSTM Prediction-Enhanced',
      rf: 'Random Forest Prediction',
      dqn: 'DQN Reinforcement Learning',
      ppo: 'PPO Reinforcement Learning',
      marl: 'Multi-Agent RL (MARL)'
    };
    return labels[strategy] || strategy;
  };

  if (loading) {
    return (
      <div className="simulation-results">
        <div className="loading-state">Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simulation-results">
        <div className="error-alert">
          <strong>Error:</strong> {error}
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-close">
            Close
          </button>
        )}
      </div>
    );
  }

  if (!simulation) {
    return null;
  }

  const results = simulation.results || {};

  return (
    <div className="simulation-results">
      <div className="results-header">
        <div>
          <h2>{simulation.name}</h2>
          {simulation.description && (
            <p className="results-description">{simulation.description}</p>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-close-header">
            ×
          </button>
        )}
      </div>

      {/* Configuration Summary */}
      <div className="results-section">
        <h3>Configuration</h3>
        <div className="config-grid">
          <div className="config-item">
            <span className="config-label">Control Strategy</span>
            <span className="config-value">
              {getControlStrategyLabel(simulation.config?.controlStrategy)}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Traffic Demand</span>
            <span className="config-value">{simulation.config?.trafficDemand}</span>
          </div>
          <div className="config-item">
            <span className="config-label">Time of Day</span>
            <span className="config-value">
              {simulation.config?.timeOfDay?.replace('_', ' ')}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Duration</span>
            <span className="config-value">
              {formatDuration(simulation.config?.duration || 0)}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Weather</span>
            <span className="config-value">{simulation.config?.weather}</span>
          </div>
          <div className="config-item">
            <span className="config-label">Completed</span>
            <span className="config-value">{formatDate(simulation.endTime)}</span>
          </div>
        </div>

        {/* Vehicle Mix */}
        {simulation.config?.vehicleMix && (
          <div className="vehicle-mix-display">
            <h4>Vehicle Mix</h4>
            <div className="vehicle-mix-bars">
              <div className="mix-bar">
                <span className="mix-label">Cars</span>
                <div className="mix-bar-container">
                  <div
                    className="mix-bar-fill"
                    style={{
                      width: `${simulation.config.vehicleMix.cars}%`,
                      background: '#4CAF50'
                    }}
                  />
                </div>
                <span className="mix-value">{simulation.config.vehicleMix.cars}%</span>
              </div>
              <div className="mix-bar">
                <span className="mix-label">Motorcycles</span>
                <div className="mix-bar-container">
                  <div
                    className="mix-bar-fill"
                    style={{
                      width: `${simulation.config.vehicleMix.motorcycles}%`,
                      background: '#2196F3'
                    }}
                  />
                </div>
                <span className="mix-value">{simulation.config.vehicleMix.motorcycles}%</span>
              </div>
              <div className="mix-bar">
                <span className="mix-label">Minibuses</span>
                <div className="mix-bar-container">
                  <div
                    className="mix-bar-fill"
                    style={{
                      width: `${simulation.config.vehicleMix.minibuses}%`,
                      background: '#FF9800'
                    }}
                  />
                </div>
                <span className="mix-value">{simulation.config.vehicleMix.minibuses}%</span>
              </div>
              <div className="mix-bar">
                <span className="mix-label">Trucks</span>
                <div className="mix-bar-container">
                  <div
                    className="mix-bar-fill"
                    style={{
                      width: `${simulation.config.vehicleMix.trucks}%`,
                      background: '#9C27B0'
                    }}
                  />
                </div>
                <span className="mix-value">{simulation.config.vehicleMix.trucks}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="results-section">
        <h3>Performance Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">⏱️</div>
            <div className="metric-content">
              <div className="metric-label">Average Delay</div>
              <div className="metric-value">
                {results.avgDelay?.toFixed(2) || 'N/A'}
                <span className="metric-unit">sec</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🚗</div>
            <div className="metric-content">
              <div className="metric-label">Queue Length</div>
              <div className="metric-value">
                {results.avgQueueLength?.toFixed(2) || 'N/A'}
                <span className="metric-unit">m</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <div className="metric-label">Throughput</div>
              <div className="metric-value">
                {results.throughput?.toFixed(0) || 'N/A'}
                <span className="metric-unit">veh/h</span>
              </div>
            </div>
          </div>

          {results.fuelConsumption && (
            <div className="metric-card">
              <div className="metric-icon">⛽</div>
              <div className="metric-content">
                <div className="metric-label">Fuel Consumption</div>
                <div className="metric-value">
                  {results.fuelConsumption.toFixed(2)}
                  <span className="metric-unit">L</span>
                </div>
              </div>
            </div>
          )}

          {results.co2Emissions && (
            <div className="metric-card">
              <div className="metric-icon">🌍</div>
              <div className="metric-content">
                <div className="metric-label">CO₂ Emissions</div>
                <div className="metric-value">
                  {results.co2Emissions.toFixed(2)}
                  <span className="metric-unit">kg</span>
                </div>
              </div>
            </div>
          )}

          {results.predictionRMSE && (
            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-label">Prediction RMSE</div>
                <div className="metric-value">
                  {results.predictionRMSE.toFixed(4)}
                </div>
              </div>
            </div>
          )}

          {results.predictionMAE && (
            <div className="metric-card">
              <div className="metric-icon">📉</div>
              <div className="metric-content">
                <div className="metric-label">Prediction MAE</div>
                <div className="metric-value">
                  {results.predictionMAE.toFixed(4)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Incidents */}
      {simulation.config?.incidents && simulation.config.incidents.length > 0 && (
        <div className="results-section">
          <h3>Incidents</h3>
          <div className="incidents-list">
            {simulation.config.incidents.map((incident, index) => (
              <div key={index} className="incident-card">
                <div className="incident-type">{incident.type}</div>
                <div className="incident-details">
                  <p><strong>Location:</strong> {incident.location}</p>
                  <p><strong>Start Time:</strong> {formatDuration(incident.startTime)}</p>
                  <p><strong>Duration:</strong> {formatDuration(incident.duration)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="results-actions">
        <button className="btn-export">Export Results</button>
        <button className="btn-compare">Compare with Others</button>
        {onClose && (
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default SimulationResults;
