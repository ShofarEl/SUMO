import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LogsViewerPage.css';

const LogsViewerPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fileFilter, setFileFilter] = useState('combined');
  const [limit, setLimit] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshInterval = useRef(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [levelFilter, searchTerm, fileFilter, limit]);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshInterval.current = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 5000); // Refresh every 5 seconds
    } else {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    }

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [autoRefresh, levelFilter, searchTerm, fileFilter, limit]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (levelFilter) params.append('level', levelFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (fileFilter) params.append('file', fileFilter);
      params.append('limit', limit);

      const response = await axios.get(`/logs?${params.toString()}`);
      setLogs(response.data.data.logs);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/logs/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch log stats:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleClearLogs = async () => {
    if (!window.confirm(`Are you sure you want to clear the ${fileFilter} log file? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/logs?file=${fileFilter}`);
      fetchLogs();
      fetchStats();
      alert('Logs cleared successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to clear logs');
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const response = await axios.get(`/logs/download?file=${fileFilter}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileFilter}.log`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to download logs');
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warn';
      case 'info':
        return 'info';
      case 'debug':
        return 'debug';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="logs-viewer-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Georgetown Traffic AI - System Logs</h1>
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

      <main className="logs-viewer-main">
        {/* Stats Section */}
        {stats && (
          <div className="stats-section">
            <div className="stat-card">
              <h3>Combined Log</h3>
              <p className="stat-value">{stats.combined.lines.toLocaleString()} lines</p>
              <p className="stat-label">{formatSize(stats.combined.size)}</p>
              {stats.combined.levels && (
                <div className="level-breakdown">
                  <span className="level-stat error">Error: {stats.combined.levels.error}</span>
                  <span className="level-stat warn">Warn: {stats.combined.levels.warn}</span>
                  <span className="level-stat info">Info: {stats.combined.levels.info}</span>
                  <span className="level-stat debug">Debug: {stats.combined.levels.debug}</span>
                </div>
              )}
            </div>
            <div className="stat-card">
              <h3>Error Log</h3>
              <p className="stat-value">{stats.error.lines.toLocaleString()} lines</p>
              <p className="stat-label">{formatSize(stats.error.size)}</p>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="controls-section">
          <div className="filters">
            <div className="filter-group">
              <label>Log File:</label>
              <select value={fileFilter} onChange={(e) => setFileFilter(e.target.value)}>
                <option value="combined">Combined</option>
                <option value="error">Error Only</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Level:</label>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                <option value="">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Limit:</label>
              <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>
            </div>
            <div className="filter-group search">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="action-buttons">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (5s)
            </label>
            <button onClick={fetchLogs} className="btn-secondary">
              Refresh
            </button>
            <button onClick={handleDownloadLogs} className="btn-secondary">
              Download
            </button>
            <button onClick={handleClearLogs} className="btn-danger">
              Clear Logs
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Logs Display */}
        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : (
          <div className="logs-container">
            {logs.length === 0 ? (
              <div className="empty-state">
                <p>No logs found matching the current filters.</p>
              </div>
            ) : (
              <div className="logs-list">
                {logs.map((log, index) => (
                  <div key={index} className={`log-entry ${getLevelColor(log.level)}`}>
                    <div className="log-header">
                      <span className={`log-level ${getLevelColor(log.level)}`}>
                        {log.level?.toUpperCase()}
                      </span>
                      <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                      {log.service && <span className="log-service">{log.service}</span>}
                    </div>
                    <div className="log-message">{log.message}</div>
                    {log.stack && (
                      <details className="log-stack">
                        <summary>Stack Trace</summary>
                        <pre>{log.stack}</pre>
                      </details>
                    )}
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <details className="log-meta">
                        <summary>Metadata</summary>
                        <pre>{JSON.stringify(log.meta, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LogsViewerPage;
