import TrafficData from '../models/TrafficData.js';
import logger from '../utils/logger.js';
import dataValidationService from '../services/dataValidation.service.js';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * @desc    Upload and create traffic data
 * @route   POST /api/traffic-data
 * @access  Private (admin only)
 */
export const uploadTrafficData = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'No file uploaded',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { name, description, source, dataType, metadata } = req.body;

    // Parse metadata if it's a string
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (error) {
        logger.warn('Failed to parse metadata JSON, using as-is');
      }
    }

    // Determine file format from mimetype or extension
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let fileFormat = 'unknown';
    
    if (fileExtension === '.csv' || req.file.mimetype === 'text/csv') {
      fileFormat = 'csv';
    } else if (fileExtension === '.json' || req.file.mimetype === 'application/json') {
      fileFormat = 'json';
    } else if (fileExtension === '.xml' || req.file.mimetype === 'application/xml' || req.file.mimetype === 'text/xml') {
      fileFormat = 'xml';
    }

    // Validate file format
    if (!['csv', 'json', 'xml'].includes(fileFormat)) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(err => 
        logger.error(`Failed to delete invalid file: ${err.message}`)
      );

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_FORMAT',
          message: 'File must be CSV, JSON, or XML format',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Perform basic validation on the file content
    let validationResult;
    try {
      const fileContent = await fs.readFile(req.file.path, 'utf-8');
      
      if (fileFormat === 'csv') {
        const records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        validationResult = dataValidationService.validateCSVData(records);
      } else if (fileFormat === 'json') {
        const jsonData = JSON.parse(fileContent);
        validationResult = dataValidationService.validateJSONData(jsonData);
      } else if (fileFormat === 'xml') {
        validationResult = dataValidationService.validateSUMOXMLData(fileContent);
      }
    } catch (error) {
      logger.error(`File validation error: ${error.message}`);
      
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(err => 
        logger.error(`Failed to delete invalid file: ${err.message}`)
      );

      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_VALIDATION_FAILED',
          message: `Failed to validate file: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    // If validation failed with errors, reject the upload
    if (!validationResult.isValid) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(err => 
        logger.error(`Failed to delete invalid file: ${err.message}`)
      );

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_CONTENT',
          message: 'File content validation failed',
          details: validationResult.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create traffic data record
    const trafficData = await TrafficData.create({
      name,
      description,
      source,
      dataType,
      uploadedBy: req.user._id,
      fileUrl: req.file.path,
      metadata: {
        ...parsedMetadata,
        recordCount: validationResult.recordCount,
        fileFormat,
        originalFilename: req.file.originalname,
        fileSize: req.file.size
      }
    });

    logger.info(`Traffic data uploaded: ${trafficData._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: trafficData,
      validation: {
        warnings: validationResult.warnings || []
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(err => 
        logger.error(`Failed to delete file on error: ${err.message}`)
      );
    }

    logger.error(`Error uploading traffic data: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all traffic data with pagination and filtering
 * @route   GET /api/traffic-data
 * @access  Private
 */
export const getTrafficData = async (req, res, next) => {
  try {
    const { page, limit, source, dataType, sortBy, sortOrder } = req.query;

    // Build filter query
    const filter = {};
    
    if (source) {
      filter.source = source;
    }

    if (dataType) {
      filter.dataType = dataType;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [datasets, total] = await Promise.all([
      TrafficData.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'firstName lastName email')
        .lean(),
      TrafficData.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: datasets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching traffic data: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get traffic data by ID
 * @route   GET /api/traffic-data/:id
 * @access  Private
 */
export const getTrafficDataById = async (req, res, next) => {
  try {
    const trafficData = await TrafficData.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email organization');

    if (!trafficData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Traffic data not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(200).json({
      success: true,
      data: trafficData
    });
  } catch (error) {
    logger.error(`Error fetching traffic data ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update traffic data metadata
 * @route   PUT /api/traffic-data/:id
 * @access  Private (admin only)
 */
export const updateTrafficData = async (req, res, next) => {
  try {
    const trafficData = await TrafficData.findById(req.params.id);

    if (!trafficData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Traffic data not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update allowed fields
    const { name, description, metadata } = req.body;
    
    if (name) trafficData.name = name;
    if (description !== undefined) trafficData.description = description;
    if (metadata) {
      trafficData.metadata = {
        ...trafficData.metadata,
        ...metadata
      };
    }

    await trafficData.save();

    logger.info(`Traffic data updated: ${trafficData._id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      data: trafficData
    });
  } catch (error) {
    logger.error(`Error updating traffic data ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete traffic data
 * @route   DELETE /api/traffic-data/:id
 * @access  Private (admin only)
 */
export const deleteTrafficData = async (req, res, next) => {
  try {
    const trafficData = await TrafficData.findById(req.params.id);

    if (!trafficData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Traffic data not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete the file from filesystem
    if (trafficData.fileUrl) {
      try {
        await fs.unlink(trafficData.fileUrl);
        logger.info(`Deleted file: ${trafficData.fileUrl}`);
      } catch (error) {
        logger.warn(`Failed to delete file ${trafficData.fileUrl}: ${error.message}`);
        // Continue with database deletion even if file deletion fails
      }
    }

    await trafficData.deleteOne();

    logger.info(`Traffic data deleted: ${req.params.id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Traffic data deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting traffic data ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Validate traffic data
 * @route   GET /api/traffic-data/:id/validate
 * @access  Private
 */
export const validateTrafficData = async (req, res, next) => {
  try {
    const trafficData = await TrafficData.findById(req.params.id);

    if (!trafficData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Traffic data not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Read and validate the file
    const fileContent = await fs.readFile(trafficData.fileUrl, 'utf-8');
    const fileFormat = trafficData.metadata?.fileFormat || 'unknown';

    const validationResults = {};

    // Format-specific validation
    if (fileFormat === 'csv') {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Basic format validation
      validationResults.format = dataValidationService.validateCSVData(records);
      
      // Data completeness check
      validationResults.completeness = dataValidationService.validateDataCompleteness(records);
      
      // Data consistency check
      validationResults.consistency = dataValidationService.validateDataConsistency(records);
      
      // Data range validation
      validationResults.ranges = dataValidationService.validateDataRanges(records);
      
      // Check for outliers in numeric fields
      const numericFields = Object.keys(records[0] || {}).filter(key => {
        const value = records[0][key];
        return !isNaN(parseFloat(value));
      });
      
      validationResults.outliers = {};
      numericFields.forEach(field => {
        const outlierAnalysis = dataValidationService.detectOutliers(records, field);
        if (outlierAnalysis.count > 0) {
          validationResults.outliers[field] = outlierAnalysis;
        }
      });

      // Validate vehicle mix if present
      if (records[0]?.vehicle_type) {
        const vehicleCounts = {};
        records.forEach(record => {
          const type = record.vehicle_type?.toLowerCase();
          vehicleCounts[type] = (vehicleCounts[type] || 0) + 1;
        });

        const total = records.length;
        const vehicleMix = {
          cars: ((vehicleCounts.car || 0) / total) * 100,
          motorcycles: ((vehicleCounts.motorcycle || 0) / total) * 100,
          minibuses: ((vehicleCounts.minibus || 0) / total) * 100,
          trucks: ((vehicleCounts.truck || 0) / total) * 100
        };

        validationResults.vehicleMix = dataValidationService.validateVehicleMix(vehicleMix);
      }
    } else if (fileFormat === 'json') {
      const jsonData = JSON.parse(fileContent);
      validationResults.format = dataValidationService.validateJSONData(jsonData);
      
      if (Array.isArray(jsonData)) {
        validationResults.completeness = dataValidationService.validateDataCompleteness(jsonData);
        validationResults.consistency = dataValidationService.validateDataConsistency(jsonData);
        validationResults.ranges = dataValidationService.validateDataRanges(jsonData);
      }
    } else if (fileFormat === 'xml') {
      validationResults.format = dataValidationService.validateSUMOXMLData(fileContent);
    }

    // Generate comprehensive report
    const report = dataValidationService.generateValidationReport(validationResults);

    // Update validation status in database
    trafficData.validation = {
      isValidated: true,
      validationDate: new Date(),
      validationMethod: 'automated',
      deviationPercent: validationResults.vehicleMix?.deviations 
        ? Object.values(validationResults.vehicleMix.deviations).reduce((a, b) => a + b, 0) / 4
        : null
    };

    // Update quality score in metadata
    trafficData.metadata = {
      ...trafficData.metadata,
      quality: parseFloat(report.qualityScore)
    };

    await trafficData.save();

    logger.info(`Traffic data validated: ${trafficData._id} - Quality Score: ${report.qualityScore}`);

    res.status(200).json({
      success: true,
      data: {
        trafficDataId: trafficData._id,
        report
      }
    });
  } catch (error) {
    logger.error(`Error validating traffic data ${req.params.id}: ${error.message}`);
    next(error);
  }
};
