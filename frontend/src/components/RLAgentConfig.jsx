import { useState } from 'react';
import './RLAgentConfig.css';

const RLAgentConfig = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    algorithm: initialData?.algorithm || 'dqn',
    intersectionIds: initialData?.intersectionIds || [''],
    isMultiAgent: initialData?.isMultiAgent || false,
    config: {
      stateSpace: {
        size: initialData?.config?.stateSpace?.size || 13,
        features: initialData?.config?.stateSpace?.features || [
          'queue_length',
          'waiting_time',
          'vehicle_count',
          'signal_phase'
        ]
      },
      actionSpace: {
        size: initialData?.config?.actionSpace?.size || 4,
        actions: initialData?.config?.actionSpace?.actions || [
          'extend_green',
          'switch_phase',
          'maintain',
          'early_switch'
        ]
      },
      rewardFunction: initialData?.config?.rewardFunction || 'delay_minimization',
      networkArchitecture: {
        hiddenLayers: initialData?.config?.networkArchitecture?.hiddenLayers || [128, 64],
        activation: initialData?.config?.networkArchitecture?.activation || 'relu'
      },
      hyperparameters: {
        learningRate: initialData?.config?.hyperparameters?.learningRate || 0.001,
        gamma: initialData?.config?.hyperparameters?.gamma || 0.99,
        epsilonStart: initialData?.config?.hyperparameters?.epsilonStart || 1.0,
        epsilonEnd: initialData?.config?.hyperparameters?.epsilonEnd || 0.01,
        epsilonDecay: initialData?.config?.hyperparameters?.epsilonDecay || 0.995,
        batchSize: initialData?.config?.hyperparameters?.batchSize || 64,
        replayBufferSize: initialData?.config?.hyperparameters?.replayBufferSize || 10000,
        targetUpdateFrequency: initialData?.config?.hyperparameters?.targetUpdateFrequency || 100,
        hiddenSize: initialData?.config?.hyperparameters?.hiddenSize || 128,
        // MARL-specific parameters
        enableCommunication: initialData?.config?.hyperparameters?.enableCommunication ?? true,
        communicationRadius: initialData?.config?.hyperparameters?.communicationRadius || 500.0,
        sharedReward: initialData?.config?.hyperparameters?.sharedReward ?? true,
        rewardWeights: initialData?.config?.hyperparameters?.rewardWeights || { local: 0.7, global: 0.3 },
        enableExperienceSharing: initialData?.config?.hyperparameters?.enableExperienceSharing ?? true
      }
    }
  });

  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const rewardFunctionOptions = [
    { value: 'delay_minimization', label: 'Delay Minimization', description: 'Minimize average vehicle delay' },
    { value: 'queue_minimization', label: 'Queue Minimization', description: 'Minimize queue lengths' },
    { value: 'throughput_maximization', label: 'Throughput Maximization', description: 'Maximize vehicles processed' },
    { value: 'balanced', label: 'Balanced', description: 'Balance delay, queue, and throughput' },
    { value: 'emissions_minimization', label: 'Emissions Minimization', description: 'Minimize CO2 emissions' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Agent name must be at least 3 characters';
    }

    if (formData.intersectionIds.length === 0 || formData.intersectionIds.every(id => !id.trim())) {
      newErrors.intersectionIds = 'At least one intersection ID is required';
    }

    if (formData.isMultiAgent && formData.intersectionIds.filter(id => id.trim()).length < 2) {
      newErrors.intersectionIds = 'Multi-agent mode requires at least 2 intersections';
    }

    // Validate hyperparameters
    const hp = formData.config.hyperparameters;
    if (hp.learningRate <= 0 || hp.learningRate > 1) {
      newErrors.learningRate = 'Learning rate must be between 0 and 1';
    }
    if (hp.gamma < 0 || hp.gamma > 1) {
      newErrors.gamma = 'Gamma must be between 0 and 1';
    }
    if (hp.batchSize < 1) {
      newErrors.batchSize = 'Batch size must be at least 1';
    }
    if (hp.replayBufferSize < hp.batchSize) {
      newErrors.replayBufferSize = 'Replay buffer must be larger than batch size';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Filter out empty intersection IDs
      const cleanedData = {
        ...formData,
        intersectionIds: formData.intersectionIds.filter(id => id.trim())
      };
      onSubmit(cleanedData);
    }
  };

  const addIntersection = () => {
    setFormData(prev => ({
      ...prev,
      intersectionIds: [...prev.intersectionIds, '']
    }));
  };

  const removeIntersection = (index) => {
    if (formData.intersectionIds.length > 1) {
      setFormData(prev => ({
        ...prev,
        intersectionIds: prev.intersectionIds.filter((_, i) => i !== index)
      }));
    }
  };

  const updateIntersection = (index, value) => {
    const newIds = [...formData.intersectionIds];
    newIds[index] = value;
    setFormData(prev => ({
      ...prev,
      intersectionIds: newIds
    }));
  };

  const updateHyperparameter = (key, value) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        hyperparameters: {
          ...prev.config.hyperparameters,
          [key]: value
        }
      }
    }));
  };

  const updateRewardWeights = (key, value) => {
    const numValue = parseFloat(value) || 0;
    const otherKey = key === 'local' ? 'global' : 'local';
    const otherValue = 1 - numValue;
    
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        hyperparameters: {
          ...prev.config.hyperparameters,
          rewardWeights: {
            [key]: numValue,
            [otherKey]: otherValue
          }
        }
      }
    }));
  };

  const loadPreset = (preset) => {
    const presets = {
      conservative: {
        learningRate: 0.0001,
        gamma: 0.95,
        epsilonDecay: 0.999,
        batchSize: 32
      },
      balanced: {
        learningRate: 0.001,
        gamma: 0.99,
        epsilonDecay: 0.995,
        batchSize: 64
      },
      aggressive: {
        learningRate: 0.01,
        gamma: 0.99,
        epsilonDecay: 0.99,
        batchSize: 128
      }
    };

    if (presets[preset]) {
      setFormData(prev => ({
        ...prev,
        config: {
          ...prev.config,
          hyperparameters: {
            ...prev.config.hyperparameters,
            ...presets[preset]
          }
        }
      }));
    }
  };

  return (
    <div className="rl-agent-config">
      <form onSubmit={handleSubmit} className="config-form">
        <h2>RL Agent Configuration</h2>

        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label htmlFor="name">Agent Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? 'error' : ''}
              placeholder="e.g., Georgetown DQN Controller"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="algorithm">Algorithm</label>
            <select
              id="algorithm"
              value={formData.algorithm}
              onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
            >
              <option value="dqn">DQN (Deep Q-Network)</option>
              <option value="ppo">PPO (Proximal Policy Optimization)</option>
              <option value="a3c">A3C (Asynchronous Advantage Actor-Critic)</option>
            </select>
            <small>
              {formData.algorithm === 'dqn' && 'Value-based RL with experience replay'}
              {formData.algorithm === 'ppo' && 'Policy gradient method with clipped objective'}
              {formData.algorithm === 'a3c' && 'Asynchronous actor-critic method'}
            </small>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isMultiAgent}
                onChange={(e) => setFormData({ ...formData, isMultiAgent: e.target.checked })}
              />
              <span className="checkbox-label">Multi-Agent Mode (MARL)</span>
            </label>
            <small>Enable coordination between multiple intersection agents</small>
          </div>
        </div>

        {/* Intersections */}
        <div className="form-section">
          <div className="section-header">
            <h3>Intersections</h3>
            <button type="button" onClick={addIntersection} className="btn-secondary btn-small">
              Add Intersection
            </button>
          </div>
          <p className="section-description">
            Specify intersection IDs to control
            {formData.isMultiAgent && ' (minimum 2 for multi-agent mode)'}
          </p>

          {errors.intersectionIds && (
            <span className="error-message">{errors.intersectionIds}</span>
          )}

          <div className="intersections-list">
            {formData.intersectionIds.map((id, index) => (
              <div key={index} className="intersection-item">
                <input
                  type="text"
                  value={id}
                  onChange={(e) => updateIntersection(index, e.target.value)}
                  placeholder={`Intersection ${index + 1} ID`}
                />
                {formData.intersectionIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIntersection(index)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reward Function */}
        <div className="form-section">
          <h3>Reward Function Design</h3>

          <div className="form-group">
            <label htmlFor="rewardFunction">Optimization Objective</label>
            <select
              id="rewardFunction"
              value={formData.config.rewardFunction}
              onChange={(e) => setFormData({
                ...formData,
                config: { ...formData.config, rewardFunction: e.target.value }
              })}
            >
              {rewardFunctionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>
              {rewardFunctionOptions.find(o => o.value === formData.config.rewardFunction)?.description}
            </small>
          </div>

          {formData.isMultiAgent && (
            <>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.config.hyperparameters.sharedReward}
                    onChange={(e) => updateHyperparameter('sharedReward', e.target.checked)}
                  />
                  <span className="checkbox-label">Shared Reward</span>
                </label>
                <small>Agents receive both local and global rewards</small>
              </div>

              {formData.config.hyperparameters.sharedReward && (
                <div className="form-group">
                  <label htmlFor="rewardWeights">
                    Reward Balance (Local: {(formData.config.hyperparameters.rewardWeights.local * 100).toFixed(0)}% / 
                    Global: {(formData.config.hyperparameters.rewardWeights.global * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    id="rewardWeights"
                    value={formData.config.hyperparameters.rewardWeights.local}
                    onChange={(e) => updateRewardWeights('local', e.target.value)}
                    min="0"
                    max="1"
                    step="0.1"
                  />
                  <small>Balance between local intersection and global network performance</small>
                </div>
              )}
            </>
          )}
        </div>

        {/* Network Architecture */}
        <div className="form-section">
          <h3>Network Architecture</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stateSize">State Space Size</label>
              <input
                type="number"
                id="stateSize"
                value={formData.config.stateSpace.size}
                onChange={(e) => setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    stateSpace: { ...formData.config.stateSpace, size: parseInt(e.target.value) || 13 }
                  }
                })}
                min="1"
              />
              <small>Number of state features</small>
            </div>

            <div className="form-group">
              <label htmlFor="actionSize">Action Space Size</label>
              <input
                type="number"
                id="actionSize"
                value={formData.config.actionSpace.size}
                onChange={(e) => setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    actionSpace: { ...formData.config.actionSpace, size: parseInt(e.target.value) || 4 }
                  }
                })}
                min="1"
              />
              <small>Number of possible actions</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hiddenSize">Hidden Layer Size</label>
            <input
              type="number"
              id="hiddenSize"
              value={formData.config.hyperparameters.hiddenSize}
              onChange={(e) => updateHyperparameter('hiddenSize', parseInt(e.target.value) || 128)}
              min="16"
              max="512"
              step="16"
            />
            <small>Number of neurons in hidden layers</small>
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="form-section">
          <div className="section-header">
            <h3>Hyperparameters</h3>
            <div className="preset-buttons">
              <button type="button" onClick={() => loadPreset('conservative')} className="btn-preset">
                Conservative
              </button>
              <button type="button" onClick={() => loadPreset('balanced')} className="btn-preset">
                Balanced
              </button>
              <button type="button" onClick={() => loadPreset('aggressive')} className="btn-preset">
                Aggressive
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="learningRate">Learning Rate</label>
              <input
                type="number"
                id="learningRate"
                value={formData.config.hyperparameters.learningRate}
                onChange={(e) => updateHyperparameter('learningRate', parseFloat(e.target.value) || 0.001)}
                min="0.00001"
                max="1"
                step="0.0001"
                className={errors.learningRate ? 'error' : ''}
              />
              {errors.learningRate && <span className="error-message">{errors.learningRate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="gamma">Discount Factor (γ)</label>
              <input
                type="number"
                id="gamma"
                value={formData.config.hyperparameters.gamma}
                onChange={(e) => updateHyperparameter('gamma', parseFloat(e.target.value) || 0.99)}
                min="0"
                max="1"
                step="0.01"
                className={errors.gamma ? 'error' : ''}
              />
              {errors.gamma && <span className="error-message">{errors.gamma}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="batchSize">Batch Size</label>
              <input
                type="number"
                id="batchSize"
                value={formData.config.hyperparameters.batchSize}
                onChange={(e) => updateHyperparameter('batchSize', parseInt(e.target.value) || 64)}
                min="1"
                max="512"
                className={errors.batchSize ? 'error' : ''}
              />
              {errors.batchSize && <span className="error-message">{errors.batchSize}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="replayBufferSize">Replay Buffer Size</label>
              <input
                type="number"
                id="replayBufferSize"
                value={formData.config.hyperparameters.replayBufferSize}
                onChange={(e) => updateHyperparameter('replayBufferSize', parseInt(e.target.value) || 10000)}
                min="100"
                max="100000"
                step="100"
                className={errors.replayBufferSize ? 'error' : ''}
              />
              {errors.replayBufferSize && <span className="error-message">{errors.replayBufferSize}</span>}
            </div>
          </div>

          {/* Advanced Parameters */}
          <div className="advanced-section">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-toggle-advanced"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Parameters
            </button>

            {showAdvanced && (
              <div className="advanced-params">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="epsilonStart">Epsilon Start</label>
                    <input
                      type="number"
                      id="epsilonStart"
                      value={formData.config.hyperparameters.epsilonStart}
                      onChange={(e) => updateHyperparameter('epsilonStart', parseFloat(e.target.value) || 1.0)}
                      min="0"
                      max="1"
                      step="0.1"
                    />
                    <small>Initial exploration rate</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="epsilonEnd">Epsilon End</label>
                    <input
                      type="number"
                      id="epsilonEnd"
                      value={formData.config.hyperparameters.epsilonEnd}
                      onChange={(e) => updateHyperparameter('epsilonEnd', parseFloat(e.target.value) || 0.01)}
                      min="0"
                      max="1"
                      step="0.01"
                    />
                    <small>Final exploration rate</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="epsilonDecay">Epsilon Decay</label>
                    <input
                      type="number"
                      id="epsilonDecay"
                      value={formData.config.hyperparameters.epsilonDecay}
                      onChange={(e) => updateHyperparameter('epsilonDecay', parseFloat(e.target.value) || 0.995)}
                      min="0.9"
                      max="1"
                      step="0.001"
                    />
                    <small>Exploration decay rate</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="targetUpdateFrequency">Target Update Frequency</label>
                    <input
                      type="number"
                      id="targetUpdateFrequency"
                      value={formData.config.hyperparameters.targetUpdateFrequency}
                      onChange={(e) => updateHyperparameter('targetUpdateFrequency', parseInt(e.target.value) || 100)}
                      min="1"
                      max="1000"
                    />
                    <small>Steps between target network updates</small>
                  </div>
                </div>

                {formData.isMultiAgent && (
                  <>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={formData.config.hyperparameters.enableCommunication}
                          onChange={(e) => updateHyperparameter('enableCommunication', e.target.checked)}
                        />
                        <span className="checkbox-label">Enable Agent Communication</span>
                      </label>
                      <small>Allow agents to share state information</small>
                    </div>

                    {formData.config.hyperparameters.enableCommunication && (
                      <div className="form-group">
                        <label htmlFor="communicationRadius">Communication Radius (meters)</label>
                        <input
                          type="number"
                          id="communicationRadius"
                          value={formData.config.hyperparameters.communicationRadius}
                          onChange={(e) => updateHyperparameter('communicationRadius', parseFloat(e.target.value) || 500.0)}
                          min="0"
                          step="50"
                        />
                        <small>Maximum distance for agent communication</small>
                      </div>
                    )}

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={formData.config.hyperparameters.enableExperienceSharing}
                          onChange={(e) => updateHyperparameter('enableExperienceSharing', e.target.checked)}
                        />
                        <span className="checkbox-label">Enable Experience Sharing</span>
                      </label>
                      <small>Share learning experiences between agents</small>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Create Agent
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

export default RLAgentConfig;
       