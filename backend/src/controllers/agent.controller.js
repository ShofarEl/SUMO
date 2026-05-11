import RLAgent from '../models/RLAgent.js';
import logger from '../utils/logger.js';
import pythonAIService from '../services/pythonAI.service.js';

/**
 * @desc    Create a new RL agent
 * @route   POST /api/agents
 * @access  Private (researcher, admin)
 */
export const createAgent = async (req, res, next) => {
  try {
    const { name, algorithm, intersectionIds, isMultiAgent, config } = req.body;

    // Create agent in database
    const agent = await RLAgent.create({
      name,
      algorithm,
      intersectionIds,
      isMultiAgent,
      trainedBy: req.user._id,
      config,
      trainingStatus: 'not_started'
    });

    // Create agent in Python AI service based on algorithm
    try {
      let pythonResponse;
      
      if (isMultiAgent && algorithm === 'dqn') {
        // Create MARL system
        pythonResponse = await pythonAIService.createMARLSystem({
          name: name,
          intersection_ids: intersectionIds,
          enable_communication: config.hyperparameters?.enableCommunication ?? true,
          communication_radius: config.hyperparameters?.communicationRadius ?? 500.0,
          shared_reward: config.hyperparameters?.sharedReward ?? true,
          reward_weights: config.hyperparameters?.rewardWeights ?? { local: 0.7, global: 0.3 },
          learning_rate: config.hyperparameters?.learningRate ?? 0.001,
          enable_experience_sharing: config.hyperparameters?.enableExperienceSharing ?? true
        });
        
        // Store Python service ID
        agent.policyPath = pythonResponse.marl_id;
      } else if (algorithm === 'dqn') {
        // Create single DQN agent
        pythonResponse = await pythonAIService.createDQNAgent({
          name: name,
          intersection_id: intersectionIds[0],
          state_size: config.stateSpace?.size ?? 13,
          action_size: config.actionSpace?.size ?? 4,
          hidden_size: config.hyperparameters?.hiddenSize ?? 128,
          learning_rate: config.hyperparameters?.learningRate ?? 0.001,
          gamma: config.hyperparameters?.gamma ?? 0.99,
          epsilon_start: config.hyperparameters?.epsilonStart ?? 1.0,
          epsilon_end: config.hyperparameters?.epsilonEnd ?? 0.01,
          epsilon_decay: config.hyperparameters?.epsilonDecay ?? 0.995,
          replay_buffer_size: config.hyperparameters?.replayBufferSize ?? 10000,
          batch_size: config.hyperparameters?.batchSize ?? 64,
          target_update_frequency: config.hyperparameters?.targetUpdateFrequency ?? 100
        });
        
        // Store Python service ID
        agent.policyPath = pythonResponse.agent_id;
      }
      
      await agent.save();
    } catch (pythonError) {
      logger.warn(`Failed to create agent in Python service: ${pythonError.message}`);
      // Continue - agent created in DB but not in Python service yet
    }

    logger.info(`RL agent created: ${agent._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error) {
    logger.error(`Error creating RL agent: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all RL agents with pagination and filtering
 * @route   GET /api/agents
 * @access  Private
 */
export const getAgents = async (req, res, next) => {
  try {
    const { page, limit, algorithm, trainingStatus, isDeployed, sortBy, sortOrder } = req.query;

    // Build filter query
    const filter = {};
    
    // Users can only see their own agents unless they're admin
    if (req.user.role !== 'admin') {
      filter.trainedBy = req.user._id;
    }

    if (algorithm) {
      filter.algorithm = algorithm;
    }

    if (trainingStatus) {
      filter.trainingStatus = trainingStatus;
    }

    if (isDeployed !== undefined) {
      filter.isDeployed = isDeployed;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [agents, total] = await Promise.all([
      RLAgent.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('trainedBy', 'firstName lastName email')
        .lean(),
      RLAgent.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching RL agents: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get RL agent by ID
 * @route   GET /api/agents/:id
 * @access  Private
 */
export const getAgentById = async (req, res, next) => {
  try {
    const agent = await RLAgent.findById(req.params.id)
      .populate('trainedBy', 'firstName lastName email organization');

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'RL agent not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to this agent
    if (req.user.role !== 'admin' && agent.trainedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to access this agent',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    logger.error(`Error fetching RL agent ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update RL agent
 * @route   PUT /api/agents/:id
 * @access  Private (owner or admin)
 */
export const updateAgent = async (req, res, next) => {
  try {
    const agent = await RLAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'RL agent not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to update this agent
    if (req.user.role !== 'admin' && agent.trainedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to update this agent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Only allow updates if agent is not currently training
    if (agent.trainingStatus === 'training') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot update an agent that is currently training',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update allowed fields
    const { name, isDeployed } = req.body;
    if (name) agent.name = name;
    if (isDeployed !== undefined) agent.isDeployed = isDeployed;

    await agent.save();

    logger.info(`RL agent updated: ${agent._id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    logger.error(`Error updating RL agent ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete RL agent
 * @route   DELETE /api/agents/:id
 * @access  Private (owner or admin)
 */
export const deleteAgent = async (req, res, next) => {
  try {
    const agent = await RLAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'RL agent not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to delete this agent
    if (req.user.role !== 'admin' && agent.trainedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to delete this agent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Prevent deletion of agents that are currently training
    if (agent.trainingStatus === 'training') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot delete an agent that is currently training',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Try to delete from Python service
    if (agent.policyPath) {
      try {
        if (agent.isMultiAgent) {
          await pythonAIService.deleteMARLSystem(agent.policyPath);
        } else {
          await pythonAIService.deleteDQNAgent(agent.policyPath);
        }
      } catch (pythonError) {
        logger.warn(`Failed to delete agent from Python service: ${pythonError.message}`);
        // Continue with database deletion
      }
    }

    await agent.deleteOne();

    logger.info(`RL agent deleted: ${req.params.id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'RL agent deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting RL agent ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Train an RL agent
 * @route   POST /api/agents/:id/train
 * @access  Private (owner or admin)
 */
export const trainAgent = async (req, res, next) => {
  try {
    const agent = await RLAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'RL agent not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to train this agent
    if (req.user.role !== 'admin' && agent.trainedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to train this agent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if agent is already training
    if (agent.trainingStatus === 'training') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Agent is already training',
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      networkFile,
      routeFile,
      numEpisodes = 100,
      maxStepsPerEpisode = 3600,
      evaluationFrequency = 50,
      saveFrequency = 10
    } = req.body;

    // Validate required fields
    if (!networkFile || !routeFile) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Network file and route file are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update agent status
    agent.trainingStatus = 'training';
    agent.trainingProgress = {
      currentEpisode: 0,
      totalEpisodes: numEpisodes,
      currentReward: 0,
      bestReward: -Infinity,
      avgDelay: 0,
      convergenceMetric: 0
    };
    await agent.save();

    // Start training in Python AI service
    let trainingResponse;
    
    try {
      if (agent.isMultiAgent) {
        // Train MARL system
        trainingResponse = await pythonAIService.trainMARLSystem({
          marl_id: agent.policyPath,
          network_file: networkFile,
          route_file: routeFile,
          num_episodes: numEpisodes,
          max_steps_per_episode: maxStepsPerEpisode,
          evaluation_frequency: evaluationFrequency,
          save_frequency: saveFrequency
        });
      } else {
        // Train single DQN agent
        trainingResponse = await pythonAIService.trainDQNAgent({
          agent_id: agent.policyPath,
          network_file: networkFile,
          route_file: routeFile,
          num_episodes: numEpisodes,
          max_steps_per_episode: maxStepsPerEpisode,
          save_frequency: saveFrequency
        });
      }

      // Store job ID for tracking
      agent.policyPath = agent.policyPath || trainingResponse.job_id;
      await agent.save();

      logger.info(`Training started for agent ${agent._id}, job ID: ${trainingResponse.job_id}`);

      res.status(202).json({
        success: true,
        message: 'Training started',
        data: {
          agentId: agent._id,
          jobId: trainingResponse.job_id,
          status: trainingResponse.status
        }
      });
    } catch (pythonError) {
      // Revert agent status on failure
      agent.trainingStatus = 'failed';
      await agent.save();
      
      logger.error(`Failed to start training for agent ${agent._id}: ${pythonError.message}`);
      
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Failed to start training: ${pythonError.message}`,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    logger.error(`Error training agent ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get agent training status
 * @route   GET /api/agents/:id/training-status
 * @access  Private (owner or admin)
 */
export const getTrainingStatus = async (req, res, next) => {
  try {
    const agent = await RLAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'RL agent not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to this agent
    if (req.user.role !== 'admin' && agent.trainedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to access this agent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build status response
    const statusResponse = {
      agentId: agent._id,
      name: agent.name,
      algorithm: agent.algorithm,
      trainingStatus: agent.trainingStatus,
      trainingProgress: agent.trainingProgress,
      isMultiAgent: agent.isMultiAgent
    };

    // If agent is training and has a job ID, get detailed status from Python service
    if (agent.trainingStatus === 'training' && agent.policyPath) {
      try {
        let pythonStatus;
        
        if (agent.isMultiAgent) {
          pythonStatus = await pythonAIService.getMARLTrainingStatus(agent.policyPath);
        } else {
          pythonStatus = await pythonAIService.getDQNTrainingStatus(agent.policyPath);
        }

        // Update agent progress from Python service
        if (pythonStatus.status === 'completed') {
          agent.trainingStatus = 'completed';
          await agent.save();
        } else if (pythonStatus.status === 'failed') {
          agent.trainingStatus = 'failed';
          await agent.save();
        }

        // Update training progress
        if (pythonStatus.latest_metrics) {
          agent.trainingProgress.currentEpisode = pythonStatus.current_episode;
          agent.trainingProgress.currentReward = pythonStatus.latest_metrics.total_reward || pythonStatus.latest_metrics.global_reward;
          agent.trainingProgress.avgDelay = pythonStatus.latest_metrics.average_delay;
          await agent.save();
        }

        statusResponse.pythonServiceStatus = pythonStatus;
        statusResponse.latestMetrics = pythonStatus.latest_metrics;
        statusResponse.coordinationMetrics = pythonStatus.coordination_metrics;
      } catch (pythonError) {
        logger.warn(`Could not get Python service status for agent ${agent._id}: ${pythonError.message}`);
        // Continue with basic status
      }
    }

    res.status(200).json({
      success: true,
      data: statusResponse
    });
  } catch (error) {
    logger.error(`Error getting training status for agent ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Deploy an RL agent
 * @route   POST /api/agents/:id/deploy
 * @access  Private (owner or admin)
 */
export const deployAgent = async (req, res, next) => {
  try {
    const agent = await RLAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'RL agent not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to deploy this agent
    if (req.user.role !== 'admin' && agent.trainedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to deploy this agent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if agent training is completed
    if (agent.trainingStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: `Cannot deploy agent with training status: ${agent.trainingStatus}. Agent must be trained first.`,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if agent is already deployed
    if (agent.isDeployed) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Agent is already deployed',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Mark agent as deployed
    agent.isDeployed = true;
    await agent.save();

    logger.info(`Agent ${agent._id} deployed by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Agent deployed successfully',
      data: {
        agentId: agent._id,
        name: agent.name,
        isDeployed: agent.isDeployed,
        algorithm: agent.algorithm,
        intersectionIds: agent.intersectionIds
      }
    });
  } catch (error) {
    logger.error(`Error deploying agent ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get agent performance metrics
 * @route   GET /api/agents/:id/performance
 * @access  Private (owner or admin)
 */
export const getAgentPerformance = async (req, res, next) => {
  try {
    const agent = await RLAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'RL agent not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to this agent
    if (req.user.role !== 'admin' && agent.trainedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to access this agent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if agent has been trained
    if (agent.trainingStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Agent has not completed training yet',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get evaluation configuration from query params
    const {
      networkFile,
      routeFile,
      numEpisodes = 10
    } = req.query;

    // Build performance response
    const performanceResponse = {
      agentId: agent._id,
      name: agent.name,
      algorithm: agent.algorithm,
      isMultiAgent: agent.isMultiAgent,
      intersectionIds: agent.intersectionIds,
      trainingStatus: agent.trainingStatus,
      performance: agent.performance || {},
      trainingProgress: agent.trainingProgress
    };

    // If evaluation parameters provided, run fresh evaluation
    if (networkFile && routeFile && agent.policyPath) {
      try {
        let evaluationResults;

        if (agent.isMultiAgent) {
          // Evaluate MARL system
          evaluationResults = await pythonAIService.evaluateMARLSystem({
            marl_id: agent.policyPath,
            network_file: networkFile,
            route_file: routeFile,
            num_episodes: parseInt(numEpisodes)
          });

          performanceResponse.evaluationResults = {
            globalMetrics: evaluationResults.global_metrics,
            agentMetrics: evaluationResults.agent_metrics,
            coordinationMetrics: evaluationResults.coordination_metrics
          };
        } else {
          // Evaluate single DQN agent
          evaluationResults = await pythonAIService.evaluateDQNAgent({
            agent_id: agent.policyPath,
            network_file: networkFile,
            route_file: routeFile,
            num_episodes: parseInt(numEpisodes)
          });

          performanceResponse.evaluationResults = evaluationResults.metrics;
        }

        // Update stored performance metrics
        if (evaluationResults) {
          agent.performance = {
            delayReduction: evaluationResults.metrics?.delay_reduction || 
                           evaluationResults.global_metrics?.delay_reduction,
            queueReduction: evaluationResults.metrics?.queue_reduction || 
                           evaluationResults.global_metrics?.queue_reduction,
            throughputIncrease: evaluationResults.metrics?.throughput_increase || 
                               evaluationResults.global_metrics?.throughput_increase,
            fuelSavings: evaluationResults.metrics?.fuel_savings || 
                        evaluationResults.global_metrics?.fuel_savings,
            emissionsReduction: evaluationResults.metrics?.emissions_reduction || 
                               evaluationResults.global_metrics?.emissions_reduction
          };
          await agent.save();
        }

        logger.info(`Fresh evaluation completed for agent ${agent._id}`);
      } catch (pythonError) {
        logger.warn(`Could not evaluate agent from Python service: ${pythonError.message}`);
        performanceResponse.evaluationError = pythonError.message;
      }
    }

    // Try to get policy information from Python service
    if (agent.policyPath) {
      try {
        const policyInfo = await pythonAIService.getDQNAgentPolicy(agent.policyPath);
        performanceResponse.policyInfo = {
          policyPath: policyInfo.policy_path,
          trainingHistory: policyInfo.training_history,
          convergenceMetrics: policyInfo.convergence_metrics
        };
      } catch (pythonError) {
        logger.warn(`Could not get policy info from Python service: ${pythonError.message}`);
      }
    }

    res.status(200).json({
      success: true,
      data: performanceResponse
    });
  } catch (error) {
    logger.error(`Error getting agent performance ${req.params.id}: ${error.message}`);
    next(error);
  }
};
