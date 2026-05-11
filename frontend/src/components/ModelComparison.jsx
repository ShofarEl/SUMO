import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import './ModelComparison.css';

const ModelComparison = ({ comparisonData, onExport, onClose }) => {
  if (!comparisonData || !comparisonData.models || comparisonData.models.length === 0) {
    return (
      <div className="model-comparison">
        <div className="empty-state">
          <p>No comparison data available</p>
        </div>
      </div>
    );
  }

  const { models, summary } = comparisonData;

  // Prepare data for bar charts
  const metricsData = [
    {
      metric: 'RMSE',
      ...models.reduce((acc, model) => {
        acc[model.name] = model.metrics.rmse;
        return acc;
      }, {})
    },
    {
      metric: 'MAE',
      ...models.reduce((acc, model) => {
        acc[model.name] = model.metrics.mae;
        return acc;
      }, {})
    },
    {
      metric: 'R² Score',
      ...models.reduce((acc, model) => {
        acc[model.name] = model.metrics.r2_score || 0;
        return acc;
      }, {})
    }
  ];

  const performanceData = [
    {
      metric: 'Processing Time (ms)',
      ...models.reduce((acc, model) => {
        acc[model.name] = model.processing_time || 0;
        return acc;
      }, {})
    }
  ];

  // Prepare radar chart data (normalized metrics)
  const radarData = [
    {
      metric: 'Accuracy',
      ...models.reduce((acc, model) => {
        // Normalize: higher is better, inverse of RMSE
        acc[model.name] = Math.max(0, 100 - (model.metrics.rmse * 1000));
        return acc;
      }, {})
    },
    {
      metric: 'Precision',
      ...models.reduce((acc, model) => {
        // Normalize: higher is better, inverse of MAE
        acc[model.name] = Math.max(0, 100 - (model.metrics.mae * 1000));
        return acc;
      }, {})
    },
    {
      metric: 'Speed',
      ...models.reduce((acc, model) => {
        // Normalize: faster is better
        const maxTime = Math.max(...models.map(m => m.processing_time || 1));
        acc[model.name] = 100 - ((model.processing_time || 0) / maxTime * 100);
        return acc;
      }, {})
    },
    {
      metric: 'Reliability',
      ...models.reduce((acc, model) => {
        // Based on R² score
        acc[model.name] = (model.metrics.r2_score || 0) * 100;
        return acc;
      }, {})
    }
  ];

  // Colors for different models
  const colors = ['#aa3bff', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

  // Format functions
  const formatMetric = (value, decimals = 4) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Find best model for each metric
  const findBestModel = (metric) => {
    let best = models[0];
    models.forEach(model => {
      if (metric === 'processing_time') {
        if ((model[metric] || Infinity) < (best[metric] || Infinity)) {
          best = model;
        }
      } else if (metric === 'r2_score') {
        if ((model.metrics[metric] || 0) > (best.metrics[metric] || 0)) {
          best = model;
        }
      } else {
        // For RMSE and MAE, lower is better
        if ((model.metrics[metric] || Infinity) < (best.metrics[metric] || Infinity)) {
          best = model;
        }
      }
    });
    return best.name;
  };

  // Export functionality
  const handleExport = (format) => {
    if (onExport) {
      onExport(format, comparisonData);
    } else {
      // Default export as JSON
      const dataStr = JSON.stringify(comparisonData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `model_comparison_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Model', 'RMSE', 'MAE', 'R² Score', 'Processing Time (ms)'];
    const rows = models.map(model => [
      model.name,
      model.metrics.rmse,
      model.metrics.mae,
      model.metrics.r2_score || 'N/A',
      model.processing_time || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `model_comparison_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="model-comparison">
      <div className="comparison-header">
        <div>
          <h2>Model Comparison</h2>
          <p className="comparison-subtitle">
            Comparing {models.length} prediction model{models.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="header-actions">
          <button onClick={handleExportCSV} className="btn-export" title="Export as CSV">
            Export CSV
          </button>
          <button onClick={() => handleExport('json')} className="btn-export" title="Export as JSON">
            Export JSON
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-close" title="Close">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-section">
        <h3>Performance Summary</h3>
        <div className="summary-grid">
          {models.map((model, index) => (
            <div key={model.name} className="summary-card" style={{ borderTopColor: colors[index % colors.length] }}>
              <div className="summary-card-header">
                <h4>{model.name}</h4>
                <span className="model-type-badge" style={{ background: colors[index % colors.length] + '20', color: colors[index % colors.length] }}>
                  {model.type?.toUpperCase() || 'MODEL'}
                </span>
              </div>
              <div className="summary-metrics">
                <div className="summary-metric">
                  <span className="summary-label">RMSE</span>
                  <span className={`summary-value ${findBestModel('rmse') === model.name ? 'best' : ''}`}>
                    {formatMetric(model.metrics.rmse)}
                    {findBestModel('rmse') === model.name && <span className="best-badge">★</span>}
                  </span>
                </div>
                <div className="summary-metric">
                  <span className="summary-label">MAE</span>
                  <span className={`summary-value ${findBestModel('mae') === model.name ? 'best' : ''}`}>
                    {formatMetric(model.metrics.mae)}
                    {findBestModel('mae') === model.name && <span className="best-badge">★</span>}
                  </span>
                </div>
                <div className="summary-metric">
                  <span className="summary-label">Speed</span>
                  <span className={`summary-value ${findBestModel('processing_time') === model.name ? 'best' : ''}`}>
                    {formatTime(model.processing_time || 0)}
                    {findBestModel('processing_time') === model.name && <span className="best-badge">★</span>}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Comparison Charts */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>Accuracy Metrics Comparison</h3>
          <p className="chart-description">Lower values indicate better performance</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="metric" stroke="var(--text)" />
                <YAxis stroke="var(--text)" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                {models.map((model, index) => (
                  <Bar 
                    key={model.name}
                    dataKey={model.name} 
                    fill={colors[index % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Processing Time Comparison</h3>
          <p className="chart-description">Lower values indicate faster inference</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="metric" stroke="var(--text)" />
                <YAxis stroke="var(--text)" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                {models.map((model, index) => (
                  <Bar 
                    key={model.name}
                    dataKey={model.name} 
                    fill={colors[index % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="chart-card">
        <h3>Overall Performance Radar</h3>
        <p className="chart-description">Normalized metrics (0-100 scale, higher is better)</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" stroke="var(--text)" />
              <PolarRadiusAxis stroke="var(--text)" />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg)', 
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              {models.map((model, index) => (
                <Radar
                  key={model.name}
                  name={model.name}
                  dataKey={model.name}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.3}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="table-section">
        <h3>Detailed Metrics</h3>
        <div className="table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Type</th>
                <th>RMSE</th>
                <th>MAE</th>
                <th>R² Score</th>
                <th>Processing Time</th>
                <th>Target Met</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model, index) => {
                const rmseTarget = model.type === 'lstm' ? 0.0263 : 0.0352;
                const maeTarget = model.type === 'lstm' ? 0.02 : 0.025;
                const rmsePass = model.metrics.rmse < rmseTarget;
                const maePass = model.metrics.mae < maeTarget;

                return (
                  <tr key={model.name}>
                    <td>
                      <div className="model-name-cell">
                        <span className="model-indicator" style={{ background: colors[index % colors.length] }}></span>
                        <strong>{model.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="type-badge">{model.type?.toUpperCase() || 'N/A'}</span>
                    </td>
                    <td className={rmsePass ? 'metric-pass' : 'metric-fail'}>
                      {formatMetric(model.metrics.rmse)}
                      {findBestModel('rmse') === model.name && <span className="best-indicator">★</span>}
                    </td>
                    <td className={maePass ? 'metric-pass' : 'metric-fail'}>
                      {formatMetric(model.metrics.mae)}
                      {findBestModel('mae') === model.name && <span className="best-indicator">★</span>}
                    </td>
                    <td>
                      {formatMetric(model.metrics.r2_score, 3)}
                      {findBestModel('r2_score') === model.name && <span className="best-indicator">★</span>}
                    </td>
                    <td>
                      {formatTime(model.processing_time || 0)}
                      {findBestModel('processing_time') === model.name && <span className="best-indicator">★</span>}
                    </td>
                    <td>
                      {rmsePass && maePass ? (
                        <span className="status-badge success">✓ Yes</span>
                      ) : (
                        <span className="status-badge warning">⚠ Partial</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      {summary?.recommendation && (
        <div className="recommendation-section">
          <h3>Recommendation</h3>
          <div className="recommendation-card">
            <p>{summary.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelComparison;
