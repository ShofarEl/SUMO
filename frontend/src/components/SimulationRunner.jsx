import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import './SimulationRunner.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

const SimulationRunner = ({ simulationId, onComplete, onError }) => {
  const [status, setStatus] = useState('idle'); // idle, running, paused, completed, failed
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState({
    avgDelay: 0,
    avgQueueLength: 0,
    throughput: 0,
    currentTime: 0,
    totalTime: 0
  });
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = io(WS_URL, {
      auth: {
        token: localStorage.getItem('accessToken')
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      // Subscribe to simulation updates
      if (simulationId) {
        socket.emit('subscribe_simulation', { simulationId });
      }
    });

    socket.on('simulation_update', (data) => {
      if (data.simulationId === simulationId) {
        setMetrics({
          avgDelay: data.metrics?.avgDelay || 0,
          avgQueueLength: data.metrics?.avgQueueLength || 0,
          throughput: data.metrics?.throughput || 0,
          currentTime: data.currentTime || 0,
          totalTime: data.totalTime || 0
        });

        if (data.totalTime > 0) {
          setProgress((data.currentTime / data.totalTime) * 100);
        }

        if (data.status) {
          setStatus(data.status);
        }
      }
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      setError(error.message || 'WebSocket connection error');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe_simulation', { simulationId });
        socketRef.current.disconnect();
      }
    };
  }, [simulationId]);

  const startSimulation = async () => {
    try {
      setError(null);
      setStatus('running');
      
      const response = await axios.post(`${API_URL}/simulations/${simulationId}/run`);
      
      if (response.data.success) {
        console.log('Simulation started:', response.data.data);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to start simulation';
      setError(errorMessage);
      setStatus('failed');
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const pauseSimulation = async () => {
    try {
      // Note: Pause functionality would need to be implemented in the backend
      setStatus('paused');
      console.log('Simulation paused');
    } catch (err) {
      console.error('Failed to pause simulation:', err);
    }
  };

  const stopSimulation = async () => {
    try {
      setStatus('idle');
      setProgress(0);
      setMetrics({
        avgDelay: 0,
        avgQueueLength: 0,
        throughput: 0,
        currentTime: 0,
        totalTime: 0
      });
      console.log('Simulation stopped');
    } catch (err) {
      console.error('Failed to stop simulation:', err);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/simulations/${simulationId}/status`);
      
      if (response.data.success) {
        const simStatus = response.data.data.status;
        setStatus(simStatus);
        
        if (simStatus === 'completed') {
          setProgress(100);
          if (onComplete) {
            onComplete();
          }
        } else if (simStatus === 'failed') {
          setError('Simulation failed');
          if (onError) {
            onError('Simulation failed');
          }
        }
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  useEffect(() => {
    if (status === 'running') {
      const interval = setInterval(checkStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [status, simulationId]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="simulation-runner">
      <div className="runner-header">
        <h3>Simulation Control</h3>
        <div className="status-badge" data-status={status}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Control Buttons */}
      <div className="control-buttons">
        {status === 'idle' && (
          <button onClick={startSimulation} className="btn-start">
            Start Simulation
          </button>
        )}
        
        {status === 'running' && (
          <>
            <button onClick={pauseSimulation} className="btn-pause">
              Pause
            </button>
            <button onClick={stopSimulation} className="btn-stop">
              Stop
            </button>
          </>
        )}
        
        {status === 'paused' && (
          <>
            <button onClick={startSimulation} className="btn-start">
              Resume
            </button>
            <button onClick={stopSimulation} className="btn-stop">
              Stop
            </button>
          </>
        )}
        
        {(status === 'completed' || status === 'failed') && (
          <button onClick={stopSimulation} className="btn-reset">
            Reset
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(status === 'running' || status === 'paused' || status === 'completed') && (
        <div className="progress-section">
          <div className="progress-header">
            <span>Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="time-info">
            <span>Time: {formatTime(metrics.currentTime)} / {formatTime(metrics.totalTime)}</span>
          </div>
        </div>
      )}

      {/* Live Metrics */}
      {(status === 'running' || status === 'paused' || status === 'completed') && (
        <div className="metrics-section">
          <h4>Live Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Average Delay</div>
              <div className="metric-value">
                {metrics.avgDelay.toFixed(2)} <span className="metric-unit">sec</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Queue Length</div>
              <div className="metric-value">
                {metrics.avgQueueLength.toFixed(2)} <span className="metric-unit">m</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Throughput</div>
              <div className="metric-value">
                {metrics.throughput.toFixed(0)} <span className="metric-unit">veh/h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {status === 'completed' && (
        <div className="success-alert">
          Simulation completed successfully! View results below.
        </div>
      )}
    </div>
  );
};

export default SimulationRunner;
