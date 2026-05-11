import axios from 'axios';
import logger from '../utils/logger.js';
import { createRequestSignature } from '../middleware/apiKey.js';

const PYTHON_AI_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';
const PYTHON_AI_API_KEY = process.env.PYTHON_AI_API_KEY;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);

/**
 * Python AI Service client
 */
class PythonAIService {
  constructor() {
    this.client = axios.create({
      baseURL: PYTHON_AI_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for authentication and logging
    this.client.interceptors.request.use(
      (config) => {
        // Add API key if configured
        if (PYTHON_AI_API_KEY) {
          config.headers['X-API-Key'] = PYTHON_AI_API_KEY;
        }

        // Add request signature if inter-service secret is configured
        if (process.env.INTER_SERVICE_SECRET) {
          try {
            const body = config.data ? JSON.stringify(config.data) : '';
            const signatureHeaders = createRequestSignature(
              config.method.toUpperCase(),
              config.url,
              body
            );
            Object.assign(config.headers, signatureHeaders);
          } catch (error) {
            logger.warn(`Failed to create request signature: ${error.message}`);
          }
        }

        logger.debug(`Python AI Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`Python AI Request Error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Python AI Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`Python AI Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
        } else if (error.request) {
          logger.error(`Python AI No Response: ${error.message}`);
        } else {
          logger.error(`Python AI Error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if Python AI service is available
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Python AI service unavailable: ${error.message}`);
    }
  }

  /**
   * Run a SUMO simulation
   * @param {Object} simulationConfig - Simulation configuration
   * @returns {Promise<Object>} Job information with jobId
   */
  async runSimulation(simulationConfig) {
    try {
      const response = await this.client.post('/api/sumo/run', simulationConfig);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.message || 'Failed to start simulation');
      }
      throw new Error(`Failed to communicate with Python AI service: ${error.message}`);
    }
  }

  /**
   * Get simulation job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status information
   */
  async getSimulationStatus(jobId) {
    try {
      const response = await this.client.get(`/api/sumo/status/${jobId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Simulation job not found');
      }
      throw new Error(`Failed to get simulation status: ${error.message}`);
    }
  }

  /**
   * Get simulation results
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Simulation results
   */
  async getSimulationResults(jobId) {
    try {
      const response = await this.client.get(`/api/sumo/results/${jobId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Simulation results not found');
      }
      throw new Error(`Failed to get simulation results: ${error.message}`);
    }
  }

  /**
   * Train LSTM model
   * @param {Object} trainingConfig - Training configuration
   * @returns {Promise<Object>} Training job information
   */
  async trainLSTM(trainingConfig) {
    try {
      const response = await this.client.post('/api/ml/lstm/train', trainingConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to start LSTM training: ${error.message}`);
    }
  }

  /**
   * Get LSTM prediction
   * @param {Object} predictionInput - Prediction input data
   * @returns {Promise<Object>} Prediction results
   */
  async predictLSTM(predictionInput) {
    try {
      const response = await this.client.post('/api/ml/lstm/predict', predictionInput);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get LSTM prediction: ${error.message}`);
    }
  }

  /**
   * Train Random Forest model
   * @param {Object} trainingConfig - Training configuration
   * @returns {Promise<Object>} Training job information
   */
  async trainRandomForest(trainingConfig) {
    try {
      const response = await this.client.post('/api/ml/rf/train', trainingConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to start Random Forest training: ${error.message}`);
    }
  }

  /**
   * Get Random Forest prediction
   * @param {Object} predictionInput - Prediction input data
   * @returns {Promise<Object>} Prediction results
   */
  async predictRandomForest(predictionInput) {
    try {
      const response = await this.client.post('/api/ml/rf/predict', predictionInput);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Random Forest prediction: ${error.message}`);
    }
  }

  /**
   * Create DQN agent
   * @param {Object} agentConfig - Agent configuration
   * @returns {Promise<Object>} Agent information
   */
  async createDQNAgent(agentConfig) {
    try {
      const response = await this.client.post('/api/rl/dqn/create', agentConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create DQN agent: ${error.message}`);
    }
  }

  /**
   * Train DQN agent
   * @param {Object} trainingConfig - Training configuration
   * @returns {Promise<Object>} Training job information
   */
  async trainDQNAgent(trainingConfig) {
    try {
      const response = await this.client.post('/api/rl/dqn/train', trainingConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to start DQN training: ${error.message}`);
    }
  }

  /**
   * Evaluate model accuracy
   * @param {string} modelName - Name of the model to evaluate
   * @param {Array} testData - Test input data
   * @param {Array} actualValues - Actual target values
   * @returns {Promise<Object>} Evaluation results with metrics
   */
  async evaluateModel(modelName, testData, actualValues) {
    try {
      const response = await this.client.post(`/api/ml/evaluate/${modelName}`, {
        test_data: testData,
        actual_values: actualValues
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Model '${modelName}' not found`);
      }
      throw new Error(`Failed to evaluate model: ${error.message}`);
    }
  }

  /**
   * Compare multiple models
   * @param {Array} testData - Test input data
   * @param {Array} actualValues - Actual target values
   * @param {Array} modelNames - List of model names to compare
   * @returns {Promise<Object>} Comparison results
   */
  async compareModels(testData, actualValues, modelNames) {
    try {
      const response = await this.client.post('/api/ml/compare', {
        test_data: testData,
        actual_values: actualValues,
        model_names: modelNames
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to compare models: ${error.message}`);
    }
  }

  /**
   * Get list of available models
   * @returns {Promise<Object>} List of models
   */
  async getModels() {
    try {
      const response = await this.client.get('/api/ml/models');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get models: ${error.message}`);
    }
  }

  /**
   * Get model information
   * @param {string} modelName - Name of the model
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo(modelName) {
    try {
      const response = await this.client.get(`/api/ml/models/${modelName}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Model '${modelName}' not found`);
      }
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  /**
   * Create MARL system
   * @param {Object} marlConfig - MARL system configuration
   * @returns {Promise<Object>} MARL system information
   */
  async createMARLSystem(marlConfig) {
    try {
      const response = await this.client.post('/api/rl/marl/create', marlConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create MARL system: ${error.message}`);
    }
  }

  /**
   * Train MARL system
   * @param {Object} trainingConfig - Training configuration
   * @returns {Promise<Object>} Training job information
   */
  async trainMARLSystem(trainingConfig) {
    try {
      const response = await this.client.post('/api/rl/marl/train', trainingConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to start MARL training: ${error.message}`);
    }
  }

  /**
   * Get MARL training status
   * @param {string} jobId - Training job ID
   * @returns {Promise<Object>} Training status
   */
  async getMARLTrainingStatus(jobId) {
    try {
      const response = await this.client.get(`/api/rl/marl/train/status/${jobId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('MARL training job not found');
      }
      throw new Error(`Failed to get MARL training status: ${error.message}`);
    }
  }

  /**
   * Evaluate MARL system
   * @param {Object} evaluationConfig - Evaluation configuration
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateMARLSystem(evaluationConfig) {
    try {
      const response = await this.client.post('/api/rl/marl/evaluate', evaluationConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to evaluate MARL system: ${error.message}`);
    }
  }

  /**
   * Delete MARL system
   * @param {string} marlId - MARL system ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteMARLSystem(marlId) {
    try {
      const response = await this.client.delete(`/api/rl/marl/systems/${marlId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('MARL system not found');
      }
      throw new Error(`Failed to delete MARL system: ${error.message}`);
    }
  }

  /**
   * Delete DQN agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteDQNAgent(agentId) {
    try {
      const response = await this.client.delete(`/api/rl/agents/${agentId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('DQN agent not found');
      }
      throw new Error(`Failed to delete DQN agent: ${error.message}`);
    }
  }

  /**
   * Get DQN agent policy
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Agent policy information
   */
  async getDQNAgentPolicy(agentId) {
    try {
      const response = await this.client.get(`/api/rl/agents/${agentId}/policy`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('DQN agent not found');
      }
      throw new Error(`Failed to get agent policy: ${error.message}`);
    }
  }

  /**
   * Get DQN training status
   * @param {string} jobId - Training job ID
   * @returns {Promise<Object>} Training status
   */
  async getDQNTrainingStatus(jobId) {
    try {
      const response = await this.client.get(`/api/rl/dqn/train/status/${jobId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('DQN training job not found');
      }
      throw new Error(`Failed to get DQN training status: ${error.message}`);
    }
  }

  /**
   * Evaluate DQN agent
   * @param {Object} evaluationConfig - Evaluation configuration
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateDQNAgent(evaluationConfig) {
    try {
      const response = await this.client.post('/api/rl/dqn/evaluate', evaluationConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to evaluate DQN agent: ${error.message}`);
    }
  }

  /**
   * List models with optional filtering
   * @param {string} modelType - Filter by model type (optional)
   * @param {boolean} isDeployed - Filter by deployment status (optional)
   * @returns {Promise<Object>} List of models
   */
  async listModels(modelType, isDeployed) {
    try {
      const params = {};
      if (modelType) params.model_type = modelType;
      if (isDeployed !== undefined) params.is_deployed = isDeployed;
      
      const response = await this.client.get('/api/ml/models', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  /**
   * Get model versions
   * @param {string} modelName - Name of the model
   * @param {string} modelType - Type of model
   * @returns {Promise<Object>} List of model versions
   */
  async getModelVersions(modelName, modelType) {
    try {
      const response = await this.client.get(`/api/ml/models/versions/${modelName}/${modelType}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get model versions: ${error.message}`);
    }
  }

  /**
   * Deploy a model
   * @param {string} modelId - Model ID to deploy
   * @param {string} deployedBy - User ID who is deploying
   * @returns {Promise<Object>} Deployment status
   */
  async deployModel(modelId, deployedBy) {
    try {
      const response = await this.client.post(`/api/ml/models/${modelId}/deploy`, {
        deployed_by: deployedBy
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to deploy model: ${error.message}`);
    }
  }

  /**
   * Undeploy a model
   * @param {string} modelId - Model ID to undeploy
   * @param {string} undeployedBy - User ID who is undeploying
   * @returns {Promise<Object>} Undeployment status
   */
  async undeployModel(modelId, undeployedBy) {
    try {
      const response = await this.client.post(`/api/ml/models/${modelId}/undeploy`, {
        undeployed_by: undeployedBy
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to undeploy model: ${error.message}`);
    }
  }

  /**
   * Delete a model
   * @param {string} modelId - Model ID to delete
   * @returns {Promise<Object>} Deletion status
   */
  async deleteModel(modelId) {
    try {
      const response = await this.client.delete(`/api/ml/models/${modelId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete model: ${error.message}`);
    }
  }

  /**
   * Compare model versions
   * @param {string} modelName - Name of the model
   * @param {string} modelType - Type of model
   * @param {string} metric - Metric to compare (rmse, mae, r2_score)
   * @returns {Promise<Object>} Comparison results
   */
  async compareModelVersions(modelName, modelType, metric = 'rmse') {
    try {
      const response = await this.client.get(`/api/ml/models/compare/${modelName}/${modelType}`, {
        params: { metric }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to compare model versions: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    try {
      const response = await this.client.get('/api/ml/storage/stats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new PythonAIService();
