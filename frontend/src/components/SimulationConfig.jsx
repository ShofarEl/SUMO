import { useState } from 'react';
import './SimulationConfig.css';

const SimulationConfig = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    trafficDemand: initialData?.config?.trafficDemand || 'medium',
    vehicleMix: {
      cars: initialData?.config?.vehicleMix?.cars || 55,
      motorcycles: initialData?.config?.vehicleMix?.motorcycles || 25,
      minibuses: initialData?.config?.vehicleMix?.minibuses || 15,
      trucks: initialData?.config?.vehicleMix?.trucks || 5
    },
    duration: initialData?.config?.duration || 3600,
    timeOfDay: initialData?.config?.timeOfDay || 'morning_peak',
    weather: initialData?.config?.weather || 'clear',
    controlStrategy: initialData?.config?.controlStrategy || 'fixed',
    incidents: initialData?.config?.incidents || []
  });

  const [errors, setErrors] = useState({});
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [currentIncident, setCurrentIncident] = useState({
    type: 'accident',
    location: '',
    startTime: 0,
    duration: 300
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Simulation name is required';
    }

    const vehicleTotal = Object.values(formData.vehicleMix).reduce((sum, val) => sum + val, 0);
    if (Math.abs(vehicleTotal - 100) > 0.1) {
      newErrors.vehicleMix = 'Vehicle mix percentages must sum to 100%';
    }

    if (formData.duration < 60 || formData.duration > 86400) {
      newErrors.duration = 'Duration must be between 60 and 86400 seconds';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleVehicleMixChange = (type, value) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      vehicleMix: {
        ...prev.vehicleMix,
        [type]: Math.max(0, Math.min(100, numValue))
      }
    }));
  };

  const addIncident = () => {
    if (currentIncident.location.trim()) {
      setFormData(prev => ({
        ...prev,
        incidents: [...prev.incidents, { ...currentIncident }]
      }));
      setCurrentIncident({
        type: 'accident',
        location: '',
        startTime: 0,
        duration: 300
      });
      setShowIncidentForm(false);
    }
  };

  const removeIncident = (index) => {
    setFormData(prev => ({
      ...prev,
      incidents: prev.incidents.filter((_, i) => i !== index)
    }));
  };

  const vehicleTotal = Object.values(formData.vehicleMix).reduce((sum, val) => sum + val, 0);

  return (
    <div className="simulation-config">
      <form onSubmit={handleSubmit} className="config-form">
        <h2>Simulation Configuration</h2>

        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Simulation Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? 'error' : ''}
              placeholder="e.g., Morning Peak Analysis"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of this simulation"
              rows="3"
            />
          </div>
        </div>

        {/* Traffic Parameters */}
        <div className="form-section">
          <h3>Traffic Parameters</h3>

          <div className="form-group">
            <label htmlFor="trafficDemand">Traffic Demand Level</label>
            <select
              id="trafficDemand"
              value={formData.trafficDemand}
              onChange={(e) => setFormData({ ...formData, trafficDemand: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="peak">Peak</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="timeOfDay">Time of Day</label>
            <select
              id="timeOfDay"
              value={formData.timeOfDay}
              onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
            >
              <option value="morning_peak">Morning Peak (7-9 AM)</option>
              <option value="off_peak">Off-Peak</option>
              <option value="evening_peak">Evening Peak (4-6:30 PM)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration (seconds)</label>
            <input
              type="number"
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
              min="60"
              max="86400"
              className={errors.duration ? 'error' : ''}
            />
            <small>{Math.floor(formData.duration / 60)} minutes</small>
            {errors.duration && <span className="error-message">{errors.duration}</span>}
          </div>
        </div>

        {/* Vehicle Mix */}
        <div className="form-section">
          <h3>Vehicle Mix</h3>
          <p className="section-description">
            Adjust vehicle type percentages (Total: {vehicleTotal.toFixed(1)}%)
          </p>

          <div className="vehicle-mix-grid">
            <div className="form-group">
              <label htmlFor="cars">Cars (%)</label>
              <input
                type="number"
                id="cars"
                value={formData.vehicleMix.cars}
                onChange={(e) => handleVehicleMixChange('cars', e.target.value)}
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="motorcycles">Motorcycles (%)</label>
              <input
                type="number"
                id="motorcycles"
                value={formData.vehicleMix.motorcycles}
                onChange={(e) => handleVehicleMixChange('motorcycles', e.target.value)}
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="minibuses">Minibuses (%)</label>
              <input
                type="number"
                id="minibuses"
                value={formData.vehicleMix.minibuses}
                onChange={(e) => handleVehicleMixChange('minibuses', e.target.value)}
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="trucks">Trucks (%)</label>
              <input
                type="number"
                id="trucks"
                value={formData.vehicleMix.trucks}
                onChange={(e) => handleVehicleMixChange('trucks', e.target.value)}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
          {errors.vehicleMix && <span className="error-message">{errors.vehicleMix}</span>}
        </div>

        {/* Environmental Conditions */}
        <div className="form-section">
          <h3>Environmental Conditions</h3>

          <div className="form-group">
            <label htmlFor="weather">Weather</label>
            <select
              id="weather"
              value={formData.weather}
              onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
            >
              <option value="clear">Clear</option>
              <option value="rain">Rain</option>
              <option value="flood">Flood</option>
            </select>
          </div>
        </div>

        {/* Control Strategy */}
        <div className="form-section">
          <h3>Control Strategy</h3>

          <div className="form-group">
            <label htmlFor="controlStrategy">Signal Control Method</label>
            <select
              id="controlStrategy"
              value={formData.controlStrategy}
              onChange={(e) => setFormData({ ...formData, controlStrategy: e.target.value })}
            >
              <option value="fixed">Fixed Timing (Baseline)</option>
              <option value="lstm">LSTM Prediction-Enhanced</option>
              <option value="rf">Random Forest Prediction</option>
              <option value="dqn">DQN Reinforcement Learning</option>
              <option value="ppo">PPO Reinforcement Learning</option>
              <option value="marl">Multi-Agent RL (MARL)</option>
            </select>
            <small>
              {formData.controlStrategy === 'fixed' && 'Traditional fixed-timing signals (60s cycle)'}
              {formData.controlStrategy === 'lstm' && 'Uses LSTM neural network for traffic prediction'}
              {formData.controlStrategy === 'rf' && 'Uses Random Forest for traffic prediction'}
              {formData.controlStrategy === 'dqn' && 'Deep Q-Network adaptive signal control'}
              {formData.controlStrategy === 'ppo' && 'Proximal Policy Optimization adaptive control'}
              {formData.controlStrategy === 'marl' && 'Coordinated multi-intersection control'}
            </small>
          </div>
        </div>

        {/* Incidents */}
        <div className="form-section">
          <h3>Incidents</h3>
          <p className="section-description">Add traffic incidents to simulate disruptions</p>

          {formData.incidents.length > 0 && (
            <div className="incidents-list">
              {formData.incidents.map((incident, index) => (
                <div key={index} className="incident-item">
                  <div className="incident-info">
                    <strong>{incident.type}</strong> at {incident.location}
                    <br />
                    <small>
                      Starts at {Math.floor(incident.startTime / 60)}min, 
                      Duration: {Math.floor(incident.duration / 60)}min
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIncident(index)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showIncidentForm ? (
            <button
              type="button"
              onClick={() => setShowIncidentForm(true)}
              className="btn-secondary"
            >
              Add Incident
            </button>
          ) : (
            <div className="incident-form">
              <div className="form-group">
                <label>Incident Type</label>
                <select
                  value={currentIncident.type}
                  onChange={(e) => setCurrentIncident({ ...currentIncident, type: e.target.value })}
                >
                  <option value="accident">Accident</option>
                  <option value="roadwork">Roadwork</option>
                  <option value="breakdown">Vehicle Breakdown</option>
                  <option value="event">Special Event</option>
                </select>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={currentIncident.location}
                  onChange={(e) => setCurrentIncident({ ...currentIncident, location: e.target.value })}
                  placeholder="e.g., Vlissengen Road & Sheriff Street"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time (seconds)</label>
                  <input
                    type="number"
                    value={currentIncident.startTime}
                    onChange={(e) => setCurrentIncident({ ...currentIncident, startTime: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Duration (seconds)</label>
                  <input
                    type="number"
                    value={currentIncident.duration}
                    onChange={(e) => setCurrentIncident({ ...currentIncident, duration: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>

              <div className="incident-form-actions">
                <button type="button" onClick={addIncident} className="btn-primary">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowIncidentForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Create Simulation
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

export default SimulationConfig;
