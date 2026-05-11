import { useState, useEffect } from 'react';
import axios from 'axios';
import './SimulationHistory.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SimulationHistory = ({ onSelectSimulation, onViewResults }) => {
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    controlStrategy: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSimulations();
  }, [filters, currentPage]);

  const fetchSimulations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      if (filters.controlStrategy !== 'all') {
        params.controlStrategy = filters.controlStrategy;
      }

      const response = await axios.get(`${API_URL}/simulations`, { params });

      if (response.data.success) {
        setSimulations(response.data.data.simulations);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch simulations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this simulation?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/simulations/${id}`);
      fetchSimulations();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete simulation');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'status-pending',
      running: 'status-running',
      completed: 'status-completed',
      failed: 'status-failed'
    };
    return classes[status] || 'status-unknown';
  };

  const getControlStrategyLabel = (strategy) => {
    const labels = {
      fixed: 'Fixed Timing',
      lstm: 'LSTM',
      rf: 'Random Forest',
      dqn: 'DQN',
      ppo: 'PPO',
      marl: 'MARL'
    };
    return labels[strategy] || strategy;
  };

  if (loading && simulations.length === 0) {
    return (
      <div className="simulation-history">
        <div className="loading-state">Loading simulations...</div>
      </div>
    );
  }

  return (
    <div className="simulation-history">
      <div className="history-header">
        <h2>Simulation History</h2>
        <button onClick={fetchSimulations} className="btn-refresh">
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Control Strategy:</label>
          <select
            value={filters.controlStrategy}
            onChange={(e) => setFilters({ ...filters, controlStrategy: e.target.value })}
          >
            <option value="all">All</option>
            <option value="fixed">Fixed Timing</option>
            <option value="lstm">LSTM</option>
            <option value="rf">Random Forest</option>
            <option value="dqn">DQN</option>
            <option value="ppo">PPO</option>
            <option value="marl">MARL</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="createdAt">Date Created</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Order:</label>
          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Simulations List */}
      {simulations.length === 0 ? (
        <div className="empty-state">
          <p>No simulations found</p>
          <p className="empty-hint">Create a new simulation to get started</p>
        </div>
      ) : (
        <>
          <div className="simulations-list">
            {simulations.map((sim) => (
              <div key={sim._id} className="simulation-card">
                <div className="card-header">
                  <div className="card-title">
                    <h3>{sim.name}</h3>
                    <span className={`status-badge ${getStatusBadgeClass(sim.status)}`}>
                      {sim.status}
                    </span>
                  </div>
                  <div className="card-actions">
                    {sim.status === 'completed' && onViewResults && (
                      <button
                        onClick={() => onViewResults(sim._id)}
                        className="btn-view"
                      >
                        View Results
                      </button>
                    )}
                    {onSelectSimulation && (
                      <button
                        onClick={() => onSelectSimulation(sim)}
                        className="btn-select"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(sim._id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {sim.description && (
                  <p className="card-description">{sim.description}</p>
                )}

                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Control Strategy:</span>
                    <span className="detail-value">
                      {getControlStrategyLabel(sim.config?.controlStrategy)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Traffic Demand:</span>
                    <span className="detail-value">{sim.config?.trafficDemand}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Time of Day:</span>
                    <span className="detail-value">
                      {sim.config?.timeOfDay?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">
                      {formatDuration(sim.config?.duration || 0)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{formatDate(sim.createdAt)}</span>
                  </div>
                </div>

                {/* Summary Metrics for Completed Simulations */}
                {sim.status === 'completed' && sim.results && (
                  <div className="card-metrics">
                    <div className="metric-item">
                      <span className="metric-label">Avg Delay</span>
                      <span className="metric-value">
                        {sim.results.avgDelay?.toFixed(2) || 'N/A'} sec
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Queue Length</span>
                      <span className="metric-value">
                        {sim.results.avgQueueLength?.toFixed(2) || 'N/A'} m
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Throughput</span>
                      <span className="metric-value">
                        {sim.results.throughput?.toFixed(0) || 'N/A'} veh/h
                      </span>
                    </div>
                    {sim.results.co2Emissions && (
                      <div className="metric-item">
                        <span className="metric-label">CO₂ Emissions</span>
                        <span className="metric-value">
                          {sim.results.co2Emissions.toFixed(2)} kg
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn-page"
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn-page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SimulationHistory;
