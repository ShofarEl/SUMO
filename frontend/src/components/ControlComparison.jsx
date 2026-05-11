import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ControlComparison.css';

const ControlComparison = ({ agentId }) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('delay');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'detailed'

  useEffect(() => {
    fetchComparisonData();
  }, [agentId]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/agents/${agentId}/performance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const result = await response.json();
      const data = result.data;

      // Build comparison data structure
      const comparison = {
        agentName: data.name,
        algorithm: data.algorithm,
        isMultiAgent: data.isMultiAgent,
        performance: data.performance || {},
        evaluationResults: data.evaluationResults || null
      };

      // Calculate baseline metrics (fixed timing)
      // These would typically come from a baseline simulation
      const baselineMetrics = {
        avgDelay: 120, // seconds
        avgQueueLength: 50, // meters
        throughput: 800, // vehicles/hour
        fuelConsumption: 100, // liters
        co2Emissions: 250 // kg
      };

      // Calculate adaptive control metrics from agent performance
      const adaptiveMetrics = {
        avgDelay: baselineMetrics.avgDelay * (1 - (comparison.performance.delayReduction || 0) / 100),
        avgQueueLength: baselineMetrics.avgQueueLength * (1 - (comparison.performance.queueReduction || 0) / 100),
        throughput: baselineMetrics.throughput * (1 + (comparison.performance.throughputIncrease || 0) / 100),
        fuelConsumption: baselineMetrics.fuelConsumption * (1 - (comparison.performance.fuelSavings || 0) / 100),
        co2Emissions: baselineMetrics.co2Emissions * (1 - (comparison.performance.emissionsReduction || 0) / 100)
      };

      setComparisonData({
        ...comparison,
        baseline: baselineMetrics,
        adaptive: adaptiveMetrics,
        improvements: comparison.performance
      });
    } catch (err) {
      console.error('Error fetching comparison data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMetricData = () => {
    if (!comparisonData) return [];

    const metrics = {
      delay: {
        label: 'Average Delay (seconds)',
        baseline: comparisonData.baseline.avgDelay,
        adaptive: comparisonData.adaptive.avgDelay,
        improvement: comparisonData.improvements.delayReduction
      },
      queue: {
        label: 'Average Queue Length (meters)',
        baseline: comparisonData.baseline.avgQueueLength,
        adaptive: comparisonData.adaptive.avgQueueLength,
        improvement: comparisonData.improvements.queueReduction
      },
      throughput: {
        label: 'Throughput (vehicles/hour)',
        baseline: comparisonData.baseline.throughput,
        adaptive: comparisonData.adaptive.throughput,
        improvement: comparisonData.improvements.throughputIncrease
      },
      fuel: {
        label: 'Fuel Consumption (liters)',
        baseline: comparisonData.baseline.fuelConsumption,
        adaptive: comparisonData.adaptive.fuelConsumption,
        improvement: comparisonData.improvements.fuelSavings
      },
      emissions: {
        label: 'CO2 Emissions (kg)',
        baseline: comparisonData.baseline.co2Emissions,
        adaptive: comparisonData.adaptive.co2Emissions,
        improvement: comparisonData.improvements.emissionsReduction
      }
    };

    return metrics;
  };

  const getChartData = () => {
    const metrics = getMetricData();
    
    return Object.keys(metrics).map(key => ({
      metric: key.charAt(0).toUpperCase() + key.slice(1),
      'Fixed Timing': metrics[key].baseline,
      'Adaptive Control': metrics[key].adaptive
    }));
  };

  const getImprovementData = () => {
    const metrics = getMetricData();
    
    return Object.keys(metrics).map(key => ({
      metric: key.charAt(0).toUpperCase() + key.slice(1),
      improvement: metrics[key].improvement || 0
    }));
  };

  const formatNumber = (num, decimals = 1) => {
    if (num === undefined || num === null) return 'N/A';
    return typeof num === 'number' ? num.toFixed(decimals) : num;
  };

  if (loading) {
    return (
      <div className="control-comparison">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="control-comparison">
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={fetchComparisonData} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="control-comparison">
        <div className="empty-state">
          <p>No comparison data available. Train the agent first.</p>
        </div>
      </div>
    );
  }

  const metrics = getMetricData();
  const selectedMetricData = metrics[selectedMetric];

  return (
    <div className="control-comparison">
      <div className="comparison-header">
        <div>
          <h2>Control Strategy Comparison</h2>
          <p className="subtitle">
            Comparing {comparisonData.algorithm.toUpperCase()} 
            {comparisonData.isMultiAgent ? ' (Multi-Agent)' : ''} vs Fixed Timing
          </p>
        </div>
        <div className="view-toggle">
          <button
            className={viewMode === 'summary' ? 'active' : ''}
            onClick={() => setViewMode('summary')}
          >
            Summary
          </button>
          <button
            className={viewMode === 'detailed' ? 'active' : ''}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* Performance Improvements Overview */}
      <div className="improvements-overview">
        <h3>Performance Improvements</h3>
        <div className="improvements-grid">
          {Object.keys(metrics).map(key => {
            const metric = metrics[key];
            const improvement = metric.improvement || 0;
            const isPositive = key === 'throughput' ? improvement > 0 : improvement > 0;
            
            return (
              <div key={key} className="improvement-card">
                <div className="improvement-label">{metric.label.split('(')[0].trim()}</div>
                <div className={`improvement-value ${isPositive ? 'positive' : 'neutral'}`}>
                  {improvement > 0 ? '+' : ''}{formatNumber(improvement)}%
                </div>
                <div className="improvement-comparison">
                  <span className="baseline">{formatNumber(metric.baseline)}</span>
                  <span className="arrow">→</span>
                  <span className="adaptive">{formatNumber(metric.adaptive)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {viewMode === 'summary' && (
        <>
          {/* Side-by-Side Comparison Chart */}
          <div className="chart-container">
            <h3>Performance Metrics Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="metric" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
                <Bar dataKey="Fixed Timing" fill="#6b7280" />
                <Bar dataKey="Adaptive Control" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Improvement Percentages Chart */}
          <div className="chart-container">
            <h3>Improvement Percentages</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getImprovementData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="metric" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" label={{ value: 'Improvement (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value) => `${value.toFixed(1)}%`}
                />
                <Bar dataKey="improvement" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {viewMode === 'detailed' && (
        <>
          {/* Metric Selector */}
          <div className="metric-selector">
            <label>Select Metric:</label>
            <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
              <option value="delay">Average Delay</option>
              <option value="queue">Queue Length</option>
              <option value="throughput">Throughput</option>
              <option value="fuel">Fuel Consumption</option>
              <option value="emissions">CO2 Emissions</option>
            </select>
          </div>

          {/* Detailed Metric Comparison */}
          <div className="detailed-comparison">
            <h3>{selectedMetricData.label}</h3>
            
            <div className="comparison-cards">
              <div className="strategy-card baseline-card">
                <div className="strategy-header">
                  <h4>Fixed Timing Control</h4>
                  <span className="strategy-badge baseline">Baseline</span>
                </div>
                <div className="strategy-value">{formatNumber(selectedMetricData.baseline)}</div>
                <div className="strategy-description">
                  <p>Traditional fixed-cycle traffic signals with predetermined timing plans.</p>
                  <ul>
                    <li>60-second fixed cycle</li>
                    <li>No adaptation to traffic conditions</li>
                    <li>Simple implementation</li>
                  </ul>
                </div>
              </div>

              <div className="comparison-arrow">
                <div className="arrow-icon">→</div>
                <div className="improvement-badge">
                  {selectedMetricData.improvement > 0 ? '+' : ''}
                  {formatNumber(selectedMetricData.improvement)}% improvement
                </div>
              </div>

              <div className="strategy-card adaptive-card">
                <div className="strategy-header">
                  <h4>{comparisonData.algorithm.toUpperCase()} Adaptive Control</h4>
                  <span className="strategy-badge adaptive">AI-Powered</span>
                </div>
                <div className="strategy-value">{formatNumber(selectedMetricData.adaptive)}</div>
                <div className="strategy-description">
                  <p>Reinforcement learning-based adaptive signal control.</p>
                  <ul>
                    <li>Real-time traffic state observation</li>
                    <li>Dynamic signal timing optimization</li>
                    <li>Learns optimal policies from experience</li>
                    {comparisonData.isMultiAgent && <li>Multi-intersection coordination</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Signal Timing Visualization */}
          <div className="timing-visualization">
            <h3>Signal Timing Differences</h3>
            <div className="timing-comparison">
              <div className="timing-strategy">
                <h4>Fixed Timing</h4>
                <div className="timing-diagram">
                  <div className="phase-bar fixed">
                    <div className="phase green" style={{ width: '50%' }}>
                      <span>Green: 30s</span>
                    </div>
                    <div className="phase yellow" style={{ width: '8.33%' }}>
                      <span>Y: 5s</span>
                    </div>
                    <div className="phase red" style={{ width: '41.67%' }}>
                      <span>Red: 25s</span>
                    </div>
                  </div>
                  <div className="timing-label">Cycle: 60s (constant)</div>
                </div>
              </div>

              <div className="timing-strategy">
                <h4>Adaptive Control</h4>
                <div className="timing-diagram">
                  <div className="phase-bar adaptive">
                    <div className="phase green" style={{ width: '60%' }}>
                      <span>Green: 20-45s</span>
                    </div>
                    <div className="phase yellow" style={{ width: '8.33%' }}>
                      <span>Y: 5s</span>
                    </div>
                    <div className="phase red" style={{ width: '31.67%' }}>
                      <span>Red: 10-30s</span>
                    </div>
                  </div>
                  <div className="timing-label">Cycle: 35-80s (adaptive)</div>
                </div>
              </div>
            </div>
            <p className="timing-note">
              * Adaptive control adjusts signal timing based on real-time traffic conditions,
              extending green phases when demand is high and reducing wait times.
            </p>
          </div>
        </>
      )}

      {/* Key Insights */}
      <div className="insights-section">
        <h3>Key Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">📊</div>
            <div className="insight-content">
              <h4>Overall Performance</h4>
              <p>
                The {comparisonData.algorithm.toUpperCase()} agent achieves an average improvement
                of {formatNumber(
                  Object.values(comparisonData.improvements).reduce((a, b) => a + (b || 0), 0) / 
                  Object.values(comparisonData.improvements).filter(v => v !== undefined).length
                )}% across all metrics compared to fixed timing control.
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">🚦</div>
            <div className="insight-content">
              <h4>Traffic Flow</h4>
              <p>
                Adaptive control reduces average vehicle delay by {formatNumber(comparisonData.improvements.delayReduction || 0)}%
                and increases throughput by {formatNumber(comparisonData.improvements.throughputIncrease || 0)}%,
                significantly improving traffic flow efficiency.
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">🌱</div>
            <div className="insight-content">
              <h4>Environmental Impact</h4>
              <p>
                By reducing idle time and stop-and-go traffic, the adaptive system
                decreases fuel consumption by {formatNumber(comparisonData.improvements.fuelSavings || 0)}%
                and CO2 emissions by {formatNumber(comparisonData.improvements.emissionsReduction || 0)}%.
              </p>
            </div>
          </div>

          {comparisonData.isMultiAgent && (
            <div className="insight-card">
              <div className="insight-icon">🔗</div>
              <div className="insight-content">
                <h4>Multi-Agent Coordination</h4>
                <p>
                  The multi-agent system coordinates signal timing across multiple intersections,
                  creating green waves and reducing network-wide congestion beyond what single-agent
                  control can achieve.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlComparison;
