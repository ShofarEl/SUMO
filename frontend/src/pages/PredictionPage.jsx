import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PredictionInput from '../components/PredictionInput';
import PredictionResults from '../components/PredictionResults';
import ModelComparison from '../components/ModelComparison';
import './PredictionPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PredictionPage = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('input'); // 'input', 'results', 'comparison'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionResults, setPredictionResults] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState('lstm');

  const handlePredictionSubmit = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const endpoint = formData.modelType === 'lstm' 
        ? '/api/predictions/lstm' 
        : '/api/predictions/rf';

      const response = await axios.post(
        `${API_URL}${endpoint}`,
        {
          model_name: formData.modelName,
          input_sequence: formData.historicalData
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setPredictionResults(response.data.data);
        setSelectedModelType(formData.modelType);
        setActiveView('results');
      } else {
        setError(response.data.error?.message || 'Prediction failed');
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError(
        err.response?.data?.error?.message || 
        err.message || 
        'Failed to generate prediction'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompareModels = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // For demonstration, we'll compare LSTM and RF models
      // In a real scenario, you'd select specific trained models
      const response = await axios.post(
        `${API_URL}/api/predictions/compare`,
        {
          model_names: ['lstm_model', 'rf_model'],
          test_data: predictionResults?.input_sequence || [],
          actual_values: predictionResults?.actual_values || []
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setComparisonData(response.data.data);
        setActiveView('comparison');
      } else {
        setError(response.data.error?.message || 'Comparison failed');
      }
    } catch (err) {
      console.error('Comparison error:', err);
      setError(
        err.response?.data?.error?.message || 
        err.message || 
        'Failed to compare models'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewPrediction = () => {
    setPredictionResults(null);
    setComparisonData(null);
    setError(null);
    setActiveView('input');
  };

  const handleExportComparison = (format, data) => {
    if (format === 'json') {
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `model_comparison_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="prediction-page">
      {/* Navigation Bar */}
      <nav className="prediction-nav">
        <div className="nav-content">
          <div className="nav-left">
            <button onClick={() => navigate('/dashboard')} className="btn-back">
              ← Back to Dashboard
            </button>
            <h1>Traffic Prediction</h1>
          </div>
          <div className="nav-right">
            <button
              onClick={() => setActiveView('input')}
              className={`nav-tab ${activeView === 'input' ? 'active' : ''}`}
            >
              New Prediction
            </button>
            {predictionResults && (
              <button
                onClick={() => setActiveView('results')}
                className={`nav-tab ${activeView === 'results' ? 'active' : ''}`}
              >
                Results
              </button>
            )}
            {comparisonData && (
              <button
                onClick={() => setActiveView('comparison')}
                className={`nav-tab ${activeView === 'comparison' ? 'active' : ''}`}
              >
                Comparison
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="prediction-content">
        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Processing prediction...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}

        {/* Input View */}
        {activeView === 'input' && (
          <PredictionInput
            onSubmit={handlePredictionSubmit}
            onCancel={() => navigate('/dashboard')}
          />
        )}

        {/* Results View */}
        {activeView === 'results' && predictionResults && (
          <div className="results-view">
            <PredictionResults
              results={predictionResults}
              modelType={selectedModelType}
              onClose={handleNewPrediction}
            />
            <div className="results-actions">
              <button onClick={handleNewPrediction} className="btn-primary">
                New Prediction
              </button>
              <button onClick={handleCompareModels} className="btn-secondary">
                Compare Models
              </button>
            </div>
          </div>
        )}

        {/* Comparison View */}
        {activeView === 'comparison' && comparisonData && (
          <ModelComparison
            comparisonData={comparisonData}
            onExport={handleExportComparison}
            onClose={() => setActiveView('results')}
          />
        )}
      </div>
    </div>
  );
};

export default PredictionPage;
