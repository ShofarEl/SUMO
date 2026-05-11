import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MARLCoordination from '../components/MARLCoordination';
import './MARLPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * MARL (Multi-Agent Reinforcement Learning) Page
 * 
 * Allows users to:
 * - Create MARL systems with multiple intersections
 * - Train coordinated agents
 * - Visualize coordination patterns
 * - Evaluate network-wide performance
 */
const MARLPage = () => {
  const [marlSystems, setMarlSystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [trainingData, setTrainingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state for creating new MARL system
  const [formData, setFormData] = useState({
    name: '',
    intersection_ids: ['intersection_1', 'intersection_2'],
    enable_communication: true,
    communication_radius: 500,
    shared_reward: true,
    reward_weights: { local: 0.7, global: 0.3 },
    learning_rate: 0.001,
    enable_experience_sharing: true
  });

  // Load MARL systems on mount
  useEffect(() => {
    loadMarlSystems();
  }, []);

  // Load training data when system is selected
  useEffect(() => {
    if (selectedSystem) {
      loadTrainingData(selectedSystem.marl_id);
    }
  }, [selectedSystem]);

  const loadMarlSystems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/rl/marl/systems`);
      setMarlSystems(response.data);
      setError(null);
    } catch (err) {
      console.error('Error loading MARL systems:', err);
      setError('Failed to load MARL systems');
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingData = async (marlId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/rl/marl/systems/${marlId}/agents`);
      setTrainingData(response.data);
    } catch (err) {
      console.error('Error loading training data:', err);
    }
  };

  const handleCreateSystem = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/rl/marl/create`, formData);
      
      // Reload systems list
      await loadMarlSystems();
      
      // Select the newly created system
      setSelectedSystem(response.data);
      
      // Reset form and close
      setShowCreateForm(false);
      setFormData({
        name: '',
        intersection_ids: ['intersection_1', 'intersection_2'],
        enable_communication: true,
        communication_radius: 500,
        shared_reward: true,
        reward_weights: { local: 0.7, global: 0.3 },
        learning_rate: 0.001,
        enable_experience_sharing: true
      });
      
      setError(null);
    } catch (err) {
      console.error('Error creating MARL system:', err);
      setError(err.response?.data?.detail || 'Failed to create MARL system');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedSystem) return;
    
    try {
      setLoading(true);
      
      const trainingRequest = {
        marl_id: selectedSystem.marl_id,
        network_file: 'data/georgetown_network.net.xml',
        route_file: 'data/georgetown_routes.rou.xml',
        num_episodes: 100,
        max_steps_per_episode: 3600,
        evaluation_frequency: 50,
        save_frequency: 10
      };
      
      const response = await axios.post(
        `${API_BASE_URL}/api/rl/marl/train`,
        trainingRequest
      );
      
      alert(`Training started! Job ID: ${response.data.job_id}`);
      setError(null);
    } catch (err) {
      console.error('Error starting training:', err);
      setError(err.response?.data?.detail || 'Failed to start training');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedSystem) return;
    
    try {
      setLoading(true);
      
      const evalRequest = {
        marl_id: selectedSystem.marl_id,
        network_file: 'data/georgetown_network.net.xml',
        route_file: 'data/georgetown_routes.rou.xml',
        num_episodes: 10
      };
      
      const response = await axios.post(
        `${API_BASE_URL}/api/rl/marl/evaluate`,
        evalRequest
      );
      
      // Update training data with evaluation results
      setTrainingData(prev => ({
        ...prev,
        evaluation: response.data
      }));
      
      setError(null);
    } catch (err) {
      console.error('Error evaluating system:', err);
      setError(err.response?.data?.detail || 'Failed to evaluate system');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntersection = () => {
    setFormData(prev => ({
      ...prev,
      intersection_ids: [...prev.intersection_ids, `intersection_${prev.intersection_ids.length + 1}`]
    }));
  };

  const handleRemoveIntersection = (index) => {
    setFormData(prev => ({
      ...prev,
      intersection_ids: prev.intersection_ids.filter((_, i) => i !== index)
    }));
  };

  const handleIntersectionChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      intersection_ids: prev.intersection_ids.map((id, i) => i === index ? value : id)
    }));
  };

  return (
    <div className="marl-page">
      <div className="page-header">
        <h1>Multi-Agent Reinforcement Learning</h1>
        <p>Coordinate multiple intersection agents for network-wide traffic optimization</p>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="marl-content">
        {/* Sidebar with system list */}
        <div className="marl-sidebar">
          <div className="sidebar-header">
            <h3>MARL Systems</h3>
            <button
              className="btn-create"
              onClick={() => setShowCreateForm(true)}
              disabled={loading}
            >
              + New System
            </button>
          </div>

          {loading && marlSystems.length === 0 ? (
            <div className="loading-state">Loading...</div>
          ) : marlSystems.length === 0 ? (
            <div className="empty-state">
              <p>No MARL systems yet</p>
              <p className="hint">Create one to get started</p>
            </div>
          ) : (
            <div className="systems-list">
              {marlSystems.map(system => (
                <div
                  key={system.marl_id}
                  className={`system-item ${selectedSystem?.marl_id === system.marl_id ? 'selected' : ''}`}
                  onClick={() => setSelectedSystem(system)}
                >
                  <div className="system-name">{system.name}</div>
                  <div className="system-info">
                    <span className="agent-count">{system.num_agents} agents</span>
                    {system.is_trained && <span className="trained-badge">Trained</span>}
                  </div>
                  <div className="system-intersections">
                    {system.intersection_ids.slice(0, 2).map(id => (
                      <span key={id} className="intersection-tag">
                        {id.substring(0, 10)}
                      </span>
                    ))}
                    {system.intersection_ids.length > 2 && (
                      <span className="more-tag">+{system.intersection_ids.length - 2}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="marl-main">
          {selectedSystem ? (
            <>
              <div className="system-controls">
                <div className="system-title">
                  <h2>{selectedSystem.name}</h2>
                  <span className="system-id">{selectedSystem.marl_id.substring(0, 8)}</span>
                </div>
                <div className="control-buttons">
                  <button
                    className="btn-primary"
                    onClick={handleStartTraining}
                    disabled={loading}
                  >
                    {loading ? 'Starting...' : 'Start Training'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleEvaluate}
                    disabled={loading || !selectedSystem.is_trained}
                  >
                    Evaluate
                  </button>
                </div>
              </div>

              {trainingData ? (
                <MARLCoordination
                  marlId={selectedSystem.marl_id}
                  trainingData={trainingData}
                  realTimeData={false}
                />
              ) : (
                <div className="no-data-state">
                  <p>No training data available yet</p>
                  <p className="hint">Start training to see coordination visualization</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection-state">
              <div className="placeholder-icon">🚦</div>
              <h3>Select a MARL System</h3>
              <p>Choose a system from the sidebar or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Create MARL System Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create MARL System</h2>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSystem} className="create-form">
              <div className="form-group">
                <label>System Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Georgetown Downtown Network"
                  required
                />
              </div>

              <div className="form-group">
                <label>Intersections</label>
                <div className="intersections-input">
                  {formData.intersection_ids.map((id, index) => (
                    <div key={index} className="intersection-input-row">
                      <input
                        type="text"
                        value={id}
                        onChange={(e) => handleIntersectionChange(index, e.target.value)}
                        placeholder={`Intersection ${index + 1}`}
                        required
                      />
                      {formData.intersection_ids.length > 2 && (
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => handleRemoveIntersection(index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-add"
                    onClick={handleAddIntersection}
                  >
                    + Add Intersection
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.enable_communication}
                      onChange={(e) => setFormData({ ...formData, enable_communication: e.target.checked })}
                    />
                    Enable Communication
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.shared_reward}
                      onChange={(e) => setFormData({ ...formData, shared_reward: e.target.checked })}
                    />
                    Shared Reward
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.enable_experience_sharing}
                      onChange={(e) => setFormData({ ...formData, enable_experience_sharing: e.target.checked })}
                    />
                    Experience Sharing
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Communication Radius (m)</label>
                  <input
                    type="number"
                    value={formData.communication_radius}
                    onChange={(e) => setFormData({ ...formData, communication_radius: Number(e.target.value) })}
                    min="100"
                    max="2000"
                    step="50"
                  />
                </div>

                <div className="form-group">
                  <label>Learning Rate</label>
                  <input
                    type="number"
                    value={formData.learning_rate}
                    onChange={(e) => setFormData({ ...formData, learning_rate: Number(e.target.value) })}
                    min="0.0001"
                    max="0.01"
                    step="0.0001"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MARLPage;
