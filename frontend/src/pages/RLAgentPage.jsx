import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RLAgentConfig from '../components/RLAgentConfig';
import './RLAgentPage.css';

const RLAgentPage = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const data = await response.json();
      setAgents(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (formData) => {
    try {
      setCreating(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create agent');
      }

      const data = await response.json();
      setAgents(prev => [data.data, ...prev]);
      setShowCreateForm(false);
      alert('RL Agent created successfully!');
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      setAgents(prev => prev.filter(agent => agent._id !== agentId));
      alert('Agent deleted successfully');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'status-badge status-completed';
      case 'training':
        return 'status-badge status-training';
      case 'failed':
        return 'status-badge status-failed';
      default:
        return 'status-badge status-not-started';
    }
  };

  if (loading) {
    return (
      <div className="rl-agent-page">
        <div className="loading">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="rl-agent-page">
      <div className="page-header">
        <div>
          <h1>RL Agent Management</h1>
          <p>Create and manage reinforcement learning agents for traffic signal control</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
          disabled={showCreateForm}
        >
          Create New Agent
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="create-form-container">
          <RLAgentConfig
            onSubmit={handleCreateAgent}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="agents-list">
        <h2>Your Agents</h2>
        
        {agents.length === 0 ? (
          <div className="empty-state">
            <p>No agents created yet. Create your first RL agent to get started!</p>
          </div>
        ) : (
          <div className="agents-grid">
            {agents.map(agent => (
              <div key={agent._id} className="agent-card">
                <div className="agent-header">
                  <h3>{agent.name}</h3>
                  <span className={getStatusBadgeClass(agent.trainingStatus)}>
                    {agent.trainingStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="agent-details">
                  <div className="detail-row">
                    <span className="label">Algorithm:</span>
                    <span className="value">{agent.algorithm.toUpperCase()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Mode:</span>
                    <span className="value">
                      {agent.isMultiAgent ? 'Multi-Agent (MARL)' : 'Single Agent'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Intersections:</span>
                    <span className="value">{agent.intersectionIds.length}</span>
                  </div>
                  {agent.isDeployed && (
                    <div className="detail-row">
                      <span className="deployed-badge">Deployed</span>
                    </div>
                  )}
                </div>

                {agent.trainingProgress && agent.trainingStatus === 'training' && (
                  <div className="training-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(agent.trainingProgress.currentEpisode / agent.trainingProgress.totalEpisodes) * 100}%`
                        }}
                      />
                    </div>
                    <small>
                      Episode {agent.trainingProgress.currentEpisode} / {agent.trainingProgress.totalEpisodes}
                    </small>
                  </div>
                )}

                {agent.performance && agent.trainingStatus === 'completed' && (
                  <div className="performance-summary">
                    <h4>Performance</h4>
                    <div className="metrics-grid">
                      {agent.performance.delayReduction && (
                        <div className="metric">
                          <span className="metric-value">
                            {agent.performance.delayReduction.toFixed(1)}%
                          </span>
                          <span className="metric-label">Delay Reduction</span>
                        </div>
                      )}
                      {agent.performance.throughputIncrease && (
                        <div className="metric">
                          <span className="metric-value">
                            {agent.performance.throughputIncrease.toFixed(1)}%
                          </span>
                          <span className="metric-label">Throughput Increase</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="agent-actions">
                  <button
                    onClick={() => navigate(`/agents/${agent._id}`)}
                    className="btn-secondary btn-small"
                  >
                    View Details
                  </button>
                  {agent.trainingStatus === 'not_started' && (
                    <button
                      onClick={() => navigate(`/agents/${agent._id}/train`)}
                      className="btn-primary btn-small"
                    >
                      Start Training
                    </button>
                  )}
                  {agent.trainingStatus !== 'training' && (
                    <button
                      onClick={() => handleDeleteAgent(agent._id)}
                      className="btn-danger btn-small"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="agent-meta">
                  <small>Created {new Date(agent.createdAt).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RLAgentPage;
