import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TrainingMonitor from '../components/TrainingMonitor';
import './AgentTrainingPage.css';

const AgentTrainingPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trainingConfig, setTrainingConfig] = useState({
    networkFile: 'georgetown_network.net.xml',
    routeFile: 'georgetown_routes.rou.xml',
    numEpisodes: 100,
    maxStepsPerEpisode: 3600,
    evaluationFrequency: 50,
    saveFrequency: 10
  });
  const [isTraining, setIsTraining] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agent');
      }

      const result = await response.json();
      setAgent(result.data);
      
      // If agent is already training, show monitor
      if (result.data.trainingStatus === 'training') {
        setIsTraining(true);
        setShowMonitor(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/agents/${agentId}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(trainingConfig)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to start training');
      }

      setIsTraining(true);
      setShowMonitor(true);
      
      // Refresh agent data
      await fetchAgent();
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="agent-training-page">
        <div className="loading">Loading agent...</div>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="agent-training-page">
        <div className="error-banner">{error}</div>
        <button onClick={() => navigate('/agents')} className="btn-secondary">
          Back to Agents
        </button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="agent-training-page">
        <div className="empty-state">Agent not found</div>
        <button onClick={() => navigate('/agents')} className="btn-secondary">
          Back to Agents
        </button>
      </div>
    );
  }

  return (
    <div className="agent-training-page">
      <div className="page-header">
        <button onClick={() => navigate('/agents')} className="btn-back">
          ← Back to Agents
        </button>
        <div>
          <h1>Train Agent: {agent.name}</h1>
          <p className="agent-info">
            {agent.algorithm.toUpperCase()} 
            {agent.isMultiAgent ? ' (Multi-Agent)' : ''} • 
            {agent.intersectionIds.length} Intersection{agent.intersectionIds.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner">{error}</div>
      )}

      {!showMonitor && agent.trainingStatus !== 'training' && (
        <div className="training-config-section">
          <h2>Training Configuration</h2>
          <p className="section-description">
            Configure the training parameters for your RL agent. The agent will learn optimal
            signal control policies through interaction with the SUMO traffic simulation.
          </p>

          <div className="config-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="networkFile">Network File</label>
                <input
                  type="text"
                  id="networkFile"
                  value={trainingConfig.networkFile}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, networkFile: e.target.value })}
                  placeholder="e.g., georgetown_network.net.xml"
                />
                <small>SUMO network file containing road topology</small>
              </div>

              <div className="form-group">
                <label htmlFor="routeFile">Route File</label>
                <input
                  type="text"
                  id="routeFile"
                  value={trainingConfig.routeFile}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, routeFile: e.target.value })}
                  placeholder="e.g., georgetown_routes.rou.xml"
                />
                <small>SUMO route file containing vehicle demand</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="numEpisodes">Number of Episodes</label>
                <input
                  type="number"
                  id="numEpisodes"
                  value={trainingConfig.numEpisodes}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, numEpisodes: parseInt(e.target.value) })}
                  min="10"
                  max="1000"
                />
                <small>Total training episodes (recommended: 100-500)</small>
              </div>

              <div className="form-group">
                <label htmlFor="maxStepsPerEpisode">Max Steps per Episode</label>
                <input
                  type="number"
                  id="maxStepsPerEpisode"
                  value={trainingConfig.maxStepsPerEpisode}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, maxStepsPerEpisode: parseInt(e.target.value) })}
                  min="1000"
                  max="10000"
                />
                <small>Simulation steps per episode (1 step = 1 second)</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="evaluationFrequency">Evaluation Frequency</label>
                <input
                  type="number"
                  id="evaluationFrequency"
                  value={trainingConfig.evaluationFrequency}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, evaluationFrequency: parseInt(e.target.value) })}
                  min="1"
                  max="100"
                />
                <small>Evaluate agent every N episodes</small>
              </div>

              <div className="form-group">
                <label htmlFor="saveFrequency">Save Frequency</label>
                <input
                  type="number"
                  id="saveFrequency"
                  value={trainingConfig.saveFrequency}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, saveFrequency: parseInt(e.target.value) })}
                  min="1"
                  max="100"
                />
                <small>Save model every N episodes</small>
              </div>
            </div>

            <div className="training-info">
              <h3>Training Information</h3>
              <ul>
                <li>
                  <strong>Estimated Duration:</strong> {Math.ceil(trainingConfig.numEpisodes * trainingConfig.maxStepsPerEpisode / 3600)} hours
                  (assuming 1 hour simulation time per episode)
                </li>
                <li>
                  <strong>Algorithm:</strong> {agent.algorithm.toUpperCase()} with experience replay and target network
                </li>
                <li>
                  <strong>State Space:</strong> {agent.config.stateSpace.size} features including queue lengths, waiting times, and signal phases
                </li>
                <li>
                  <strong>Action Space:</strong> {agent.config.actionSpace.size} possible signal control actions
                </li>
                {agent.isMultiAgent && (
                  <li>
                    <strong>Multi-Agent:</strong> {agent.intersectionIds.length} agents will coordinate to optimize network-wide performance
                  </li>
                )}
              </ul>
            </div>

            <div className="form-actions">
              <button
                onClick={handleStartTraining}
                className="btn-primary btn-large"
                disabled={isTraining}
              >
                {isTraining ? 'Training in Progress...' : 'Start Training'}
              </button>
              <button
                onClick={() => navigate('/agents')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showMonitor && (
        <TrainingMonitor
          agentId={agentId}
          onClose={() => {
            setShowMonitor(false);
            navigate('/agents');
          }}
        />
      )}

      {agent.trainingStatus === 'completed' && !showMonitor && (
        <div className="training-complete">
          <div className="success-icon">✓</div>
          <h2>Training Completed!</h2>
          <p>Your agent has successfully completed training.</p>
          <div className="complete-actions">
            <button onClick={() => setShowMonitor(true)} className="btn-primary">
              View Training Results
            </button>
            <button onClick={() => navigate(`/agents/${agentId}/compare`)} className="btn-secondary">
              Compare Performance
            </button>
            <button onClick={() => navigate('/agents')} className="btn-secondary">
              Back to Agents
            </button>
          </div>
        </div>
      )}

      {agent.trainingStatus === 'failed' && !showMonitor && (
        <div className="training-failed">
          <div className="error-icon">✗</div>
          <h2>Training Failed</h2>
          <p>The training process encountered an error. Please check the logs and try again.</p>
          <div className="failed-actions">
            <button onClick={() => navigate('/agents')} className="btn-secondary">
              Back to Agents
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentTrainingPage;
