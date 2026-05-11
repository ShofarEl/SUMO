import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './PredictionResults.css';

const PredictionResults = ({ results, modelType, onClose }) => {
  if (!results) {
    return null;
  }

  const {
    predictions,
    actual_values,
    confidence_intervals,
    metrics,
    baseline_predictions,
    processing_time
  } = results;

  // Prepare chart data
  const chartData = predictions.map((pred, index) => {
    const dataPoint = {
      timeStep: index + 1,
      predicted: pred,
      actual: actual_values?.[index] || null,
      baseline: baseline_predictions?.[index] || null
    };

    // Add confidence intervals if available
    if (confidence_intervals && confidence_intervals[index]) {
      dataPoint.lower = confidence_intervals[index].lower;
      dataPoint.upper = confidence_intervals[index].upper;
    }

    return dataPoint;
  });

  // Format metrics
  const formatMetric = (value, decimals = 4) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Calculate improvement over baseline
  const calculateImprovement = () => {
    if (!metrics?.baseline_rmse || !metrics?.rmse) return null;
    const improvement = ((metrics.baseline_rmse - metrics.rmse) / metrics.baseline_rmse) * 100;
    return improvement;
  };

  const improvement = calculateImprovement();

  return (
    <div className="prediction-results">
      <div className="results-header">
        <div>
          <h2>Prediction Results</h2>
          <p className="model-type">
            Model: <strong>{modelType === 'lstm' ? 'LSTM' : 'Random Forest'}</strong>
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-close" title="Close">
            ×
          </button>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="metrics-section">
        <h3>Performance Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">RMSE</div>
            <div className="metric-value">{formatMetric(metrics?.rmse)}</div>
            <div className="metric-target">
              Target: {modelType === 'lstm' ? '< 0.0263' : '< 0.0352'}
            </div>
            {metrics?.rmse && (
              <div className={`metric-status ${
                (modelType === 'lstm' && metrics.rmse < 0.0263) ||
                (modelType === 'rf' && metrics.rmse < 0.0352)
                  ? 'success'
                  : 'warning'
              }`}>
                {(modelType === 'lstm' && metrics.rmse < 0.0263) ||
                (modelType === 'rf' && metrics.rmse < 0.0352)
                  ? '✓ Target Met'
                  : '⚠ Above Target'}
              </div>
            )}
          </div>

          <div className="metric-card">
            <div className="metric-label">MAE</div>
            <div className="metric-value">{formatMetric(metrics?.mae)}</div>
            <div className="metric-target">
              Target: {modelType === 'lstm' ? '< 0.02' : '< 0.025'}
            </div>
            {metrics?.mae && (
              <div className={`metric-status ${
                (modelType === 'lstm' && metrics.mae < 0.02) ||
                (modelType === 'rf' && metrics.mae < 0.025)
                  ? 'success'
                  : 'warning'
              }`}>
                {(modelType === 'lstm' && metrics.mae < 0.02) ||
                (modelType === 'rf' && metrics.mae < 0.025)
                  ? '✓ Target Met'
                  : '⚠ Above Target'}
              </div>
            )}
          </div>

          {metrics?.r2_score !== undefined && (
            <div className="metric-card">
              <div className="metric-label">R² Score</div>
              <div className="metric-value">{formatMetric(metrics.r2_score, 3)}</div>
              <div className="metric-target">Higher is better</div>
            </div>
          )}

          <div className="metric-card">
            <div className="metric-label">Processing Time</div>
            <div className="metric-value">{formatTime(processing_time || 0)}</div>
            <div className="metric-target">Inference speed</div>
          </div>
        </div>

        {improvement !== null && (
          <div className="improvement-banner">
            <strong>Improvement over baseline:</strong>{' '}
            <span className={improvement > 0 ? 'positive' : 'negative'}>
              {improvement > 0 ? '+' : ''}{improvement.toFixed(2)}%
            </span>
            {improvement > 0 ? ' better' : ' worse'} RMSE
          </div>
        )}
      </div>

      {/* Prediction vs Actual Chart */}
      <div className="chart-section">
        <h3>Predicted vs Actual Queue Length</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="timeStep" 
                label={{ value: 'Time Step (minutes)', position: 'insideBottom', offset: -5 }}
                stroke="var(--text)"
              />
              <YAxis 
                label={{ value: 'Queue Length (meters)', angle: -90, position: 'insideLeft' }}
                stroke="var(--text)"
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg)', 
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#aa3bff" 
                strokeWidth={2}
                name="Predicted"
                dot={{ r: 4 }}
              />
              {actual_values && (
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Actual"
                  dot={{ r: 4 }}
                />
              )}
              {baseline_predictions && (
                <Line 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke="#94a3b8" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Baseline"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Confidence Intervals Chart (if available) */}
      {confidence_intervals && confidence_intervals.length > 0 && (
        <div className="chart-section">
          <h3>Prediction Confidence Intervals</h3>
          <p className="chart-description">
            Shaded area represents the 95% confidence interval for predictions
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="timeStep" 
                  label={{ value: 'Time Step (minutes)', position: 'insideBottom', offset: -5 }}
                  stroke="var(--text)"
                />
                <YAxis 
                  label={{ value: 'Queue Length (meters)', angle: -90, position: 'insideLeft' }}
                  stroke="var(--text)"
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="none" 
                  fill="#aa3bff" 
                  fillOpacity={0.2}
                  name="Upper Bound"
                />
                <Area 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="none" 
                  fill="#aa3bff" 
                  fillOpacity={0.2}
                  name="Lower Bound"
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#aa3bff" 
                  strokeWidth={2}
                  name="Predicted"
                  dot={{ r: 3 }}
                />
                {actual_values && (
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Actual"
                    dot={{ r: 3 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Prediction Details Table */}
      <div className="details-section">
        <h3>Prediction Details</h3>
        <div className="table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Time Step</th>
                <th>Predicted</th>
                {actual_values && <th>Actual</th>}
                {actual_values && <th>Error</th>}
                {confidence_intervals && <th>CI Lower</th>}
                {confidence_intervals && <th>CI Upper</th>}
              </tr>
            </thead>
            <tbody>
              {predictions.map((pred, index) => {
                const actual = actual_values?.[index];
                const error = actual !== null && actual !== undefined ? Math.abs(pred - actual) : null;
                const ci = confidence_intervals?.[index];

                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{pred.toFixed(2)}</td>
                    {actual_values && <td>{actual !== null ? actual.toFixed(2) : 'N/A'}</td>}
                    {actual_values && (
                      <td className={error && error > 5 ? 'high-error' : ''}>
                        {error !== null ? error.toFixed(2) : 'N/A'}
                      </td>
                    )}
                    {confidence_intervals && <td>{ci?.lower?.toFixed(2) || 'N/A'}</td>}
                    {confidence_intervals && <td>{ci?.upper?.toFixed(2) || 'N/A'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Information */}
      {metrics?.additional_info && (
        <div className="info-section">
          <h3>Additional Information</h3>
          <div className="info-grid">
            {Object.entries(metrics.additional_info).map(([key, value]) => (
              <div key={key} className="info-item">
                <span className="info-label">{key.replace(/_/g, ' ')}:</span>
                <span className="info-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionResults;
