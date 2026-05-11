import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc    Get logs with filtering
 * @route   GET /api/logs
 * @access  Private/Admin
 */
export const getLogs = async (req, res, next) => {
  try {
    const { 
      level = '', 
      search = '', 
      limit = 100, 
      file = 'combined' 
    } = req.query;

    const logFile = file === 'error' ? 'error.log' : 'combined.log';
    const logPath = path.join(__dirname, '../../logs', logFile);

    // Check if log file exists
    if (!fs.existsSync(logPath)) {
      return res.status(200).json({
        success: true,
        data: {
          logs: [],
          total: 0,
          file: logFile
        }
      });
    }

    // Read log file
    const logContent = fs.readFileSync(logPath, 'utf-8');
    const logLines = logContent.split('\n').filter(line => line.trim());

    // Parse and filter logs
    let logs = [];
    for (const line of logLines) {
      try {
        const logEntry = JSON.parse(line);
        
        // Filter by level
        if (level && logEntry.level !== level) {
          continue;
        }

        // Filter by search term
        if (search) {
          const searchLower = search.toLowerCase();
          const messageMatch = logEntry.message?.toLowerCase().includes(searchLower);
          const serviceMatch = logEntry.service?.toLowerCase().includes(searchLower);
          
          if (!messageMatch && !serviceMatch) {
            continue;
          }
        }

        logs.push(logEntry);
      } catch (e) {
        // Skip invalid JSON lines
        continue;
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    const limitNum = parseInt(limit);
    const total = logs.length;
    logs = logs.slice(0, limitNum);

    res.status(200).json({
      success: true,
      data: {
        logs,
        total,
        returned: logs.length,
        file: logFile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get log statistics
 * @route   GET /api/logs/stats
 * @access  Private/Admin
 */
export const getLogStats = async (req, res, next) => {
  try {
    const combinedPath = path.join(__dirname, '../../logs/combined.log');
    const errorPath = path.join(__dirname, '../../logs/error.log');

    const stats = {
      combined: { exists: false, size: 0, lines: 0, levels: {} },
      error: { exists: false, size: 0, lines: 0 }
    };

    // Combined log stats
    if (fs.existsSync(combinedPath)) {
      const combinedStats = fs.statSync(combinedPath);
      const combinedContent = fs.readFileSync(combinedPath, 'utf-8');
      const combinedLines = combinedContent.split('\n').filter(line => line.trim());

      stats.combined.exists = true;
      stats.combined.size = combinedStats.size;
      stats.combined.lines = combinedLines.length;

      // Count by level
      const levels = { error: 0, warn: 0, info: 0, debug: 0 };
      for (const line of combinedLines) {
        try {
          const logEntry = JSON.parse(line);
          if (logEntry.level && levels.hasOwnProperty(logEntry.level)) {
            levels[logEntry.level]++;
          }
        } catch (e) {
          // Skip invalid lines
        }
      }
      stats.combined.levels = levels;
    }

    // Error log stats
    if (fs.existsSync(errorPath)) {
      const errorStats = fs.statSync(errorPath);
      const errorContent = fs.readFileSync(errorPath, 'utf-8');
      const errorLines = errorContent.split('\n').filter(line => line.trim());

      stats.error.exists = true;
      stats.error.size = errorStats.size;
      stats.error.lines = errorLines.length;
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear logs
 * @route   DELETE /api/logs
 * @access  Private/Admin
 */
export const clearLogs = async (req, res, next) => {
  try {
    const { file = 'combined' } = req.query;

    const logFile = file === 'error' ? 'error.log' : 'combined.log';
    const logPath = path.join(__dirname, '../../logs', logFile);

    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
      logger.info(`Log file cleared: ${logFile} by ${req.user.email}`);
    }

    res.status(200).json({
      success: true,
      message: `${logFile} cleared successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download log file
 * @route   GET /api/logs/download
 * @access  Private/Admin
 */
export const downloadLogs = async (req, res, next) => {
  try {
    const { file = 'combined' } = req.query;

    const logFile = file === 'error' ? 'error.log' : 'combined.log';
    const logPath = path.join(__dirname, '../../logs', logFile);

    if (!fs.existsSync(logPath)) {
      return next(new AppError('Log file not found', 404, 'NOT_FOUND'));
    }

    res.download(logPath, logFile, (err) => {
      if (err) {
        logger.error(`Error downloading log file: ${err.message}`);
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};
