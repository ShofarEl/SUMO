import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import axios from 'axios';
import './ReportsPage.css';

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'simulation',
    simulationIds: []
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get('/api/reports');
      setReports(response.data.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      await axios.post('/api/reports/generate', formData);
      alert('Report generated successfully!');
      setShowGenerateModal(false);
      setFormData({ title: '', type: 'simulation', simulationIds: [] });
      fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId, title) => {
    try {
      const response = await axios.get(`/api/reports/${reportId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await axios.delete(`/api/reports/${reportId}`);
      alert('Report deleted successfully');
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const getReportTypeLabel = (type) => {
    const labels = {
      simulation: 'Simulation Report',
      comparison: 'Comparison Report',
      feasibility: 'Feasibility Assessment',
      full_research: 'Full Research Report'
    };
    return labels[type] || type;
  };

  const getReportTypeColor = (type) => {
    const colors = {
      simulation: '#3b82f6',
      comparison: '#8b5cf6',
      feasibility: '#10b981',
      full_research: '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="reports-page">
        <div className="reports-header">
          <div className="header-content">
            <h1>Research Reports</h1>
            <p className="header-subtitle">
              Generate and manage research reports with comprehensive analysis
            </p>
          </div>
          <button
            className="generate-btn"
            onClick={() => setShowGenerateModal(true)}
          >
            + Generate New Report
          </button>
        </div>

        <div className="reports-content">
          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No Reports Yet</h3>
              <p>Generate your first research report to get started</p>
              <button
                className="generate-btn-large"
                onClick={() => setShowGenerateModal(true)}
              >
                Generate Report
              </button>
            </div>
          ) : (
            <div className="reports-grid">
              {reports.map((report) => (
                <div key={report._id} className="report-card">
                  <div className="report-card-header">
                    <div
                      className="report-type-badge"
                      style={{ backgroundColor: getReportTypeColor(report.type) }}
                    >
                      {getReportTypeLabel(report.type)}
                    </div>
                    <div className="report-date">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="report-card-body">
                    <h3 className="report-title">{report.title}</h3>
                    
                    <div className="report-meta">
                      <div className="meta-item">
                        <span className="meta-label">Generated by:</span>
                        <span className="meta-value">
                          {report.generatedBy?.firstName} {report.generatedBy?.lastName}
                        </span>
                      </div>
                      
                      {report.simulationIds && report.simulationIds.length > 0 && (
                        <div className="meta-item">
                          <span className="meta-label">Simulations:</span>
                          <span className="meta-value">{report.simulationIds.length}</span>
                        </div>
                      )}
                      
                      <div className="meta-item">
                        <span className="meta-label">Format:</span>
                        <span className="meta-value">{report.format.toUpperCase()}</span>
                      </div>
                    </div>

                    {report.content?.executiveSummary && (
                      <p className="report-summary">
                        {report.content.executiveSummary.substring(0, 150)}...
                      </p>
                    )}
                  </div>

                  <div className="report-card-footer">
                    <button
                      className="action-btn download"
                      onClick={() => handleDownload(report._id, report.title)}
                    >
                      📥 Download
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(report._id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Report Modal */}
        {showGenerateModal && (
          <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Generate New Report</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowGenerateModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleGenerateReport} className="report-form">
                <div className="form-group">
                  <label htmlFor="title">Report Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter report title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="type">Report Type *</label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="simulation">Simulation Report</option>
                    <option value="comparison">Comparison Report</option>
                    <option value="feasibility">Feasibility Assessment</option>
                    <option value="full_research">Full Research Report</option>
                  </select>
                </div>

                <div className="form-info">
                  <h4>Report Contents</h4>
                  <ul>
                    <li>Executive Summary</li>
                    <li>Methodology</li>
                    <li>Results and Analysis</li>
                    <li>Conclusions</li>
                    <li>Recommendations</li>
                  </ul>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowGenerateModal(false)}
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ReportsPage;
