import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './ModelManagementPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ModelManagementPage = () => {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterDeployed, setFilterDeployed] = useState('all');
  const [selectedModel, setSelectedModel] = useState(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [storageStats, setStorageStats] = useState(null);

  useEffect(() => {
    fetchModels();
    if (user?.role === 'admin') {
      fetchStorageStats();
    }
  }, [filterType, filterDeployed]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterDeployed !== 'all') params.isDeployed = filterDeployed === 'deployed';

      const response = await axios.get(`${API_URL}/api/ml/models`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setModels(response.data.data.models);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ml/models/storage/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStorageStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch storage stats:', err);
    }
  };

  const fetchModelVersions = async (modelName, modelType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/ml/models/versions/${modelName}/${modelType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVersions(response.data.data.versions);
      setShowVersions(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch versions');
    }
  };

  const compareVersions = async (modelName, modelType, metric = 'rmse') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/ml/models/compare/${modelName}/${modelType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { metric }
        }
      );
      setComparisonData(response.data.data);
      setShowComparison(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to compare versions');
    }
  };

  const deployModel = async (modelId) => {
    if (!window.confirm('Are you sure you want to deploy this model? This will undeploy other versions.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/ml/models/${modelId}/deploy`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchModels();
      alert('Model deployed successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to deploy model');
    }
  };

  const undeployModel = async (modelId) => {
    if (!window.confirm('Are you sure you want to undeploy this model?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/ml/models/${modelId}/undeploy`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchModels();
      alert('Model undeployed successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to undeploy model');
    }
  };

  const deleteModel = async (modelId) => {
    if (!window.confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/ml/models/${modelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchModels();
      alert('Model deleted successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete model');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getModelTypeLabel = (type) => {
    const labels = {
      lstm: 'LSTM',
      random_forest: 'Random Forest',
      dqn: 'DQN',
      ppo: 'PPO',
      marl: 'MARL'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="model-management-page">
        <div className="loading">Loading models...</div>
      </div>
    );
  }

  return (
    <div className="model-management-page">
      <div className="page-header">
        <h1>Model Management</h1>
        <p>Manage trained ML models and their versions</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Storage Stats (Admin Only) */}
      {user?.role === 'admin' && storageStats && (
        <div className="storage-stats">
          <h3>Storage Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{storageStats.database.totalModels}</div>
              <div className="stat-label">Total Models</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{storageStats.database.deployedModels}</div>
              <div className="stat-label">Deployed Models</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {storageStats.pythonService?.total_storage_mb || 0} MB
              </div>
              <div className="stat-label">Storage Used</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Model Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="lstm">LSTM</option>
            <option value="random_forest">Random Forest</option>
            <option value="dqn">DQN</option>
            <option value="ppo">PPO</option>
            <option value="marl">MARL</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Deployment Status:</label>
          <select value={filterDeployed} onChange={(e) => setFilterDeployed(e.target.value)}>
            <option value="all">All Models</option>
            <option value="deployed">Deployed Only</option>
            <option value="undeployed">Undeployed Only</option>
          </select>
        </div>

        <button className="btn-refresh" onClick={fetchModels}>
          Refresh
        </button>
      </div>

      {/* Models List */}
      <div className="models-list">
        {models.length === 0 ? (
          <div className="no-models">
            <p>No models found matching the selected filters.</p>
          </div>
        ) : (
          <div className="models-grid">
            {models.map((model) => (
              <div key={model._id} className={`model-card ${model.isDeployed ? 'deployed' : ''}`}>
                <div className="model-header">
                  <h3>{model.name}</h3>
                  {model.isDeployed && <span className="deployed-badge">Deployed</span>}
                </div>

                <div className="model-info">
                  <div className="info-row">
                    <span className="label">Type:</span>
                    <span className="value">{getModelTypeLabel(model.type)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Version:</span>
                    <span className="value">{model.version}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(model.createdAt)}</span>
                  </div>
                  {model.trainedBy && (
                    <div className="info-row">
                      <span className="label">Trained By:</span>
                      <span className="value">
                        {model.trainedBy.firstName} {model.trainedBy.lastName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Performance Metrics */}
                <div className="performance-metrics">
                  <h4>Performance</h4>
                  {model.performance.rmse && (
                    <div className="metric">
                      <span>RMSE:</span>
                      <span>{model.performance.rmse.toFixed(4)}</span>
                    </div>
                  )}
                  {model.performance.mae && (
                    <div className="metric">
                      <span>MAE:</span>
                      <span>{model.performance.mae.toFixed(4)}</span>
                    </div>
                  )}
                  {model.performance.r2Score && (
                    <div className="metric">
                      <span>R² Score:</span>
                      <span>{model.performance.r2Score.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="model-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedModel(model);
                      fetchModelVersions(model.name, model.type);
                    }}
                  >
                    View Versions
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => compareVersions(model.name, model.type)}
                  >
                    Compare
                  </button>
                  {model.isDeployed ? (
                    <button
                      className="btn-warning"
                      onClick={() => undeployModel(model._id)}
                    >
                      Undeploy
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => deployModel(model._id)}
                    >
                      Deploy
                    </button>
                  )}
                  {!model.isDeployed && (
                    <button
                      className="btn-danger"
                      onClick={() => deleteModel(model._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Versions Modal */}
      {showVersions && (
        <div className="modal-overlay" onClick={() => setShowVersions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Model Versions: {selectedModel?.name}</h2>
              <button className="close-btn" onClick={() => setShowVersions(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="versions-list">
                {versions.map((version) => (
                  <div key={version.model_id} className="version-item">
                    <div className="version-header">
                      <span className="version-number">{version.version}</span>
                      {version.is_deployed && <span className="deployed-badge">Deployed</span>}
                    </div>
                    <div className="version-info">
                      <div>Created: {formatDate(version.created_at)}</div>
                      {version.performance && (
                        <div className="version-metrics">
                          {version.performance.rmse && <span>RMSE: {version.performance.rmse.toFixed(4)}</span>}
                          {version.performance.mae && <span>MAE: {version.performance.mae.toFixed(4)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && comparisonData && (
        <div className="modal-overlay" onClick={() => setShowComparison(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Version Comparison: {comparisonData.modelName}</h2>
              <button className="close-btn" onClick={() => setShowComparison(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comparison-info">
                <p>Comparing by: <strong>{comparisonData.metric.toUpperCase()}</strong></p>
                {comparisonData.bestVersion && (
                  <p>Best Version: <strong>{comparisonData.bestVersion.version}</strong></p>
                )}
              </div>
              <div className="comparison-table">
                <table>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>RMSE</th>
                      <th>MAE</th>
                      <th>R² Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.comparison.map((item, index) => (
                      <tr key={item.modelId} className={index === 0 ? 'best-version' : ''}>
                        <td>{item.version}</td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>{item.isDeployed ? '✓ Deployed' : 'Not Deployed'}</td>
                        <td>{item.performance?.rmse?.toFixed(4) || 'N/A'}</td>
                        <td>{item.performance?.mae?.toFixed(4) || 'N/A'}</td>
                        <td>{item.performance?.r2Score?.toFixed(4) || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManagementPage;
