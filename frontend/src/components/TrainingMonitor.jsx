import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import './TrainingMonitor.css';

const TrainingMonitor = ({ agentId, onClose }) => {
  const [trainingData, setTrainingData] = useState({
    status: 'loading',
    currentEpisode: 0,
    totalEpisodes: 0,
    currentReward: 0,
    bestReward: -Infinity,
    avgDelay: 0,
    convergenceMetric: 0
  });
  const [rewardHistory, setRewardHistory] = useState([]);
  const [lossHistory, setLossHistory] = useState([]);
  const [delayHistory, setDelayHistory] = useState([]);
  const [stateActionPairs, setStateActionPairs] = useState([]);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const token = localStorage.getItem('token');
    
    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected for training monitoring');
      setIsConnected(true);
      
      // Subscribe to training updates
      socketRef.current.emit('subscribe_training', { agentId });
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('training_update', (data) => {
      console.log('Training update received:', data);
      
      if (data.agentId === agentId) {
        updateTrainingData(data);
      }
    });

    socketRef.current.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError(err.message || 'WebSocket connection error');
    });

    // Start polling for training status
    fetchTrainingStatus();
    pollingIntervalRef.current = setInterval(fetchTrainingStatus, 5000);

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe_training', { agentId });
        socketRef.current.disconnect();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [agentId]);

  const fetchTrainingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/agents/${agentId}/training-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch training status');
      }

      const result = await response.json();
      const data = result.data;

      setTrainingData({
        status: data.trainingStatus,
        currentEpisode: data.trainingProgress?.currentEpisode || 0,
        totalEpisodes: data.trainingProgress?.totalEpisodes || 0,
        currentReward: data.trainingProgress?.currentReward || 0,
        bestReward: data.trainingProgress?.bestReward || -Infinity,
        avgDelay: data.trainingProgress?.avgDelay || 0,
        convergenceMetric: data.trainingProgress?.convergenceMetric || 0
      });

      // Update histories from latest metrics if available
      if (data.latestMetrics) {
        updateTrainingData({
          episode: data.trainingProgress?.currentEpisode,
          ...data.latestMetrics
        });
      }

      // Stop polling if training is completed or failed
      if (data.trainingStatus === 'completed' || data.trainingStatus === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      }
    } catch (err) {
      console.error('Error fetching training status:', err);
      setError(err.message);
    }
  };

  const updateTrainingData = (data) => {
    const episode = data.episode || data.currentEpisode || trainingData.currentEpisode;
    
    // Update reward history
    if (data.total_reward !== undefined || data.global_reward !== undefined || data.reward !== undefined) {
      const reward = data.total_reward || data.global_reward || data.reward || data.currentReward;
      setRewardHistory(prev => {
        const newHistory = [...prev, { episode, reward }];
        // Keep last 100 episodes
        return newHistory.slice(-100);
      });
    }

    // Update loss history
    if (data.loss !== undefined) {
      setLossHistory(prev => {
        const newHistory = [...prev, { episode, loss: data.loss }];
        return newHistory.slice(-100);
      });
    }

    // Update delay history
    if (data.average_delay !== undefined || data.avgDelay !== undefined) {
      const delay = data.average_delay || data.avgDelay;
      setDelayHistory(prev => {
        const newHistory = [...prev, { episode, delay }];
        return newHistory.slice(-100);
      });
    }

    // Update state-action pairs (for visualization)
    if (data.state_action_pairs) {
      setStateActionPairs(data.state_action_pairs.slice(-10)); // Keep last 10
    }

    // Update current training data
    setTrainingData(prev => ({
      ...prev,
      currentEpisode: episode,
      currentReward: data.total_reward || data.global_reward || data.reward || prev.currentReward,
      bestReward: Math.max(prev.bestReward, data.total_reward || data.global_reward || data.reward || prev.bestReward),
      avgDelay: data.average_delay || data.avgDelay || prev.avgDelay,
      convergenceMetric: data.convergence_metric || prev.convergenceMetric
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'training':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    return typeof num === 'number' ? num.toFixed(2) : num;
  };

  if (error && trainingData.status === 'loading') {
    return (
      <div className="training-monitor">
        <div className="monitor-header">
          <h2>Training Monitor</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>
        <div className="error-state">
          <p>Error loading training data: {error}</p>
          <button onClick={fetchTrainingStatus} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="training-monitor">
      <div className="monitor-header">
        <div>
          <h2>Training Monitor</h2>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            {isConnected ? 'Live Updates' : 'Polling Mode'}
          </div>
        </div>
        <button onClick={onClose} className="btn-close">×</button>
      </div>

      {/* Status Overview */}
      <div className="status-overview">
        <div className="status-card">
          <div className="status-label">Training Status</div>
          <div className="status-value" style={{ color: getStatusColor(trainingData.status) }}>
            {trainingData.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <div className="status-card">
          <div className="status-label">Progress</div>
          <div className="status-value">
            {trainingData.currentEpisode} / {trainingData.totalEpisodes}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(trainingData.currentEpisode / trainingData.totalEpisodes) * 100}%`
              }}
            />
          </div>
        </div>

        <div className="status-card">
          <div className="status-label">Current Reward</div>
          <div className="status-value">{formatNumber(trainingData.currentReward)}</div>
        </div>

        <div className="status-card">
          <div className="status-label">Best Reward</div>
          <div className="status-value highlight">{formatNumber(trainingData.bestReward)}</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Average Delay</div>
          <div className="metric-value">{formatNumber(trainingData.avgDelay)}s</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Convergence</div>
          <div className="metric-value">{formatNumber(trainingData.convergenceMetric)}</div>
        </div>
      </div>

      {/* Episode Rewards Chart */}
      <div className="chart-container">
        <h3>Episode Rewards</h3>
        {rewardHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={rewardHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="episode" 
                stroke="#9ca3af"
                label={{ value: 'Episode', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                stroke="#9ca3af"
                label={{ value: 'Reward', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="reward" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Reward"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-placeholder">
            <p>Waiting for training data...</p>
          </div>
        )}
      </div>

      {/* Loss Curve */}
      {lossHistory.length > 0 && (
        <div className="chart-container">
          <h3>Loss Curve</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lossHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="episode" 
                stroke="#9ca3af"
                label={{ value: 'Episode', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                stroke="#9ca3af"
                label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="loss" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                name="Loss"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Average Delay Over Time */}
      {delayHistory.length > 0 && (
        <div className="chart-container">
          <h3>Average Delay Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={delayHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="episode" 
                stroke="#9ca3af"
                label={{ value: 'Episode', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                stroke="#9ca3af"
                label={{ value: 'Delay (s)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="delay" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name="Avg Delay"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Agent Behavior Visualization */}
      {stateActionPairs.length > 0 && (
        <div className="behavior-container">
          <h3>Recent Agent Behavior (State-Action Pairs)</h3>
          <div className="behavior-table">
            <table>
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Queue Length</th>
                  <th>Waiting Time</th>
                  <th>Action Taken</th>
                  <th>Reward</th>
                </tr>
              </thead>
              <tbody>
                {stateActionPairs.map((pair, index) => (
                  <tr key={index}>
                    <td>{pair.step}</td>
                    <td>{formatNumber(pair.state?.queue_length)}</td>
                    <td>{formatNumber(pair.state?.waiting_time)}s</td>
                    <td>
                      <span className="action-badge">{pair.action}</span>
                    </td>
                    <td className={pair.reward >= 0 ? 'positive' : 'negative'}>
                      {formatNumber(pair.reward)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Convergence Metrics */}
      <div className="convergence-info">
        <h3>Convergence Metrics</h3>
        <div className="convergence-grid">
          <div className="convergence-item">
            <span className="label">Episodes Completed:</span>
            <span className="value">{trainingData.currentEpisode}</span>
          </div>
          <div className="convergence-item">
            <span className="label">Best Reward Achieved:</span>
            <span className="value">{formatNumber(trainingData.bestReward)}</span>
          </div>
          <div className="convergence-item">
            <span className="label">Current Performance:</span>
            <span className="value">
              {trainingData.bestReward > -Infinity 
                ? `${((trainingData.currentReward / trainingData.bestReward) * 100).toFixed(1)}% of best`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingMonitor;
