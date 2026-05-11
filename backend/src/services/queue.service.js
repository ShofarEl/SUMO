import Queue from 'bull';
import logger from '../utils/logger.js';
import pythonAIService from './pythonAI.service.js';
import Simulation from '../models/Simulation.js';
import { emitSimulationUpdate } from './websocket.service.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Simulation job queue
 */
export const simulationQueue = new Queue('simulation', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

/**
 * Process simulation jobs
 */
simulationQueue.process(async (job) => {
  const { simulationId, config } = job.data;

  logger.info(`Processing simulation job ${job.id} for simulation ${simulationId}`);

  try {
    // Update simulation status to running
    await Simulation.findByIdAndUpdate(simulationId, {
      status: 'running',
      startTime: new Date()
    });

    // Emit WebSocket update
    emitSimulationUpdate(simulationId, {
      status: 'running',
      message: 'Simulation started'
    });

    // Call Python AI service to run simulation
    const response = await pythonAIService.runSimulation(config);

    // Store the Python service job ID
    await Simulation.findByIdAndUpdate(simulationId, {
      jobId: response.job_id || response.jobId
    });

    logger.info(`Simulation ${simulationId} started with Python job ID: ${response.job_id || response.jobId}`);

    // Poll for completion (this is a simplified approach)
    // In production, you might want to use webhooks or separate polling jobs
    const pythonJobId = response.job_id || response.jobId;
    let completed = false;
    let attempts = 0;
    const maxAttempts = 600; // 10 minutes with 1-second intervals

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      try {
        const status = await pythonAIService.getSimulationStatus(pythonJobId);
        
        // Emit progress update via WebSocket
        if (status.progress !== undefined) {
          emitSimulationUpdate(simulationId, {
            status: 'running',
            progress: status.progress,
            currentStep: status.current_step || status.currentStep,
            message: status.message || 'Simulation in progress'
          });
        }
        
        if (status.status === 'completed') {
          // Get results
          const results = await pythonAIService.getSimulationResults(pythonJobId);
          
          // Update simulation with results
          await Simulation.findByIdAndUpdate(simulationId, {
            status: 'completed',
            endTime: new Date(),
            results: {
              avgDelay: results.avg_delay || results.avgDelay,
              avgQueueLength: results.avg_queue_length || results.avgQueueLength,
              throughput: results.throughput,
              fuelConsumption: results.fuel_consumption || results.fuelConsumption,
              co2Emissions: results.co2_emissions || results.co2Emissions,
              predictionRMSE: results.prediction_rmse || results.predictionRMSE,
              predictionMAE: results.prediction_mae || results.predictionMAE,
              detailedMetrics: results.detailed_metrics || results.detailedMetrics
            }
          });

          completed = true;
          logger.info(`Simulation ${simulationId} completed successfully`);

          // Emit completion update via WebSocket
          emitSimulationUpdate(simulationId, {
            status: 'completed',
            message: 'Simulation completed successfully',
            results: {
              avgDelay: results.avg_delay || results.avgDelay,
              avgQueueLength: results.avg_queue_length || results.avgQueueLength,
              throughput: results.throughput
            }
          });
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Simulation failed in Python service');
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          throw error;
        }
        // Continue polling on transient errors
      }
    }

    if (!completed) {
      throw new Error('Simulation timeout - exceeded maximum polling attempts');
    }

    return { simulationId, status: 'completed' };
  } catch (error) {
    logger.error(`Simulation job ${job.id} failed: ${error.message}`);

    // Update simulation status to failed
    await Simulation.findByIdAndUpdate(simulationId, {
      status: 'failed',
      endTime: new Date()
    });

    // Emit failure update via WebSocket
    emitSimulationUpdate(simulationId, {
      status: 'failed',
      message: error.message || 'Simulation failed',
      error: error.message
    });

    throw error;
  }
});

/**
 * Event handlers for job queue
 */
simulationQueue.on('completed', (job, result) => {
  logger.info(`Simulation job ${job.id} completed:`, result);
});

simulationQueue.on('failed', (job, err) => {
  logger.error(`Simulation job ${job.id} failed:`, err.message);
});

simulationQueue.on('stalled', (job) => {
  logger.warn(`Simulation job ${job.id} stalled`);
});

/**
 * Add a simulation job to the queue
 * @param {string} simulationId - Simulation ID
 * @param {Object} config - Simulation configuration
 * @returns {Promise<Object>} Job information
 */
export const addSimulationJob = async (simulationId, config) => {
  const job = await simulationQueue.add(
    {
      simulationId,
      config
    },
    {
      jobId: `sim-${simulationId}`,
      priority: config.priority || 10
    }
  );

  logger.info(`Added simulation job ${job.id} to queue for simulation ${simulationId}`);

  return {
    jobId: job.id,
    status: await job.getState()
  };
};

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
export const getJobStatus = async (jobId) => {
  const job = await simulationQueue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();
  const progress = job.progress();

  return {
    jobId: job.id,
    status: state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn
  };
};

/**
 * Remove a job from the queue
 * @param {string} jobId - Job ID
 */
export const removeJob = async (jobId) => {
  const job = await simulationQueue.getJob(jobId);

  if (job) {
    await job.remove();
    logger.info(`Removed job ${jobId} from queue`);
  }
};

export default {
  simulationQueue,
  addSimulationJob,
  getJobStatus,
  removeJob
};
