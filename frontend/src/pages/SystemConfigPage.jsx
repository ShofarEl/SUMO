import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SystemConfigPage.css';

const SystemConfigPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingConfig, setEditingConfig] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConfig, setNewConfig] = useState({
    key: '',
    value: '',
    category: 'system',
    description: '',
    dataType: 'string',
    isEditable: true
  });

  useEffect(() => {
    fetchConfigs();
  }, [categoryFilter]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await axios.get(`/config?${params.toString()}`);
      setConfigs(response.data.data.configs);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleInitializeDefaults = async () => {
    if (!window.confirm('Initialize default configurations? This will not overwrite existing configs.')) {
      return;
    }

    try {
      await axios.post('/config/initialize');
      fetchConfigs();
      alert('Default configurations initialized successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to initialize defaults');
    }
  };

  const handleEditConfig = (config) => {
    setEditingConfig({
      ...config,
      value: typeof config.value === 'object' ? JSON.stringify(config.value, null, 2) : config.value
    });
    setShowEditModal(true);
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    try {
      let parsedValue = editingConfig.value;
      
      // Parse value based on dataType
      if (editingConfig.dataType === 'number') {
        parsedValue = parseFloat(editingConfig.value);
      } else if (editingConfig.dataType === 'boolean') {
        parsedValue = editingConfig.value === 'true' || editingConfig.value === true;
      } else if (editingConfig.dataType === 'object' || editingConfig.dataType === 'array') {
        parsedValue = JSON.parse(editingConfig.value);
      }

      await axios.put(`/config/${editingConfig.key}`, {
        value: parsedValue,
        category: editingConfig.category,
        description: editingConfig.description,
        dataType: editingConfig.dataType,
        isEditable: editingConfig.isEditable
      });
      
      setShowEditModal(false);
      fetchConfigs();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update configuration');
    }
  };

  const handleAddConfig = async (e) => {
    e.preventDefault();
    try {
      let parsedValue = newConfig.value;
      
      // Parse value based on dataType
      if (newConfig.dataType === 'number') {
        parsedValue = parseFloat(newConfig.value);
      } else if (newConfig.dataType === 'boolean') {
        parsedValue = newConfig.value === 'true';
      } else if (newConfig.dataType === 'object' || newConfig.dataType === 'array') {
        parsedValue = JSON.parse(newConfig.value);
      }

      await axios.put(`/config/${newConfig.key}`, {
        value: parsedValue,
        category: newConfig.category,
        description: newConfig.description,
        dataType: newConfig.dataType,
        isEditable: newConfig.isEditable
      });
      
      setShowAddModal(false);
      setNewConfig({
        key: '',
        value: '',
        category: 'system',
        description: '',
        dataType: 'string',
        isEditable: true
      });
      fetchConfigs();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add configuration');
    }
  };

  const handleDeleteConfig = async (key) => {
    if (!window.confirm(`Are you sure you want to delete configuration "${key}"?`)) {
      return;
    }

    try {
      await axios.delete(`/config/${key}`);
      fetchConfigs();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete configuration');
    }
  };

  const formatValue = (value, dataType) => {
    if (dataType === 'object' || dataType === 'array') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {});

  return (
    <div className="system-config-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Georgetown Traffic AI - System Configuration</h1>
          <div className="user-menu">
            <div className="user-info">
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Dashboard
            </button>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="system-config-main">
        <div className="controls-section">
          <div className="filter-box">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              <option value="simulation">Simulation</option>
              <option value="api">API</option>
              <option value="ml">Machine Learning</option>
              <option value="rl">Reinforcement Learning</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="action-buttons">
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              Add Configuration
            </button>
            <button onClick={handleInitializeDefaults} className="btn-secondary">
              Initialize Defaults
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">Loading configurations...</div>
        ) : (
          <div className="configs-container">
            {Object.keys(groupedConfigs).length === 0 ? (
              <div className="empty-state">
                <p>No configurations found. Click "Initialize Defaults" to create default settings.</p>
              </div>
            ) : (
              Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
                <div key={category} className="config-category">
                  <h2 className="category-title">{category.toUpperCase()}</h2>
                  <div className="configs-grid">
                    {categoryConfigs.map((config) => (
                      <div key={config._id} className="config-card">
                        <div className="config-header">
                          <h3 className="config-key">{config.key}</h3>
                          <span className={`config-type ${config.dataType}`}>
                            {config.dataType}
                          </span>
                        </div>
                        <p className="config-description">{config.description || 'No description'}</p>
                        <div className="config-value">
                          <strong>Value:</strong>
                          <pre>{formatValue(config.value, config.dataType)}</pre>
                        </div>
                        {config.updatedBy && (
                          <div className="config-meta">
                            <small>
                              Updated by {config.updatedBy.firstName} {config.updatedBy.lastName}
                              {' on '}{new Date(config.updatedAt).toLocaleString()}
                            </small>
                          </div>
                        )}
                        <div className="config-actions">
                          <button
                            onClick={() => handleEditConfig(config)}
                            className="btn-action edit"
                            disabled={!config.isEditable}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(config.key)}
                            className="btn-action delete"
                            disabled={!config.isEditable}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && editingConfig && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Configuration</h2>
            <form onSubmit={handleUpdateConfig}>
              <div className="form-group">
                <label>Key</label>
                <input
                  type="text"
                  value={editingConfig.key}
                  disabled
                  className="disabled"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={editingConfig.category}
                  onChange={(e) => setEditingConfig({ ...editingConfig, category: e.target.value })}
                  required
                >
                  <option value="simulation">Simulation</option>
                  <option value="api">API</option>
                  <option value="ml">Machine Learning</option>
                  <option value="rl">Reinforcement Learning</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="form-group">
                <label>Data Type</label>
                <select
                  value={editingConfig.dataType}
                  onChange={(e) => setEditingConfig({ ...editingConfig, dataType: e.target.value })}
                  required
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>
              </div>
              <div className="form-group">
                <label>Value</label>
                {editingConfig.dataType === 'boolean' ? (
                  <select
                    value={editingConfig.value}
                    onChange={(e) => setEditingConfig({ ...editingConfig, value: e.target.value })}
                    required
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : editingConfig.dataType === 'object' || editingConfig.dataType === 'array' ? (
                  <textarea
                    value={editingConfig.value}
                    onChange={(e) => setEditingConfig({ ...editingConfig, value: e.target.value })}
                    rows="6"
                    required
                  />
                ) : (
                  <input
                    type={editingConfig.dataType === 'number' ? 'number' : 'text'}
                    value={editingConfig.value}
                    onChange={(e) => setEditingConfig({ ...editingConfig, value: e.target.value })}
                    required
                  />
                )}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingConfig.description}
                  onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                  rows="2"
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={editingConfig.isEditable}
                    onChange={(e) => setEditingConfig({ ...editingConfig, isEditable: e.target.checked })}
                  />
                  Editable
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Add Configuration</h2>
            <form onSubmit={handleAddConfig}>
              <div className="form-group">
                <label>Key</label>
                <input
                  type="text"
                  value={newConfig.key}
                  onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                  placeholder="e.g., simulation.max_duration"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newConfig.category}
                  onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                  required
                >
                  <option value="simulation">Simulation</option>
                  <option value="api">API</option>
                  <option value="ml">Machine Learning</option>
                  <option value="rl">Reinforcement Learning</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="form-group">
                <label>Data Type</label>
                <select
                  value={newConfig.dataType}
                  onChange={(e) => setNewConfig({ ...newConfig, dataType: e.target.value })}
                  required
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>
              </div>
              <div className="form-group">
                <label>Value</label>
                {newConfig.dataType === 'boolean' ? (
                  <select
                    value={newConfig.value}
                    onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : newConfig.dataType === 'object' || newConfig.dataType === 'array' ? (
                  <textarea
                    value={newConfig.value}
                    onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                    placeholder='{"key": "value"} or ["item1", "item2"]'
                    rows="6"
                    required
                  />
                ) : (
                  <input
                    type={newConfig.dataType === 'number' ? 'number' : 'text'}
                    value={newConfig.value}
                    onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                    required
                  />
                )}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newConfig.description}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  rows="2"
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={newConfig.isEditable}
                    onChange={(e) => setNewConfig({ ...newConfig, isEditable: e.target.checked })}
                  />
                  Editable
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemConfigPage;
