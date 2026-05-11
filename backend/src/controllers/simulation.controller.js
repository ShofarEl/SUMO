import Simulation from '../models/Simulation.js';
import logger from '../utils/logger.js';
import { addSimulationJob, getJobStatus } from '../services/queue.service.js';
import pythonAIService from '../services/pythonAI.service.js';

/**
 * @desc    Create a new simulation
 * @route   POST /api/simulations
 * @access  Private (researcher, admin)
 */
export const createSimulation = async (req, res, next) => {
  try {
    const { name, description, config } = req.body;

    // Create simulation with user ID from authenticated user
    const simulation = await Simulation.create({
      name,
      description,
      userId: req.user._id,
      config,
      status: 'pending'
    });

    logger.info(`Simulation created: ${simulation._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    logger.error(`Error creating simulation: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all simulations with pagination and filtering
 * @route   GET /api/simulations
 * @access  Private
 */
export const getSimulations = async (req, res, next) => {
  try {
    const { page, limit, status, controlStrategy, sortBy, sortOrder } = req.query;

    // Build filter query
    const filter = {};
    
    // Users can only see their own simulations unless they're admin
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    if (status) {
      filter.status = status;
    }

    if (controlStrategy) {
      filter['config.controlStrategy'] = controlStrategy;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [simulations, total] = await Promise.all([
      Simulation.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .lean(),
      Simulation.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: simulations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching simulations: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get simulation by ID
 * @route   GET /api/simulations/:id
 * @access  Private
 */
export const getSimulationById = async (req, res, next) => {
  try {
    const simulation = await Simulation.findById(req.params.id)
      .populate('userId', 'firstName lastName email organization');

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_FOUND',
          message: 'Simulation not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to this simulation
    if (req.user.role !== 'admin' && simulation.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to access this simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(200).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    logger.error(`Error fetching simulation ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update simulation
 * @route   PUT /api/simulations/:id
 * @access  Private (owner or admin)
 */
export const updateSimulation = async (req, res, next) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_FOUND',
          message: 'Simulation not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to update this simulation
    if (req.user.role !== 'admin' && simulation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to update this simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Only allow updates if simulation is pending or failed
    if (simulation.status === 'running') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot update a running simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update allowed fields
    const { name, description } = req.body;
    if (name) simulation.name = name;
    if (description !== undefined) simulation.description = description;

    await simulation.save();

    logger.info(`Simulation updated: ${simulation._id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    logger.error(`Error updating simulation ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete simulation
 * @route   DELETE /api/simulations/:id
 * @access  Private (owner or admin)
 */
export const deleteSimulation = async (req, res, next) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_FOUND',
          message: 'Simulation not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to delete this simulation
    if (req.user.role !== 'admin' && simulation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to delete this simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Prevent deletion of running simulations
    if (simulation.status === 'running') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot delete a running simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    await simulation.deleteOne();

    logger.info(`Simulation deleted: ${req.params.id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Simulation deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting simulation ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Execute a simulation
 * @route   POST /api/simulations/:id/run
 * @access  Private (owner or admin)
 */
export const runSimulation = async (req, res, next) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_FOUND',
          message: 'Simulation not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to run this simulation
    if (req.user.role !== 'admin' && simulation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to run this simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if simulation is already running
    if (simulation.status === 'running') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Simulation is already running',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Prepare configuration for Python AI service
    const config = {
      simulation_id: simulation._id.toString(),
      traffic_demand: simulation.config.trafficDemand,
      vehicle_mix: {
        cars: simulation.config.vehicleMix.cars,
        motorcycles: simulation.config.vehicleMix.motorcycles,
        minibuses: simulation.config.vehicleMix.minibuses,
        trucks: simulation.config.vehicleMix.trucks
      },
      duration: simulation.config.duration,
      time_of_day: simulation.config.timeOfDay,
      weather: simulation.config.weather,
      incidents: simulation.config.incidents,
      control_strategy: simulation.config.controlStrategy
    };

    // Add job to queue
    const jobInfo = await addSimulationJob(simulation._id.toString(), config);

    logger.info(`Simulation ${simulation._id} queued for execution with job ID: ${jobInfo.jobId}`);

    res.status(202).json({
      success: true,
      message: 'Simulation queued for execution',
      data: {
        simulationId: simulation._id,
        jobId: jobInfo.jobId,
        status: jobInfo.status
      }
    });
  } catch (error) {
    logger.error(`Error running simulation ${req.params.id}: ${error.message}`);
    
    // Check if it's a service unavailable error
    if (error.message.includes('unavailable')) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Python AI service is currently unavailable',
          timestamp: new Date().toISOString()
        }
      });
    }

    next(error);
  }
};

/**
 * @desc    Get simulation status
 * @route   GET /api/simulations/:id/status
 * @access  Private (owner or admin)
 */
export const getSimulationStatus = async (req, res, next) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_FOUND',
          message: 'Simulation not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to this simulation
    if (req.user.role !== 'admin' && simulation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to access this simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build status response
    const statusResponse = {
      simulationId: simulation._id,
      status: simulation.status,
      startTime: simulation.startTime,
      endTime: simulation.endTime
    };

    // If simulation is running and has a jobId, get detailed status from Python service
    if (simulation.status === 'running' && simulation.jobId) {
      try {
        // Try to get status from Python AI service
        const pythonStatus = await pythonAIService.getSimulationStatus(simulation.jobId);
        statusResponse.pythonServiceStatus = pythonStatus;
        statusResponse.progress = pythonStatus.progress || 0;
        statusResponse.currentStep = pythonStatus.current_step || pythonStatus.currentStep;
      } catch (error) {
        logger.warn(`Could not get Python service status for simulation ${simulation._id}: ${error.message}`);
        // Continue with basic status
      }

      // Also try to get queue job status
      try {
        const queueJobId = `sim-${simulation._id}`;
        const jobStatus = await getJobStatus(queueJobId);
        statusResponse.queueStatus = jobStatus;
      } catch (error) {
        logger.warn(`Could not get queue status for simulation ${simulation._id}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      data: statusResponse
    });
  } catch (error) {
    logger.error(`Error getting simulation status ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get simulation results
 * @route   GET /api/simulations/:id/results
 * @access  Private (owner or admin)
 */
export const getSimulationResults = async (req, res, next) => {
  try {
    const simulation = await Simulation.findById(req.params.id)
      .populate('userId', 'firstName lastName email');

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SIMULATION_NOT_FOUND',
          message: 'Simulation not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has access to this simulation
    if (req.user.role !== 'admin' && simulation.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT',
          message: 'You do not have permission to access this simulation',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if simulation is completed
    if (simulation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: `Simulation is ${simulation.status}. Results are only available for completed simulations.`,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if results exist
    if (!simulation.results || Object.keys(simulation.results).length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESULTS_NOT_FOUND',
          message: 'Simulation results not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Optionally fetch detailed results from Python service if jobId exists
    let detailedResults = null;
    if (simulation.jobId) {
      try {
        const pythonResults = await pythonAIService.getSimulationResults(simulation.jobId);
        detailedResults = pythonResults;
      } catch (error) {
        logger.warn(`Could not fetch detailed results from Python service: ${error.message}`);
        // Continue with stored results
      }
    }

    res.status(200).json({
      success: true,
      data: {
        simulationId: simulation._id,
        name: simulation.name,
        description: simulation.description,
        config: simulation.config,
        status: simulation.status,
        startTime: simulation.startTime,
        endTime: simulation.endTime,
        duration: simulation.endTime && simulation.startTime 
          ? (new Date(simulation.endTime) - new Date(simulation.startTime)) / 1000 
          : null,
        results: simulation.results,
        detailedResults: detailedResults,
        user: {
          id: simulation.userId._id,
          name: `${simulation.userId.firstName} ${simulation.userId.lastName}`,
          email: simulation.userId.email
        }
      }
    });
  } catch (error) {
    logger.error(`Error getting simulation results ${req.params.id}: ${error.message}`);
    next(error);
  }
};
