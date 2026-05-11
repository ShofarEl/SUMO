import { useState, useRef } from 'react';
import axios from 'axios';
import './DatasetUpload.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DatasetUpload = ({ onUploadSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: 'manual',
    dataType: 'sensor'
  });
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      const validTypes = ['text/csv', 'application/json', 'application/xml', 'text/xml'];
      const validExtensions = ['.csv', '.json', '.xml'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

      if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
        setError('Invalid file type. Please upload CSV, JSON, or XML files only.');
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit.');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setValidationResults(null);
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files[0]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please provide a dataset name.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('name', formData.name);
    uploadData.append('description', formData.description);
    uploadData.append('source', formData.source);
    uploadData.append('dataType', formData.dataType);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/traffic-data`, uploadData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setValidationResults(response.data.validation);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        source: 'manual',
        dataType: 'sensor'
      });
      setFile(null);
      setUploadProgress(0);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.error?.message || 
        err.response?.data?.message || 
        'Failed to upload dataset. Please try again.'
      );
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dataset-upload">
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-section">
          <h3>Dataset Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Dataset Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Georgetown Traffic Data - January 2024"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide details about this dataset..."
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source">Data Source *</label>
              <select
                id="source"
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                required
              >
                <option value="manual">Manual Upload</option>
                <option value="osm">OpenStreetMap</option>
                <option value="google_maps">Google Maps</option>
                <option value="sris">SRIS</option>
                <option value="gps">GPS Data</option>
                <option value="resolv">Resolv</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dataType">Data Type *</label>
              <select
                id="dataType"
                name="dataType"
                value={formData.dataType}
                onChange={handleInputChange}
                required
              >
                <option value="sensor">Sensor Data</option>
                <option value="network">Network Data</option>
                <option value="demand">Demand Data</option>
                <option value="validation">Validation Data</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>File Upload</h3>
          
          <div
            className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.xml"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            
            {file ? (
              <div className="file-info">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  className="remove-file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="drop-zone-content">
                <div className="upload-icon">📁</div>
                <p className="drop-zone-text">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="drop-zone-hint">
                  Supported formats: CSV, JSON, XML (Max 50MB)
                </p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="progress-text">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {validationResults && (
          <div className="alert alert-success">
            <span className="alert-icon">✓</span>
            <div>
              <p><strong>Upload successful!</strong></p>
              {validationResults.warnings && validationResults.warnings.length > 0 && (
                <div className="validation-warnings">
                  <p>Warnings:</p>
                  <ul>
                    {validationResults.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || !file}
          >
            {uploading ? 'Uploading...' : 'Upload Dataset'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DatasetUpload;
