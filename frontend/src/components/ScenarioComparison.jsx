import { useState, useEffect } from 'react';
import axios from 'axios';
import './ScenarioComparison.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ScenarioComparison = () => {
  const [simulations, setSimulations] = useState([]);
  const [selectedSimulations, setSelectedSimulations] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingSimulations, setLoadingSimulations] = useState(true);

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    try {
      setLoadingSimulations(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/simulations?status=completed&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSimulations(response.data.data.simulations || []);
      }
    } catch (err) {
      console.error('Error fetching simulations:', err);
    } finally {
      setLoadingSimulations(false);
    }
  };

  const handleSimulationToggle = (simId) => {
    setSelectedSimulations(prev => {
      if (prev.includes(simId)) {
        return prev.filter(id => id !== simId);
      } else {
        if (prev.length >= 6) {
          setError('Maximum 6 scenarios can be compared at once');
          return prev;
        }
        return [...prev, simId];
      }
    });
    setError(null);
  };

  const handleCompare = async () => {
    if (selectedSimulations.length < 2) {
      setError('Please select at least 2 scenarios to compare');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/analytics/compare`,
        { simulationIds: selectedSimulations },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setComparisonData(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to compare scenarios');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format = 'csv') => {
    if (!comparisonData) return;

    try {
      const token = localStorage.getItem('token');
      const simulationIds = comparisonData.scenarios.map(s => s.id).join(',');
      
      const response = await axios.get(
        `${API_URL}/analytics/export?format=${format}&simulationIds=${simulationIds}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scenario-comparison.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export comparison data');
    }
  };

  const calculateSignificance = (metric1, metric2) => {
    const diff = Math.abs(metric1 - metric2);
    const avg = (metric1 + metric2) / 2;
    const percentDiff = (diff / avg) * 100;
    
    if (percentDiff > 10) return 'high';
    if (percentDiff > 5) return 'medium';
    return 'low';
  };

  const getMetricColor = (value, baseline, lowerIsBetter = true) => {
    const diff = ((value - baseline) / baseline) * 100;
    if (lowerIsBetter) {
      if (diff < -10) return 'metric-excellent';
      if (diff < 0) return 'metric-good';
      if (diff < 10) return 'metric-neutral';
      return 'metric-poor';
    } else {
      if (diff > 10) return 'metric-excellent';
      if (diff > 0) return 'metric-good';
      if (diff > -10) return 'metric-neutral';
      return 'metric-poor';
    }
  };

  return (
    <div className="scenario-comparison">
      <div className="comparison-header">
        <h2>Scenario Comparison</h2>
        <p>Compare multiple simulation scenarios to identify optimal traffic management strategies</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="selection-section">
        <h3>Select Scenarios to Compare</h3>
        <div className="simulation-list">
          {loadingSimulations ? (
            <div className="loading">Loading simulations...</div>
          ) : simulations.length === 0 ? (
            <div className="no-data">No completed simulations available</div>
          ) : (
            simulations.map(sim => (
              <div 
                key={sim._id} 
                className={`simulation-item ${selectedSimulations.includes(sim._id) ? 'selected' : ''}`}
                onClick={() => handleSimulationToggle(sim._id)}
              >
                <input 
                  type="checkbox" 
                  checked={selectedSimulations.includes(sim._id)}
                  onChange={() => {}}
                />
                <div className="sim-info">
                  <div className="sim-name">{sim.name}</div>
                  <div className="sim-details">
                    <span className="sim-strategy">{sim.config?.controlStrategy || 'N/A'}</span>
                    <span className="sim-demand">{sim.config?.trafficDemand || 'N/A'}</span>
                    <span className="sim-date">{new Date(sim.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="selection-actions">
          <button 
            className="btn-compare" 
            onClick={handleCompare}
            disabled={selectedSimulations.length < 2 || loading}
          >
            {loading ? 'Comparing...' : `Compare ${selectedSimulations.length} Scenarios`}
          </button>
        </div>
      </div>

      {comparisonData && (
        <div className="comparison-results">
          <div className="results-header">
            <h3>Comparison Results</h3>
            <div className="export-buttons">
              <button className="btn-export" onClick={() => handleExport('csv')}>
                Export CSV
              </button>
              <button className="btn-export" onClick={() => handleExport('json')}>
                Export JSON
              </button>
            </div>
          </div>

          <div className="scenario-config-table">
            <h4>Scenario Configurations</h4>
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Control Strategy</th>
                  <th>Traffic Demand</th>
                  <th>Time of Day</th>
                  <th>Weather</th>
                  <th>Vehicle Mix</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.scenarios.map(scenario => (
                  <tr key={scenario.id}>
                    <td className="scenario-name">{scenario.name}</td>
                    <td>
                      <span className={`strategy-badge strategy-${scenario.config.controlStrategy}`}>
                        {scenario.config.controlStrategy}
                      </span>
                    </td>
                    <td>{scenario.config.trafficDemand}</td>
                    <td>{scenario.config.timeOfDay}</td>
                    <td>{scenario.config.weather}</td>
                    <td className="vehicle-mix">
                      C:{scenario.config.vehicleMix.cars}% 
                      M:{scenario.config.vehicleMix.motorcycles}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="metrics-comparison">
            <h4>Performance Metrics Comparison</h4>
            
            <div className="metric-section">
              <h5>Average Delay per Vehicle (seconds)</h5>
              <div className="metric-bars">
                {comparisonData.scenarios.map((scenario, idx) => {
                  const baseline = comparisonData.scenarios[0].results.avgDelay;
                  const improvement = ((baseline - scenario.results.avgDelay) / baseline * 100).toFixed(1);
                  return (
                    <div key={scenario.id} className="metric-bar-item">
                      <div className="metric-label">
                        <span>{scenario.name}</span>
                        <span className={`metric-value ${getMetricColor(scenario.results.avgDelay, baseline, true)}`}>
                          {scenario.results.avgDelay.toFixed(2)}s
                          {idx > 0 && (
                            <span className="improvement">
                              ({improvement > 0 ? '-' : '+'}{Math.abs(improvement)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="metric-bar-container">
                        <div 
                          className={`metric-bar ${getMetricColor(scenario.results.avgDelay, baseline, true)}`}
                          style={{ width: `${(scenario.results.avgDelay / Math.max(...comparisonData.scenarios.map(s => s.results.avgDelay))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="metric-section">
              <h5>Average Queue Length (meters)</h5>
              <div className="metric-bars">
                {comparisonData.scenarios.map((scenario, idx) => {
                  const baseline = comparisonData.scenarios[0].results.avgQueueLength;
                  const improvement = ((baseline - scenario.results.avgQueueLength) / baseline * 100).toFixed(1);
                  return (
                    <div key={scenario.id} className="metric-bar-item">
                      <div className="metric-label">
                        <span>{scenario.name}</span>
                        <span className={`metric-value ${getMetricColor(scenario.results.avgQueueLength, baseline, true)}`}>
                          {scenario.results.avgQueueLength.toFixed(2)}m
                          {idx > 0 && (
                            <span className="improvement">
                              ({improvement > 0 ? '-' : '+'}{Math.abs(improvement)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="metric-bar-container">
                        <div 
                          className={`metric-bar ${getMetricColor(scenario.results.avgQueueLength, baseline, true)}`}
                          style={{ width: `${(scenario.results.avgQueueLength / Math.max(...comparisonData.scenarios.map(s => s.results.avgQueueLength))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="metric-section">
              <h5>Throughput (vehicles/hour)</h5>
              <div className="metric-bars">
                {comparisonData.scenarios.map((scenario, idx) => {
                  const baseline = comparisonData.scenarios[0].results.throughput;
                  const improvement = ((scenario.results.throughput - baseline) / baseline * 100).toFixed(1);
                  return (
                    <div key={scenario.id} className="metric-bar-item">
                      <div className="metric-label">
                        <span>{scenario.name}</span>
                        <span className={`metric-value ${getMetricColor(scenario.results.throughput, baseline, false)}`}>
                          {scenario.results.throughput.toFixed(0)} veh/h
                          {idx > 0 && (
                            <span className="improvement">
                              ({improvement > 0 ? '+' : ''}{improvement}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="metric-bar-container">
                        <div 
                          className={`metric-bar ${getMetricColor(scenario.results.throughput, baseline, false)}`}
                          style={{ width: `${(scenario.results.throughput / Math.max(...comparisonData.scenarios.map(s => s.results.throughput))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="metric-section">
              <h5>CO2 Emissions (kg)</h5>
              <div className="metric-bars">
                {comparisonData.scenarios.map((scenario, idx) => {
                  const baseline = comparisonData.scenarios[0].results.co2Emissions;
                  const improvement = ((baseline - scenario.results.co2Emissions) / baseline * 100).toFixed(1);
                  return (
                    <div key={scenario.id} className="metric-bar-item">
                      <div className="metric-label">
                        <span>{scenario.name}</span>
                        <span className={`metric-value ${getMetricColor(scenario.results.co2Emissions, baseline, true)}`}>
                          {scenario.results.co2Emissions.toFixed(2)} kg
                          {idx > 0 && (
                            <span className="improvement">
                              ({improvement > 0 ? '-' : '+'}{Math.abs(improvement)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="metric-bar-container">
                        <div 
                          className={`metric-bar ${getMetricColor(scenario.results.co2Emissions, baseline, true)}`}
                          style={{ width: `${(scenario.results.co2Emissions / Math.max(...comparisonData.scenarios.map(s => s.results.co2Emissions))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="statistical-significance">
            <h4>Statistical Significance Analysis</h4>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  {comparisonData.scenarios.slice(1).map(scenario => (
                    <th key={scenario.id}>vs {scenario.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Avg Delay</td>
                  {comparisonData.scenarios.slice(1).map(scenario => {
                    const sig = calculateSignificance(
                      comparisonData.scenarios[0].results.avgDelay,
                      scenario.results.avgDelay
                    );
                    return (
                      <td key={scenario.id}>
                        <span className={`significance-badge sig-${sig}`}>
                          {sig}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td>Queue Length</td>
                  {comparisonData.scenarios.slice(1).map(scenario => {
                    const sig = calculateSignificance(
                      comparisonData.scenarios[0].results.avgQueueLength,
                      scenario.results.avgQueueLength
                    );
                    return (
                      <td key={scenario.id}>
                        <span className={`significance-badge sig-${sig}`}>
                          {sig}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td>Throughput</td>
                  {comparisonData.scenarios.slice(1).map(scenario => {
                    const sig = calculateSignificance(
                      comparisonData.scenarios[0].results.throughput,
                      scenario.results.throughput
                    );
                    return (
                      <td key={scenario.id}>
                        <span className={`significance-badge sig-${sig}`}>
                          {sig}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="best-strategy">
            <h4>Recommended Strategy</h4>
            <div className="recommendation-card">
              {comparisonData.bestStrategy && (
                <>
                  <div className="recommendation-header">
                    <span className="trophy-icon">🏆</span>
                    <h5>{comparisonData.bestStrategy.name}</h5>
                  </div>
                  <div className="recommendation-details">
                    <p><strong>Control Strategy:</strong> {comparisonData.bestStrategy.config.controlStrategy}</p>
                    <p><strong>Best for:</strong> {comparisonData.bestStrategy.bestFor}</p>
                    <div className="recommendation-metrics">
                      <div className="rec-metric">
                        <span className="rec-label">Delay Reduction:</span>
                        <span className="rec-value">{comparisonData.bestStrategy.improvements.delayReduction}%</span>
                      </div>
                      <div className="rec-metric">
                        <span className="rec-label">Queue Reduction:</span>
                        <span className="rec-value">{comparisonData.bestStrategy.improvements.queueReduction}%</span>
                      </div>
                      <div className="rec-metric">
                        <span className="rec-label">Throughput Increase:</span>
                        <span className="rec-value">+{comparisonData.bestStrategy.improvements.throughputIncrease}%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioComparison;