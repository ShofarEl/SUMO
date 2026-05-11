import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './IntersectionDetail.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * IntersectionDetail Modal Component
 * 
 * Displays detailed information about a specific intersection including:
 * - Signal phase timing history
 * - Queue length evolution charts
 * - Vehicle throughput graphs
 * - Historical performance data
 */
function IntersectionDetail({ intersection, onClose, simulationId = null }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [signalHistory, setSignalHistory] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [throughputHistory, setThroughputHistory] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h, 7d

  useEffect(() => {
    if (intersection) {
      fetchIntersectionData();
    }
  }, [intersection, timeRange, simulationId]);

  const fetchIntersectionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch historical performance data
      const params = {
        timeRange,
        ...(simulationId && { simulationId })
      };

      const [historyResponse, metricsResponse] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/map/intersections/${intersection.id}/history`,
          { headers, params }
        ).catch(() => ({ data: null })),
        axios.get(
          `${API_BASE_URL}/map/intersections/${intersection.id}/metrics`,
          { headers, params }
        ).catch(() => ({ data: null }))
      ]);

      if (historyResponse.data) {
        setHistoricalData(historyResponse.data);
        processHistoricalData(historyResponse.data);
      }

      if (metricsResponse.data) {
        setPerformanceMetrics(metricsResponse.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching intersection data:', err);
      setError('Failed to load intersection data');
      setLoading(false);
    }
  };

  const processHistoricalData = (data) => {
    // Process signal phase history
    if (data.signalHistory) {
      const signalData = data.signalHistory.map((entry, idx) => ({
        time: formatTime(entry.timestamp),
        phase: entry.phase,
        duration: entry.duration,
        index: idx
      }));
      setSignalHistory(signalData);
    }

    // Process queue length evolution
    if (data.queueHistory) {
      const queueData = data.queueHistory.map(entry => ({
        time: formatTime(entry.timestamp),
        queueLength: entry.queueLength || 0,
        vehicleCount: entry.vehicleCount || 0,
        avgDelay: entry.avgDelay || 0
      }));
      setQueueHistory(queueData);
    }

    // Process throughput data
    if (data.throughputHistory) {
      const throughputData = data.throughputHistory.map(entry => ({
        time: formatTime(entry.timestamp),
        vehiclesPerHour: entry.vehiclesPerHour || 0,
        avgSpeed: entry.avgSpeed || 0,
        capacity: entry.capacity || 0
      }));
      setThroughputHistory(throughputData);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSignalPhaseColor = (phase) => {
    const colors = {
      green: '#4CAF50',
      yellow: '#FFC107',
      red: '#f44336',
      unknown: '#9E9E9E'
    };
    return colors[phase] || colors.unknown;
  };

  const renderOverviewTab = () => (
    <div className="tab-content">
      <div className="overview-grid">
        <div className="info-card">
          <h3>Location Information</h3>
          <div className="info-row">
            <span className="label">Name:</span>
            <span className="value">{intersection.name || 'Unnamed Intersection'}</span>
          </div>
          <div className="info-row">
            <span className="label">OSM ID:</span>
            <span className="value">{intersection.osm_id || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Coordinates:</span>
            <span className="value">
              {intersection.lat?.toFixed(6)}, {intersection.lon?.toFixed(6)}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Connections:</span>
            <span className="value">{intersection.degree || 0}</span>
          </div>
          {intersection.is_congestion_hotspot && (
            <div className="hotspot-badge">
              ⚠️ Known Congestion Hotspot
            </div>
          )}
        </div>

        <div className="info-card">
          <h3>Signal Configuration</h3>
          {intersection.signal_config ? (
            <>
              <div className="info-row">
                <span className="label">Type:</span>
                <span className="value">{intersection.signal_config.type || 'Fixed'}</span>
              </div>
              <div className="info-row">
                <span className="label">Cycle Length:</span>
                <span className="value">{intersection.signal_config.cycle_length}s</span>
              </div>
              <div className="info-row">
                <span className="label">Phases:</span>
                <span className="value">{intersection.signal_config.num_phases || 0}</span>
              </div>
            </>
          ) : (
            <p className="no-data">No signal configuration available</p>
          )}
        </div>

        {performanceMetrics && (
          <div className="info-card">
            <h3>Current Performance</h3>
            <div className="info-row">
              <span className="label">Avg Delay:</span>
              <span className="value">{performanceMetrics.avgDelay?.toFixed(2)}s</span>
            </div>
            <div className="info-row">
              <span className="label">Queue Length:</span>
              <span className="value">{performanceMetrics.avgQueueLength?.toFixed(1)}m</span>
            </div>
            <div className="info-row">
              <span className="label">Throughput:</span>
              <span className="value">{performanceMetrics.throughput?.toFixed(0)} veh/h</span>
            </div>
            <div className="info-row">
              <span className="label">Capacity Utilization:</span>
              <span className="value">{performanceMetrics.capacityUtilization?.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {intersection.streets && intersection.streets.length > 0 && (
          <div className="info-card">
            <h3>Connected Streets</h3>
            <ul className="streets-list">
              {intersection.streets.map((street, idx) => (
                <li key={idx}>{street}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {intersection.description && (
        <div className="description-section">
          <h3>Description</h3>
          <p>{intersection.description}</p>
        </div>
      )}
    </div>
  );

  const renderSignalTimingTab = () => (
    <div className="tab-content">
      <h3>Signal Phase Timing History</h3>
      
      {intersection.signal_config?.phases && (
        <div className="phases-overview">
          <h4>Configured Phases</h4>
          <div className="phases-grid">
            {intersection.signal_config.phases.map((phase, idx) => (
              <div key={idx} className="phase-card">
                <div 
                  className="phase-indicator"
                  style={{ backgroundColor: getSignalPhaseColor(phase.name?.toLowerCase()) }}
                />
                <div className="phase-info">
                  <strong>Phase {phase.phase_id || idx + 1}</strong>
                  <p>{phase.name}</p>
                  <span className="phase-duration">
                    Green: {phase.duration}s | Yellow: {phase.yellow_duration || 3}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {signalHistory.length > 0 ? (
        <div className="chart-container">
          <h4>Phase Changes Over Time</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={signalHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Duration (s)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="duration" fill="#2196F3" name="Phase Duration" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="no-data-message">
          <p>No signal timing history available for the selected time range.</p>
          <p className="hint">Run a simulation to generate signal timing data.</p>
        </div>
      )}
    </div>
  );

  const renderQueueAnalysisTab = () => (
    <div className="tab-content">
      <h3>Queue Length Evolution</h3>
      
      {queueHistory.length > 0 ? (
        <>
          <div className="chart-container">
            <h4>Queue Length Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={queueHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Queue Length (m)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="queueLength" 
                  stroke="#f44336" 
                  fill="#f44336" 
                  fillOpacity={0.3}
                  name="Queue Length"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4>Vehicles in Queue</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={queueHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Vehicle Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="vehicleCount" 
                  stroke="#FF9800" 
                  strokeWidth={2}
                  name="Vehicles"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4>Average Delay</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={queueHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Delay (s)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgDelay" 
                  stroke="#9C27B0" 
                  strokeWidth={2}
                  name="Avg Delay"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="no-data-message">
          <p>No queue data available for the selected time range.</p>
          <p className="hint">Run a simulation to generate queue analysis data.</p>
        </div>
      )}
    </div>
  );

  const renderThroughputTab = () => (
    <div className="tab-content">
      <h3>Vehicle Throughput Analysis</h3>
      
      {throughputHistory.length > 0 ? (
        <>
          <div className="chart-container">
            <h4>Throughput Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={throughputHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Vehicles/Hour', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="vehiclesPerHour" 
                  stroke="#4CAF50" 
                  strokeWidth={2}
                  name="Throughput"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="capacity" 
                  stroke="#9E9E9E" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Capacity"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4>Average Speed</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={throughputHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Speed (m/s)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="avgSpeed" 
                  stroke="#2196F3" 
                  fill="#2196F3" 
                  fillOpacity={0.3}
                  name="Avg Speed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {performanceMetrics && (
            <div className="metrics-summary">
              <h4>Performance Summary</h4>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Peak Throughput</span>
                  <span className="metric-value">
                    {Math.max(...throughputHistory.map(d => d.vehiclesPerHour)).toFixed(0)} veh/h
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Avg Throughput</span>
                  <span className="metric-value">
                    {(throughputHistory.reduce((sum, d) => sum + d.vehiclesPerHour, 0) / throughputHistory.length).toFixed(0)} veh/h
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Avg Speed</span>
                  <span className="metric-value">
                    {(throughputHistory.reduce((sum, d) => sum + d.avgSpeed, 0) / throughputHistory.length).toFixed(2)} m/s
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Capacity Utilization</span>
                  <span className="metric-value">
                    {performanceMetrics.capacityUtilization?.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-data-message">
          <p>No throughput data available for the selected time range.</p>
          <p className="hint">Run a simulation to generate throughput analysis data.</p>
        </div>
      )}
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="tab-content">
      <h3>Historical Performance Data</h3>
      
      {performanceMetrics ? (
        <div className="performance-overview">
          <div className="performance-grid">
            <div className="performance-card">
              <div className="performance-icon delay-icon">⏱️</div>
              <div className="performance-content">
                <h4>Average Delay</h4>
                <p className="performance-value">{performanceMetrics.avgDelay?.toFixed(2)}s</p>
                <p className="performance-trend">
                  {performanceMetrics.delayTrend > 0 ? '↑' : '↓'} 
                  {Math.abs(performanceMetrics.delayTrend || 0).toFixed(1)}% vs last period
                </p>
              </div>
            </div>

            <div className="performance-card">
              <div className="performance-icon queue-icon">🚗</div>
              <div className="performance-content">
                <h4>Queue Length</h4>
                <p className="performance-value">{performanceMetrics.avgQueueLength?.toFixed(1)}m</p>
                <p className="performance-trend">
                  {performanceMetrics.queueTrend > 0 ? '↑' : '↓'} 
                  {Math.abs(performanceMetrics.queueTrend || 0).toFixed(1)}% vs last period
                </p>
              </div>
            </div>

            <div className="performance-card">
              <div className="performance-icon throughput-icon">📊</div>
              <div className="performance-content">
                <h4>Throughput</h4>
                <p className="performance-value">{performanceMetrics.throughput?.toFixed(0)} veh/h</p>
                <p className="performance-trend">
                  {performanceMetrics.throughputTrend > 0 ? '↑' : '↓'} 
                  {Math.abs(performanceMetrics.throughputTrend || 0).toFixed(1)}% vs last period
                </p>
              </div>
            </div>

            <div className="performance-card">
              <div className="performance-icon efficiency-icon">⚡</div>
              <div className="performance-content">
                <h4>Efficiency</h4>
                <p className="performance-value">{performanceMetrics.efficiency?.toFixed(1)}%</p>
                <p className="performance-trend">
                  {performanceMetrics.efficiencyTrend > 0 ? '↑' : '↓'} 
                  {Math.abs(performanceMetrics.efficiencyTrend || 0).toFixed(1)}% vs last period
                </p>
              </div>
            </div>
          </div>

          {performanceMetrics.historicalComparison && (
            <div className="historical-comparison">
              <h4>Historical Comparison</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceMetrics.historicalComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" label={{ value: 'Delay (s)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Throughput (veh/h)', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avgDelay" stroke="#f44336" name="Avg Delay" />
                  <Line yAxisId="right" type="monotone" dataKey="throughput" stroke="#4CAF50" name="Throughput" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="no-data-message">
          <p>No historical performance data available.</p>
          <p className="hint">Performance metrics will be available after running simulations.</p>
        </div>
      )}
    </div>
  );

  if (!intersection) {
    return null;
  }

  return (
    <div className="intersection-detail-modal">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <div className="header-left">
            <h2>{intersection.name || 'Intersection Details'}</h2>
            {intersection.is_congestion_hotspot && (
              <span className="hotspot-indicator">⚠️ Hotspot</span>
            )}
          </div>
          <div className="header-right">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-range-select"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'signals' ? 'active' : ''}`}
            onClick={() => setActiveTab('signals')}
          >
            Signal Timing
          </button>
          <button
            className={`tab-button ${activeTab === 'queues' ? 'active' : ''}`}
            onClick={() => setActiveTab('queues')}
          >
            Queue Analysis
          </button>
          <button
            className={`tab-button ${activeTab === 'throughput' ? 'active' : ''}`}
            onClick={() => setActiveTab('throughput')}
          >
            Throughput
          </button>
          <button
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading intersection data...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchIntersectionData} className="retry-button">
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'signals' && renderSignalTimingTab()}
              {activeTab === 'queues' && renderQueueAnalysisTab()}
              {activeTab === 'throughput' && renderThroughputTab()}
              {activeTab === 'performance' && renderPerformanceTab()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default IntersectionDetail;
