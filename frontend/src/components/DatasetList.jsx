import { useState, useEffect } from 'react';
import axios from 'axios';
import './DatasetList.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DatasetList = ({ refreshTrigger }) => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    source: '',
    dataType: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState(null);
  const [validatingId, setValidatingId] = useState(null);
  const [validationResults, setValidationResults] = useState({});

  useEffect(() => {
    fetchDatasets();
  }, [filters, refreshTrigger]);

  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.source) params.append('source', filters.source);
      if (filters.dataType) params.append('dataType', filters.dataType);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(`${API_URL}/traffic-data?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setDatasets(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError('Failed to load datasets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleValidate = async (datasetId) => {
    setValidatingId(datasetId);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/traffic-data/${datasetId}/validate`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setValidationResults(prev => ({
        ...prev,
        [datasetId]: response.data.data.report
      }));
    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate dataset. Please try again.');
    } finally {
      setValidatingId(null);
    }
  };

  const handleDelete = async (datasetId) => {
    if (!window.confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/traffic-data/${datasetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      fetchDatasets();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete dataset. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (loading && datasets.length === 0) {
    return (
      <div className="dataset-list">
        <div className="loading">Loading datasets...</div>
      </div>
    );
  }

  return (
    <div className="dataset-list">
      <div className="filters">
        <div className="filter-group">
          <label htmlFor="source">Source</label>
          <select
            id="source"
            name="source"
            value={filters.source}
            onChange={handleFilterChange}
          >
            <option value="">All Sources</option>
            <option value="manual">Manual Upload</option>
            <option value="osm">OpenStreetMap</option>
            <option value="google_maps">Google Maps</option>
            <option value="sris">SRIS</option>
            <option value="gps">GPS Data</option>
            <option value="resolv">Resolv</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="dataType">Data Type</label>
          <select
            id="dataType"
            name="dataType"
            value={filters.dataType}
            onChange={handleFilterChange}
          >
            <option value="">All Types</option>
            <option value="sensor">Sensor Data</option>
            <option value="network">Network Data</option>
            <option value="demand">Demand Data</option>
            <option value="validation">Validation Data</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="empty-state">
          <p>No datasets found. Upload your first dataset to get started.</p>
        </div>
      ) : (
        <>
          <div className="datasets-grid">
            {datasets.map((dataset) => (
              <div key={dataset._id} className="dataset-card">
                <div className="dataset-header">
                  <h3>{dataset.name}</h3>
                  <div className="dataset-badges">
                    <span className={`badge badge-${dataset.source}`}>
                      {dataset.source}
                    </span>
                    <span className={`badge badge-${dataset.dataType}`}>
                      {dataset.dataType}
                    </span>
                  </div>
                </div>

                {dataset.description && (
                  <p className="dataset-description">{dataset.description}</p>
                )}

                <div className="dataset-metadata">
                  <div className="metadata-item">
                    <span className="metadata-label">Records:</span>
                    <span className="metadata-value">
                      {dataset.metadata?.recordCount?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">File Size:</span>
                    <span className="metadata-value">
                      {formatFileSize(dataset.metadata?.fileSize)}
                    </span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Format:</span>
                    <span className="metadata-value">
                      {dataset.metadata?.fileFormat?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Uploaded:</span>
                    <span className="metadata-value">
                      {formatDate(dataset.createdAt)}
                    </span>
                  </div>
                  {dataset.uploadedBy && (
                    <div className="metadata-item">
                      <span className="metadata-label">By:</span>
                      <span className="metadata-value">
                        {dataset.uploadedBy.firstName} {dataset.uploadedBy.lastName}
                      </span>
                    </div>
                  )}
                </div>

                {dataset.validation?.isValidated && (
                  <div className="validation-status">
                    <span className="validation-icon">✓</span>
                    <span>Validated on {formatDate(dataset.validation.validationDate)}</span>
                  </div>
                )}

                {validationResults[dataset._id] && (
                  <div className="validation-report">
                    <h4>Validation Report</h4>
                    <div className={`report-status status-${validationResults[dataset._id].overallStatus}`}>
                      {validationResults[dataset._id].overallStatus.replace('_', ' ')}
                    </div>
                    <div className="report-summary">
                      <span>Errors: {validationResults[dataset._id].summary.totalErrors}</span>
                      <span>Warnings: {validationResults[dataset._id].summary.totalWarnings}</span>
                    </div>
                  </div>
                )}

                <div className="dataset-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleValidate(dataset._id)}
                    disabled={validatingId === dataset._id}
                  >
                    {validatingId === dataset._id ? 'Validating...' : 'Validate'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(dataset._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
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

export default DatasetList;
