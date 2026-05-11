import { useState, useEffect } from 'react';
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './PerformanceCharts.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PerformanceCharts = ({ simulationId = null, timeRange = '24h' }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState('all');

  useEffect(() => {
    fetchChartData();
  }, [simulationId, timeRange]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      
      const params = new URLSearchParams();
      if (simulationId) params.append('simulationId', simulationId);
      params.append('timeRange', timeRange);

      const response = await axios.get(`${API_URL}/analytics/chart-data?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data) {
        setChartData(response.data.data);
      } else {
        setError('No simulation data available. Please run a simulation first.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No simulation data found. Please run a simulation to see performance charts.');
      } else {
        setError(err.response?.data?.error?.message || 'Failed to fetch chart data');
      }
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="performance-charts">
        <div className="charts-loading">
          <div className="loading-spinner"></div>
          <p>Loading charts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="performance-charts">
        <div className="charts-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={fetchChartData} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="performance-charts">
        <div className="charts-empty">
          <div className="empty-icon">📊</div>
          <h3>No Simulation Data Available</h3>
          <p>Run a SUMO simulation to generate performance charts with real traffic data.</p>
        </div>
      </div>
    );
  }

  // Validate that we have actual data arrays, not generated mock data
  if (!chartData.timeSeries || chartData.timeSeries.length === 0) {
    return (
      <div className="performance-charts">
        <div className="charts-empty">
          <div className="empty-icon">⚠️</div>
          <h3>Insufficient Data</h3>
          <p>The simulation did not generate enough data points for visualization. Please run a longer simulation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-charts">
      <div className="charts-header">
        <h2>Performance Charts</h2>
        <div className="chart-filters">
          <select 
            value={selectedChart} 
            onChange={(e) => setSelectedChart(e.target.value)}
            className="chart-selector"
          >
            <option value="all">All Charts</option>
            <option value="timeseries">Time Series</option>
            <option value="queue">Queue Distribution</option>
            <option value="throughput">Throughput Comparison</option>
            <option value="emissions">Emissions Analysis</option>
          </select>
        </div>
      </div>

      <div className="charts-container">
        {/* Time-Series Delay Chart */}
        {(selectedChart === 'all' || selectedChart === 'timeseries') && (
          <div className="chart-card">
            <div className="chart-title">
              <h3>Average Delay Over Time</h3>
              <p className="chart-description">24-hour delay pattern showing peak and off-peak periods</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time of Day', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Delay (seconds)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="delay" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Average Delay"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Queue Length Distribution Chart - Only show if we have distribution data */}
        {(selectedChart === 'all' || selectedChart === 'queue') && chartData.queueDistribution && chartData.queueDistribution.length > 0 && (
          <div className="chart-card">
            <div className="chart-title">
              <h3>Queue Length Distribution</h3>
              <p className="chart-description">Frequency of different queue length ranges</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.queueDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="range" 
                  label={{ value: 'Queue Length Range', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="count" 
                  fill="#82ca9d" 
                  name="Occurrences"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Throughput Comparison Chart - Only show if we have comparison data */}
        {(selectedChart === 'all' || selectedChart === 'throughput') && chartData.throughputComparison && chartData.throughputComparison.length > 0 && (
          <div className="chart-card">
            <div className="chart-title">
              <h3>Throughput Comparison by Control Strategy</h3>
              <p className="chart-description">Vehicle throughput across different signal control methods</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.throughputComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="strategy" 
                  label={{ value: 'Control Strategy', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Throughput (vehicles/hour)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="throughput" 
                  fill="#8884d8" 
                  name="Throughput"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Emissions Analysis Chart - Only show if we have emissions data */}
        {(selectedChart === 'all' || selectedChart === 'emissions') && chartData.emissions && chartData.emissions.length > 0 && (
          <div className="chart-card">
            <div className="chart-title">
              <h3>CO₂ Emissions by Vehicle Type</h3>
              <p className="chart-description">Breakdown of emissions contribution by vehicle category</p>
            </div>
            <div className="emissions-chart-container">
              <ResponsiveContainer width="50%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.emissions}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ vehicle, percentage }) => `${vehicle}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="emissions"
                  >
                    {chartData.emissions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="emissions-legend">
                <h4>Emissions Breakdown</h4>
                {chartData.emissions.map((item, index) => (
                  <div key={index} className="legend-item">
                    <div 
                      className="legend-color" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div className="legend-details">
                      <span className="legend-label">{item.vehicle}</span>
                      <span className="legend-value">
                        {item.emissions.toFixed(2)} kg ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Additional Time-Series Chart for Queue Length */}
        {(selectedChart === 'all' || selectedChart === 'timeseries') && (
          <div className="chart-card">
            <div className="chart-title">
              <h3>Queue Length Over Time</h3>
              <p className="chart-description">24-hour queue length pattern</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time of Day', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Queue Length (meters)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="queueLength" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.6}
                  name="Queue Length"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Throughput Time Series */}
        {(selectedChart === 'all' || selectedChart === 'throughput') && (
          <div className="chart-card">
            <div className="chart-title">
              <h3>Throughput Over Time</h3>
              <p className="chart-description">Vehicle throughput throughout the day</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time of Day', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Throughput (vehicles/hour)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="throughput" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="Throughput"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceCharts;
