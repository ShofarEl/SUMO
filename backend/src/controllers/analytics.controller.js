import Simulation from '../models/Simulation.js';
import RLAgent from '../models/RLAgent.js';
import PredictionEvaluation from '../models/PredictionEvaluation.js';
import feasibilityService from '../services/feasibility.service.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get system-wide metrics
 * @route   GET /api/analytics/metrics
 * @access  Private
 */
export const getMetrics = async (req, res, next) => {
  try {
    // Get completed simulations
    const completedSimulations = await Simulation.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (completedSimulations.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          avgDelay: null,
          avgQueueLength: null,
          throughput: null,
          predictionRMSE: null,
          predictionMAE: null,
          co2Emissions: null,
          totalSimulations: 0,
          completedSimulations: 0
        }
      });
    }

    // Calculate average metrics
    const totalSims = completedSimulations.length;
    
    let totalDelay = 0;
    let totalQueue = 0;
    let totalThroughput = 0;
    let totalEmissions = 0;
    let delayCount = 0;
    let queueCount = 0;
    let throughputCount = 0;
    let emissionsCount = 0;

    completedSimulations.forEach(sim => {
      if (sim.results?.avgDelay !== undefined) {
        totalDelay += sim.results.avgDelay;
        delayCount++;
      }
      if (sim.results?.avgQueueLength !== undefined) {
        totalQueue += sim.results.avgQueueLength;
        queueCount++;
      }
      if (sim.results?.throughput !== undefined) {
        totalThroughput += sim.results.throughput;
        throughputCount++;
      }
      if (sim.results?.co2Emissions !== undefined) {
        totalEmissions += sim.results.co2Emissions;
        emissionsCount++;
      }
    });

    const avgDelay = delayCount > 0 ? totalDelay / delayCount : null;
    const avgQueueLength = queueCount > 0 ? totalQueue / queueCount : null;
    const throughput = throughputCount > 0 ? totalThroughput / throughputCount : null;
    const co2Emissions = emissionsCount > 0 ? totalEmissions / emissionsCount : null;

    // Calculate trends (compare last 10 vs previous 10)
    const recent = completedSimulations.slice(0, 10);
    const previous = completedSimulations.slice(10, 20);

    let avgDelayTrend = null;
    let avgQueueLengthTrend = null;
    let throughputTrend = null;
    let co2EmissionsTrend = null;

    if (previous.length > 0) {
      const recentAvgDelay = recent.reduce((sum, s) => sum + (s.results?.avgDelay || 0), 0) / recent.length;
      const previousAvgDelay = previous.reduce((sum, s) => sum + (s.results?.avgDelay || 0), 0) / previous.length;
      if (previousAvgDelay > 0) {
        avgDelayTrend = ((recentAvgDelay - previousAvgDelay) / previousAvgDelay) * 100;
      }

      const recentAvgQueue = recent.reduce((sum, s) => sum + (s.results?.avgQueueLength || 0), 0) / recent.length;
      const previousAvgQueue = previous.reduce((sum, s) => sum + (s.results?.avgQueueLength || 0), 0) / previous.length;
      if (previousAvgQueue > 0) {
        avgQueueLengthTrend = ((recentAvgQueue - previousAvgQueue) / previousAvgQueue) * 100;
      }

      const recentThroughput = recent.reduce((sum, s) => sum + (s.results?.throughput || 0), 0) / recent.length;
      const previousThroughput = previous.reduce((sum, s) => sum + (s.results?.throughput || 0), 0) / previous.length;
      if (previousThroughput > 0) {
        throughputTrend = ((recentThroughput - previousThroughput) / previousThroughput) * 100;
      }

      const recentEmissions = recent.reduce((sum, s) => sum + (s.results?.co2Emissions || 0), 0) / recent.length;
      const previousEmissions = previous.reduce((sum, s) => sum + (s.results?.co2Emissions || 0), 0) / previous.length;
      if (previousEmissions > 0) {
        co2EmissionsTrend = ((recentEmissions - previousEmissions) / previousEmissions) * 100;
      }
    }

    // Get prediction accuracy metrics
    const recentEvaluations = await PredictionEvaluation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    let predictionRMSE = null;
    let predictionMAE = null;
    let predictionAccuracyTrend = null;

    if (recentEvaluations.length > 0) {
      const totalRMSE = recentEvaluations.reduce((sum, e) => sum + (e.metrics?.rmse || 0), 0);
      const totalMAE = recentEvaluations.reduce((sum, e) => sum + (e.metrics?.mae || 0), 0);
      predictionRMSE = totalRMSE / recentEvaluations.length;
      predictionMAE = totalMAE / recentEvaluations.length;

      // Calculate trend
      if (recentEvaluations.length >= 5) {
        const recentRMSE = recentEvaluations.slice(0, 5).reduce((sum, e) => sum + (e.metrics?.rmse || 0), 0) / 5;
        const previousRMSE = recentEvaluations.slice(5, 10).reduce((sum, e) => sum + (e.metrics?.rmse || 0), 0) / 5;
        if (previousRMSE > 0) {
          predictionAccuracyTrend = ((recentRMSE - previousRMSE) / previousRMSE) * 100;
        }
      }
    }

    // Get total simulation count
    const totalSimulations = await Simulation.countDocuments();
    const completedCount = await Simulation.countDocuments({ status: 'completed' });

    // Calculate average simulation duration
    const simsWithDuration = completedSimulations.filter(s => s.results?.duration);
    const avgSimulationDuration = simsWithDuration.length > 0
      ? simsWithDuration.reduce((sum, s) => sum + s.results.duration, 0) / simsWithDuration.length
      : null;

    res.status(200).json({
      success: true,
      data: {
        avgDelay,
        avgDelayTrend,
        avgQueueLength,
        avgQueueLengthTrend,
        throughput,
        throughputTrend,
        predictionRMSE,
        predictionMAE,
        predictionAccuracyTrend,
        co2Emissions,
        co2EmissionsTrend,
        totalSimulations,
        completedSimulations: completedCount,
        avgSimulationDuration
      }
    });
  } catch (error) {
    logger.error(`Error fetching metrics: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Compare scenarios
 * @route   POST /api/analytics/compare
 * @access  Private
 */
export const compareScenarios = async (req, res, next) => {
  try {
    const { simulationIds } = req.body;

    if (!simulationIds || !Array.isArray(simulationIds) || simulationIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least 2 simulation IDs are required for comparison',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Fetch simulations
    const simulations = await Simulation.find({
      _id: { $in: simulationIds },
      status: 'completed'
    }).lean();

    if (simulations.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_DATA',
          message: 'At least 2 completed simulations are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build comparison data
    const comparison = simulations.map(sim => ({
      id: sim._id,
      name: sim.name,
      controlStrategy: sim.config?.controlStrategy || 'unknown',
      avgDelay: sim.results?.avgDelay || null,
      avgQueueLength: sim.results?.avgQueueLength || null,
      throughput: sim.results?.throughput || null,
      co2Emissions: sim.results?.co2Emissions || null,
      fuelConsumption: sim.results?.fuelConsumption || null,
      createdAt: sim.createdAt
    }));

    // Calculate statistical significance (simple t-test approximation)
    const metrics = ['avgDelay', 'avgQueueLength', 'throughput', 'co2Emissions'];
    const significance = {};

    metrics.forEach(metric => {
      const values = comparison.map(c => c[metric]).filter(v => v !== null);
      if (values.length >= 2) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = mean !== 0 ? (stdDev / mean) * 100 : 0;
        
        significance[metric] = {
          mean,
          stdDev,
          coefficientOfVariation,
          isSignificant: coefficientOfVariation > 10 // Simple threshold
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        scenarios: comparison,
        significance,
        comparisonDate: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error comparing scenarios: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Export analytics data
 * @route   GET /api/analytics/export
 * @access  Private
 */
export const exportData = async (req, res, next) => {
  try {
    const { format = 'json', startDate, endDate, metrics, controlStrategy } = req.query;

    // Build query
    const query = { status: 'completed' };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (controlStrategy) {
      query['config.controlStrategy'] = controlStrategy;
    }

    // Fetch simulations
    const simulations = await Simulation.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .lean();

    // Filter metrics if specified
    const metricsToInclude = metrics ? metrics.split(',') : [
      'avgDelay', 'avgQueueLength', 'throughput', 'co2Emissions', 'fuelConsumption', 'predictionRMSE', 'predictionMAE'
    ];

    let exportData = simulations.map(sim => {
      const data = {
        id: sim._id.toString(),
        name: sim.name,
        description: sim.description || '',
        controlStrategy: sim.config?.controlStrategy || 'unknown',
        trafficDemand: sim.config?.trafficDemand || '',
        timeOfDay: sim.config?.timeOfDay || '',
        weather: sim.config?.weather || '',
        duration: sim.config?.duration || 0,
        createdBy: sim.userId ? `${sim.userId.firstName} ${sim.userId.lastName}` : 'Unknown',
        createdAt: sim.createdAt,
        completedAt: sim.endTime || sim.updatedAt
      };

      // Add vehicle mix
      if (sim.config?.vehicleMix) {
        data.cars = sim.config.vehicleMix.cars;
        data.motorcycles = sim.config.vehicleMix.motorcycles;
        data.minibuses = sim.config.vehicleMix.minibuses;
        data.trucks = sim.config.vehicleMix.trucks;
      }

      // Add requested metrics
      metricsToInclude.forEach(metric => {
        if (sim.results?.[metric] !== undefined) {
          data[metric] = sim.results[metric];
        }
      });

      return data;
    });

    // Format based on requested format
    if (format === 'csv') {
      // Convert to CSV
      if (exportData.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
        return res.status(200).send('No data available');
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];

      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (value instanceof Date) return value.toISOString();
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
      res.status(200).send(csvRows.join('\n'));
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        data: exportData,
        count: exportData.length,
        exportDate: new Date().toISOString(),
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          controlStrategy: controlStrategy || null,
          metrics: metricsToInclude
        }
      });
    }
  } catch (error) {
    logger.error(`Error exporting data: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get feasibility assessment
 * @route   GET /api/analytics/feasibility
 * @access  Private (Researcher, Admin)
 */
export const getFeasibilityAssessment = async (req, res, next) => {
  try {
    logger.info('Generating feasibility assessment for Georgetown');

    // Perform complete feasibility assessment
    const assessment = feasibilityService.performCompleteAssessment();

    res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    logger.error(`Error generating feasibility assessment: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Export chart data for visualization
 * @route   GET /api/analytics/chart-data
 * @access  Private
 */
export const getChartData = async (req, res, next) => {
  try {
    const { chartType, startDate, endDate, controlStrategy } = req.query;

    // Validate chartType parameter
    if (!chartType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CHART_TYPE',
          message: 'chartType parameter is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query
    const query = { status: 'completed' };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (controlStrategy) {
      query['config.controlStrategy'] = controlStrategy;
    }

    const simulations = await Simulation.find(query)
      .sort({ createdAt: 1 })
      .lean();

    let chartData = {};

    switch (chartType) {
      case 'delay-timeseries':
        chartData = {
          labels: simulations.map(s => new Date(s.createdAt).toLocaleDateString()),
          datasets: [{
            label: 'Average Delay (seconds)',
            data: simulations.map(s => s.results?.avgDelay || 0)
          }]
        };
        break;

      case 'queue-distribution':
        chartData = {
          labels: simulations.map(s => s.name),
          datasets: [{
            label: 'Queue Length (meters)',
            data: simulations.map(s => s.results?.avgQueueLength || 0)
          }]
        };
        break;

      case 'throughput-comparison':
        // Group by control strategy
        const strategies = {};
        simulations.forEach(sim => {
          const strategy = sim.config?.controlStrategy || 'unknown';
          if (!strategies[strategy]) {
            strategies[strategy] = [];
          }
          strategies[strategy].push(sim.results?.throughput || 0);
        });

        chartData = {
          labels: Object.keys(strategies),
          datasets: [{
            label: 'Average Throughput (vehicles/hour)',
            data: Object.values(strategies).map(values => 
              values.reduce((sum, v) => sum + v, 0) / values.length
            )
          }]
        };
        break;

      case 'emissions-analysis':
        // Group by vehicle type and control strategy
        const emissionsByStrategy = {};
        simulations.forEach(sim => {
          const strategy = sim.config?.controlStrategy || 'unknown';
          if (!emissionsByStrategy[strategy]) {
            emissionsByStrategy[strategy] = [];
          }
          emissionsByStrategy[strategy].push(sim.results?.co2Emissions || 0);
        });

        chartData = {
          labels: Object.keys(emissionsByStrategy),
          datasets: [{
            label: 'CO₂ Emissions (kg)',
            data: Object.values(emissionsByStrategy).map(values =>
              values.reduce((sum, v) => sum + v, 0) / values.length
            )
          }]
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CHART_TYPE',
            message: 'Invalid chart type specified',
            timestamp: new Date().toISOString()
          }
        });
    }

    res.status(200).json({
      success: true,
      data: chartData,
      chartType,
      count: simulations.length
    });
  } catch (error) {
    logger.error(`Error generating chart data: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Generate comprehensive report
 * @route   POST /api/analytics/generate-report
 * @access  Private
 */
export const generateReport = async (req, res, next) => {
  try {
    const { title, simulationIds, includeCharts = true } = req.body;

    if (!simulationIds || !Array.isArray(simulationIds) || simulationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one simulation ID is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Fetch simulations
    const simulations = await Simulation.find({
      _id: { $in: simulationIds },
      status: 'completed'
    })
    .populate('userId', 'firstName lastName email organization')
    .lean();

    if (simulations.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No completed simulations found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calculate summary statistics
    const summary = {
      totalSimulations: simulations.length,
      avgDelay: simulations.reduce((sum, s) => sum + (s.results?.avgDelay || 0), 0) / simulations.length,
      avgQueueLength: simulations.reduce((sum, s) => sum + (s.results?.avgQueueLength || 0), 0) / simulations.length,
      avgThroughput: simulations.reduce((sum, s) => sum + (s.results?.throughput || 0), 0) / simulations.length,
      totalCO2Emissions: simulations.reduce((sum, s) => sum + (s.results?.co2Emissions || 0), 0),
      controlStrategies: [...new Set(simulations.map(s => s.config?.controlStrategy))],
      dateRange: {
        start: new Date(Math.min(...simulations.map(s => new Date(s.createdAt)))),
        end: new Date(Math.max(...simulations.map(s => new Date(s.createdAt))))
      }
    };

    // Build report data
    const report = {
      title: title || 'Traffic Management Analytics Report',
      generatedAt: new Date().toISOString(),
      generatedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
      summary,
      simulations: simulations.map(sim => ({
        id: sim._id,
        name: sim.name,
        description: sim.description,
        controlStrategy: sim.config?.controlStrategy,
        trafficDemand: sim.config?.trafficDemand,
        timeOfDay: sim.config?.timeOfDay,
        weather: sim.config?.weather,
        results: sim.results,
        createdAt: sim.createdAt,
        createdBy: sim.userId ? `${sim.userId.firstName} ${sim.userId.lastName}` : 'Unknown'
      })),
      includeCharts
    };

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
    next(error);
  }
};

export default {
  getMetrics,
  compareScenarios,
  exportData,
  getFeasibilityAssessment,
  getChartData,
  generateReport
};
