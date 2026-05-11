import { useState } from 'react';
import './PredictionInput.css';

const PredictionInput = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    modelType: 'lstm',
    modelName: '',
    sequenceLength: 15,
    predictionHorizon: 10,
    historicalData: [
      {
        queue_length: 0,
        vehicle_arrivals: 0,
        time_of_day: 0.5,
        weather: 0
      }
    ]
  });

  const [errors, setErrors] = useState({});

  const weatherOptions = [
    { value: 0, label: 'Clear' },
    { value: 1, label: 'Rain' },
    { value: 2, label: 'Flood' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.modelName.trim()) {
      newErrors.modelName = 'Model name is required';
    }

    if (formData.historicalData.length < 1) {
      newErrors.historicalData = 'At least one data point is required';
    }

    // Validate each data point
    formData.historicalData.forEach((point, index) => {
      if (point.queue_length < 0) {
        newErrors[`queue_${index}`] = 'Queue length must be non-negative';
      }
      if (point.vehicle_arrivals < 0) {
        newErrors[`arrivals_${index}`] = 'Vehicle arrivals must be non-negative';
      }
      if (point.time_of_day < 0 || point.time_of_day > 1) {
        newErrors[`time_${index}`] = 'Time of day must be between 0 and 1';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const addDataPoint = () => {
    setFormData(prev => ({
      ...prev,
      historicalData: [
        ...prev.historicalData,
        {
          queue_length: 0,
          vehicle_arrivals: 0,
          time_of_day: 0.5,
          weather: 0
        }
      ]
    }));
  };

  const removeDataPoint = (index) => {
    if (formData.historicalData.length > 1) {
      setFormData(prev => ({
        ...prev,
        historicalData: prev.historicalData.filter((_, i) => i !== index)
      }));
    }
  };

  const updateDataPoint = (index, field, value) => {
    const newData = [...formData.historicalData];
    newData[index] = {
      ...newData[index],
      [field]: parseFloat(value) || 0
    };
    setFormData(prev => ({
      ...prev,
      historicalData: newData
    }));
  };

  const loadSampleData = () => {
    const sampleData = [];
    const baseQueueLength = 50;
    const baseArrivals = 30;
    
    for (let i = 0; i < formData.sequenceLength; i++) {
      const timeProgress = i / formData.sequenceLength;
      sampleData.push({
        queue_length: baseQueueLength + Math.sin(timeProgress * Math.PI) * 20,
        vehicle_arrivals: baseArrivals + Math.cos(timeProgress * Math.PI * 2) * 10,
        time_of_day: 0.3 + timeProgress * 0.2, // Morning to mid-day
        weather: 0 // Clear
      });
    }
    
    setFormData(prev => ({
      ...prev,
      historicalData: sampleData
    }));
  };

  const formatTimeOfDay = (value) => {
    const hours = Math.floor(value * 24);
    const minutes = Math.floor((value * 24 - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="prediction-input">
      <form onSubmit={handleSubmit} className="prediction-form">
        <h2>Traffic Prediction Input</h2>

        {/* Model Configuration */}
        <div className="form-section">
          <h3>Model Configuration</h3>

          <div className="form-group">
            <label htmlFor="modelType">Prediction Model</label>
            <select
              id="modelType"
              value={formData.modelType}
              onChange={(e) => setFormData({ ...formData, modelType: e.target.value })}
            >
              <option value="lstm">LSTM (Long Short-Term Memory)</option>
              <option value="rf">Random Forest</option>
            </select>
            <small>
              {formData.modelType === 'lstm' 
                ? 'Neural network for time-series prediction (RMSE target: < 0.0263)'
                : 'Ensemble learning for traffic prediction (RMSE target: < 0.0352)'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="modelName">Model Name *</label>
            <input
              type="text"
              id="modelName"
              value={formData.modelName}
              onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
              className={errors.modelName ? 'error' : ''}
              placeholder="e.g., georgetown_morning_peak_lstm"
            />
            {errors.modelName && <span className="error-message">{errors.modelName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sequenceLength">Sequence Length (minutes)</label>
              <input
                type="number"
                id="sequenceLength"
                value={formData.sequenceLength}
                onChange={(e) => setFormData({ ...formData, sequenceLength: parseInt(e.target.value) || 15 })}
                min="5"
                max="60"
              />
              <small>Historical data window</small>
            </div>

            <div className="form-group">
              <label htmlFor="predictionHorizon">Prediction Horizon (minutes)</label>
              <input
                type="number"
                id="predictionHorizon"
                value={formData.predictionHorizon}
                onChange={(e) => setFormData({ ...formData, predictionHorizon: parseInt(e.target.value) || 10 })}
                min="1"
                max="30"
              />
              <small>How far ahead to predict</small>
            </div>
          </div>
        </div>

        {/* Historical Traffic Data */}
        <div className="form-section">
          <div className="section-header">
            <h3>Historical Traffic Data</h3>
            <div className="section-actions">
              <button type="button" onClick={loadSampleData} className="btn-secondary btn-small">
                Load Sample Data
              </button>
              <button type="button" onClick={addDataPoint} className="btn-secondary btn-small">
                Add Data Point
              </button>
            </div>
          </div>
          
          <p className="section-description">
            Enter {formData.sequenceLength} data points for the historical sequence 
            (currently {formData.historicalData.length} points)
          </p>

          {errors.historicalData && (
            <span className="error-message">{errors.historicalData}</span>
          )}

          <div className="data-points-container">
            {formData.historicalData.map((point, index) => (
              <div key={index} className="data-point-card">
                <div className="data-point-header">
                  <h4>Time Step {index + 1}</h4>
                  {formData.historicalData.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDataPoint(index)}
                      className="btn-remove-small"
                      title="Remove data point"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="data-point-grid">
                  <div className="form-group">
                    <label htmlFor={`queue_${index}`}>Queue Length (m)</label>
                    <input
                      type="number"
                      id={`queue_${index}`}
                      value={point.queue_length}
                      onChange={(e) => updateDataPoint(index, 'queue_length', e.target.value)}
                      min="0"
                      step="0.1"
                      className={errors[`queue_${index}`] ? 'error' : ''}
                    />
                    {errors[`queue_${index}`] && (
                      <span className="error-message">{errors[`queue_${index}`]}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor={`arrivals_${index}`}>Vehicle Arrivals</label>
                    <input
                      type="number"
                      id={`arrivals_${index}`}
                      value={point.vehicle_arrivals}
                      onChange={(e) => updateDataPoint(index, 'vehicle_arrivals', e.target.value)}
                      min="0"
                      step="1"
                      className={errors[`arrivals_${index}`] ? 'error' : ''}
                    />
                    {errors[`arrivals_${index}`] && (
                      <span className="error-message">{errors[`arrivals_${index}`]}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor={`time_${index}`}>
                      Time of Day ({formatTimeOfDay(point.time_of_day)})
                    </label>
                    <input
                      type="range"
                      id={`time_${index}`}
                      value={point.time_of_day}
                      onChange={(e) => updateDataPoint(index, 'time_of_day', e.target.value)}
                      min="0"
                      max="1"
                      step="0.01"
                      className={errors[`time_${index}`] ? 'error' : ''}
                    />
                    {errors[`time_${index}`] && (
                      <span className="error-message">{errors[`time_${index}`]}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor={`weather_${index}`}>Weather</label>
                    <select
                      id={`weather_${index}`}
                      value={point.weather}
                      onChange={(e) => updateDataPoint(index, 'weather', e.target.value)}
                    >
                      {weatherOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Generate Prediction
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PredictionInput;
