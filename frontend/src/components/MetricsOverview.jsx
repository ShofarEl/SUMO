import { useState, useEffect } from 'react';
import axios from 'axios';
import './MetricsOverview.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MetricsOverview = ({ refreshInterval = 30000 }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchMetrics();

    // Set up auto-refresh if interval is provided
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/analytics/metrics`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMetrics(response.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  };

  const getTrendIcon = (trend) => {
    if (!trend || trend === 0) return '━';
    return trend > 0 ? '↑' : '↓';
  };

  const getTrendClass = (trend, isInverse = false) => {
    if (!trend || trend === 0) return 'neutral';
    // For metrics where lower is better (delay, queue, emissions), invert the trend
    if (isInverse) {
      return trend > 0 ? 'negative' : 'positive';
    }
    return trend > 0 ? 'positive' : 'negative';
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000);
    
    if (diff < 60) return `Updated ${diff}s ago`;
    if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
    return `Updated ${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="metrics-overview">
        <div className="metrics-header">
          <h2>Performance Metrics</h2>
        </div>
        <div className="metrics-loading">
          <div className="loading-spinner"></div>
          <p>Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metrics-overview">
        <div className="metrics-header">
          <h2>Performance Metrics</h2>
        </div>
        <div className="metrics-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={fetchMetrics} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="metrics-overview">
        <div className="metrics-header">
          <h2>Performance Metrics</h2>
        </div>
        <div className="metrics-empty">
          <p>No metrics available. Run simulations to see performance data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-overview">
      <div className="metrics-header">
        <h2>Performance Metrics</h2>
        <div className="metrics-meta">
          <span className="last-updated">{formatLastUpdated()}</span>
          <button onClick={fetchMetrics} className="btn-refresh" title="Refresh metrics">
            🔄
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Average Delay */}
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon delay">⏱️</div>
            <div className="metric-info">
              <h3 className="metric-label">Average Delay</h3>
              <p className="metric-description">Per vehicle</p>
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value-container">
              <span className="metric-value">
                {formatValue(metrics.avgDelay)}
              </span>
              <span className="metric-unit">sec</span>
            </div>
            {metrics.avgDelayTrend !== undefined && (
              <div className={`metric-trend ${getTrendClass(metrics.avgDelayTrend, true)}`}>
                <span className="trend-icon">{getTrendIcon(metrics.avgDelayTrend)}</span>
                <span className="trend-value">
                  {Math.abs(metrics.avgDelayTrend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Queue Length */}
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon queue">🚗</div>
            <div className="metric-info">
              <h3 className="metric-label">Queue Length</h3>
              <p className="metric-description">Average</p>
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value-container">
              <span className="metric-value">
                {formatValue(metrics.avgQueueLength)}
              </span>
              <span className="metric-unit">m</span>
            </div>
            {metrics.avgQueueLengthTrend !== undefined && (
              <div className={`metric-trend ${getTrendClass(metrics.avgQueueLengthTrend, true)}`}>
                <span className="trend-icon">{getTrendIcon(metrics.avgQueueLengthTrend)}</span>
                <span className="trend-value">
                  {Math.abs(metrics.avgQueueLengthTrend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Throughput */}
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon throughput">📊</div>
            <div className="metric-info">
              <h3 className="metric-label">Throughput</h3>
              <p className="metric-description">Vehicles per hour</p>
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value-container">
              <span className="metric-value">
                {formatValue(metrics.throughput, 0)}
              </span>
              <span className="metric-unit">veh/h</span>
            </div>
            {metrics.throughputTrend !== undefined && (
              <div className={`metric-trend ${getTrendClass(metrics.throughputTrend)}`}>
                <span className="trend-icon">{getTrendIcon(metrics.throughputTrend)}</span>
                <span className="trend-value">
                  {Math.abs(metrics.throughputTrend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Prediction Accuracy (RMSE/MAE) */}
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon accuracy">🎯</div>
            <div className="metric-info">
              <h3 className="metric-label">Prediction Accuracy</h3>
              <p className="metric-description">RMSE / MAE</p>
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value-container dual">
              <div className="dual-metric">
                <span className="metric-value small">
                  {formatValue(metrics.predictionRMSE, 4)}
                </span>
                <span className="metric-sublabel">RMSE</span>
              </div>
              <div className="dual-metric-separator">/</div>
              <div className="dual-metric">
                <span className="metric-value small">
                  {formatValue(metrics.predictionMAE, 4)}
                </span>
                <span className="metric-sublabel">MAE</span>
              </div>
            </div>
            {metrics.predictionAccuracyTrend !== undefined && (
              <div className={`metric-trend ${getTrendClass(metrics.predictionAccuracyTrend, true)}`}>
                <span className="trend-icon">{getTrendIcon(metrics.predictionAccuracyTrend)}</span>
                <span className="trend-value">
                  {Math.abs(metrics.predictionAccuracyTrend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CO2 Emissions */}
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon emissions">🌍</div>
            <div className="metric-info">
              <h3 className="metric-label">CO₂ Emissions</h3>
              <p className="metric-description">Total</p>
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value-container">
              <span className="metric-value">
                {formatValue(metrics.co2Emissions)}
              </span>
              <span className="metric-unit">kg</span>
            </div>
            {metrics.co2EmissionsTrend !== undefined && (
              <div className={`metric-trend ${getTrendClass(metrics.co2EmissionsTrend, true)}`}>
                <span className="trend-icon">{getTrendIcon(metrics.co2EmissionsTrend)}</span>
                <span className="trend-value">
                  {Math.abs(metrics.co2EmissionsTrend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      {metrics.totalSimulations !== undefined && (
        <div className="metrics-footer">
          <div className="footer-stat">
            <span className="footer-label">Total Simulations:</span>
            <span className="footer-value">{metrics.totalSimulations}</span>
          </div>
          {metrics.completedSimulations !== undefined && (
            <div className="footer-stat">
              <span className="footer-label">Completed:</span>
              <span className="footer-value">{metrics.completedSimulations}</span>
            </div>
          )}
          {metrics.avgSimulationDuration !== undefined && (
            <div className="footer-stat">
              <span className="footer-label">Avg Duration:</span>
              <span className="footer-value">
                {Math.floor(metrics.avgSimulationDuration / 60)}m {metrics.avgSimulationDuration % 60}s
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricsOverview;
