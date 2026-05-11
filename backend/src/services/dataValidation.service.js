import logger from '../utils/logger.js';

/**
 * Data Validation Service
 * Validates traffic data quality, format, and consistency
 */

// Guyana vehicle mix statistics (target percentages)
const GUYANA_VEHICLE_MIX = {
  cars: 55,
  motorcycles: 25,
  minibuses: 15,
  trucks: 5
};

const VEHICLE_MIX_TOLERANCE = 2; // 2% tolerance

// Note: logger is imported for potential future use in validation logging

/**
 * Validate CSV data format
 */
export const validateCSVData = (data) => {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('CSV data is empty or invalid format');
    return { isValid: false, errors, warnings };
  }

  // Check for required fields (common traffic data fields)
  const firstRow = data[0];
  const requiredFields = ['timestamp', 'vehicle_type'];
  
  const missingFields = requiredFields.filter(field => !(field in firstRow));
  if (missingFields.length > 0) {
    warnings.push(`Missing recommended fields: ${missingFields.join(', ')}`);
  }

  // Check for missing values
  let missingValueCount = 0;
  data.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        missingValueCount++;
      }
    });
  });

  if (missingValueCount > 0) {
    const missingPercentage = (missingValueCount / (data.length * Object.keys(firstRow).length)) * 100;
    warnings.push(`Found ${missingValueCount} missing values (${missingPercentage.toFixed(2)}% of total)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recordCount: data.length
  };
};

/**
 * Validate JSON data format
 */
export const validateJSONData = (data) => {
  const errors = [];
  const warnings = [];

  if (typeof data !== 'object') {
    errors.push('JSON data must be an object or array');
    return { isValid: false, errors, warnings };
  }

  // If it's an array, validate each item
  if (Array.isArray(data)) {
    if (data.length === 0) {
      warnings.push('JSON array is empty');
    }
    
    // Check data consistency
    const keys = data.length > 0 ? Object.keys(data[0]) : [];
    data.forEach((item, index) => {
      const itemKeys = Object.keys(item);
      if (itemKeys.length !== keys.length) {
        warnings.push(`Inconsistent structure at index ${index}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recordCount: data.length
    };
  }

  // If it's an object, check for common traffic data structures
  if (!data.vehicles && !data.intersections && !data.network) {
    warnings.push('JSON structure does not match expected traffic data format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recordCount: 1
  };
};

/**
 * Validate SUMO XML data format
 */
export const validateSUMOXMLData = (xmlString) => {
  const errors = [];
  const warnings = [];

  if (!xmlString || typeof xmlString !== 'string') {
    errors.push('Invalid XML data');
    return { isValid: false, errors, warnings };
  }

  // Basic XML validation
  if (!xmlString.includes('<?xml')) {
    warnings.push('Missing XML declaration');
  }

  // Check for SUMO-specific tags
  const sumoTags = ['routes', 'vehicle', 'vType', 'route', 'network', 'edge', 'junction'];
  const hasSumoTag = sumoTags.some(tag => xmlString.includes(`<${tag}`));
  
  if (!hasSumoTag) {
    warnings.push('No SUMO-specific tags found. This may not be a valid SUMO file.');
  }

  // Count vehicles if it's a routes file
  const vehicleMatches = xmlString.match(/<vehicle/g);
  const recordCount = vehicleMatches ? vehicleMatches.length : 0;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recordCount
  };
};

/**
 * Validate vehicle mix against Guyana statistics
 */
export const validateVehicleMix = (vehicleMix) => {
  const errors = [];
  const warnings = [];

  if (!vehicleMix || typeof vehicleMix !== 'object') {
    errors.push('Vehicle mix data is required');
    return { isValid: false, errors, warnings, deviations: {} };
  }

  const { cars, motorcycles, minibuses, trucks } = vehicleMix;

  // Check if all vehicle types are present
  if (cars === undefined || motorcycles === undefined || minibuses === undefined || trucks === undefined) {
    errors.push('All vehicle types (cars, motorcycles, minibuses, trucks) must be specified');
    return { isValid: false, errors, warnings, deviations: {} };
  }

  // Check if percentages sum to 100
  const total = cars + motorcycles + minibuses + trucks;
  if (Math.abs(total - 100) > 0.1) {
    errors.push(`Vehicle mix percentages must sum to 100 (current: ${total})`);
  }

  // Calculate deviations from Guyana statistics
  const deviations = {
    cars: Math.abs(cars - GUYANA_VEHICLE_MIX.cars),
    motorcycles: Math.abs(motorcycles - GUYANA_VEHICLE_MIX.motorcycles),
    minibuses: Math.abs(minibuses - GUYANA_VEHICLE_MIX.minibuses),
    trucks: Math.abs(trucks - GUYANA_VEHICLE_MIX.trucks)
  };

  // Check if deviations exceed tolerance
  Object.entries(deviations).forEach(([type, deviation]) => {
    if (deviation > VEHICLE_MIX_TOLERANCE) {
      warnings.push(
        `${type} percentage (${vehicleMix[type]}%) deviates from Guyana statistics ` +
        `(${GUYANA_VEHICLE_MIX[type]}%) by ${deviation.toFixed(2)}%`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    deviations,
    withinTolerance: Object.values(deviations).every(d => d <= VEHICLE_MIX_TOLERANCE)
  };
};

/**
 * Check for outliers in numeric data using IQR method
 */
export const detectOutliers = (data, field) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { outliers: [], count: 0 };
  }

  const values = data
    .map(item => parseFloat(item[field]))
    .filter(val => !isNaN(val));

  if (values.length === 0) {
    return { outliers: [], count: 0 };
  }

  // Calculate mean and standard deviation
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Calculate quartiles for IQR method
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Identify outliers using both methods
  const outliers = [];
  data.forEach((item, index) => {
    const value = parseFloat(item[field]);
    if (!isNaN(value)) {
      const isOutlierStdDev = Math.abs(value - mean) > 3 * stdDev;
      const isOutlierIQR = value < lowerBound || value > upperBound;
      
      if (isOutlierStdDev || isOutlierIQR) {
        outliers.push({
          index,
          value,
          deviation: Math.abs(value - mean) / stdDev,
          method: isOutlierIQR ? 'IQR' : 'StdDev'
        });
      }
    }
  });

  return {
    outliers,
    count: outliers.length,
    mean,
    stdDev,
    median: sorted[Math.floor(sorted.length / 2)],
    q1,
    q3,
    iqr,
    lowerBound,
    upperBound,
    percentage: (outliers.length / values.length) * 100
  };
};

/**
 * Validate data consistency (check for duplicate records, temporal consistency)
 */
export const validateDataConsistency = (data) => {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('No data to validate');
    return { isValid: false, errors, warnings, duplicates: 0, temporalIssues: 0 };
  }

  // Check for duplicate records
  const seen = new Set();
  let duplicates = 0;
  
  data.forEach((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  });

  if (duplicates > 0) {
    warnings.push(`Found ${duplicates} duplicate records (${((duplicates / data.length) * 100).toFixed(2)}%)`);
  }

  // Check temporal consistency if timestamp field exists
  let temporalIssues = 0;
  const timestampFields = ['timestamp', 'time', 'datetime', 'date'];
  const timestampField = timestampFields.find(field => data[0] && field in data[0]);

  if (timestampField) {
    let previousTimestamp = null;
    
    data.forEach((row) => {
      const timestamp = new Date(row[timestampField]);
      
      if (isNaN(timestamp.getTime())) {
        temporalIssues++;
      } else if (previousTimestamp && timestamp < previousTimestamp) {
        temporalIssues++;
      }
      
      previousTimestamp = timestamp;
    });

    if (temporalIssues > 0) {
      warnings.push(`Found ${temporalIssues} temporal consistency issues (out of order or invalid timestamps)`);
    }
  }

  // Check for data type consistency
  const fields = Object.keys(data[0] || {});
  const typeInconsistencies = {};

  fields.forEach(field => {
    const types = new Set();
    data.forEach(row => {
      const value = row[field];
      if (value !== null && value !== undefined && value !== '') {
        types.add(typeof value);
      }
    });

    if (types.size > 1) {
      typeInconsistencies[field] = Array.from(types);
    }
  });

  if (Object.keys(typeInconsistencies).length > 0) {
    warnings.push(`Found type inconsistencies in fields: ${Object.keys(typeInconsistencies).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    duplicates,
    temporalIssues,
    typeInconsistencies,
    consistencyScore: Math.max(0, 100 - (duplicates / data.length * 50) - (temporalIssues / data.length * 50))
  };
};

/**
 * Validate data ranges (check if values are within expected ranges)
 */
export const validateDataRanges = (data, rangeDefinitions = {}) => {
  const errors = [];
  const warnings = [];
  const violations = {};

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('No data to validate');
    return { isValid: false, errors, warnings, violations };
  }

  // Default range definitions for common traffic data fields
  const defaultRanges = {
    speed: { min: 0, max: 150, unit: 'km/h' },
    queue_length: { min: 0, max: 10000, unit: 'meters' },
    delay: { min: 0, max: 3600, unit: 'seconds' },
    volume: { min: 0, max: 10000, unit: 'vehicles/hour' },
    occupancy: { min: 0, max: 100, unit: 'percentage' },
    ...rangeDefinitions
  };

  // Check each field against its range
  Object.entries(defaultRanges).forEach(([field, range]) => {
    if (data[0] && field in data[0]) {
      const outOfRange = [];
      
      data.forEach((row, index) => {
        const value = parseFloat(row[field]);
        if (!isNaN(value) && (value < range.min || value > range.max)) {
          outOfRange.push({ index, value, expected: `${range.min}-${range.max} ${range.unit}` });
        }
      });

      if (outOfRange.length > 0) {
        violations[field] = outOfRange;
        warnings.push(
          `Field '${field}' has ${outOfRange.length} values outside expected range ` +
          `(${range.min}-${range.max} ${range.unit})`
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    violations,
    violationCount: Object.values(violations).reduce((sum, v) => sum + v.length, 0)
  };
};

/**
 * Calculate data quality score
 */
export const calculateQualityScore = (validationResults) => {
  let score = 100;
  const penalties = {
    error: 10,
    warning: 2,
    missingValue: 0.1,
    outlier: 0.5,
    duplicate: 1,
    temporalIssue: 1,
    rangeViolation: 0.5
  };

  // Deduct points for errors and warnings
  if (validationResults.format) {
    score -= (validationResults.format.errors?.length || 0) * penalties.error;
    score -= (validationResults.format.warnings?.length || 0) * penalties.warning;
  }

  // Deduct for completeness issues
  if (validationResults.completeness) {
    const completeness = parseFloat(validationResults.completeness.completeness);
    score -= (100 - completeness) * 0.3;
  }

  // Deduct for consistency issues
  if (validationResults.consistency) {
    score -= (validationResults.consistency.duplicates || 0) * penalties.duplicate;
    score -= (validationResults.consistency.temporalIssues || 0) * penalties.temporalIssue;
  }

  // Deduct for outliers
  if (validationResults.outliers) {
    Object.values(validationResults.outliers).forEach(outlierData => {
      score -= (outlierData.count || 0) * penalties.outlier;
    });
  }

  // Deduct for range violations
  if (validationResults.ranges) {
    score -= (validationResults.ranges.violationCount || 0) * penalties.rangeViolation;
  }

  // Deduct for vehicle mix deviations
  if (validationResults.vehicleMix && !validationResults.vehicleMix.withinTolerance) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score)).toFixed(2);
};

/**
 * Generate comprehensive validation report
 */
export const generateValidationReport = (validationResults) => {
  const report = {
    timestamp: new Date().toISOString(),
    overallStatus: 'passed',
    qualityScore: 0,
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      recordCount: 0,
      completeness: 0,
      consistencyScore: 0
    },
    details: {},
    recommendations: []
  };

  // Aggregate results
  Object.entries(validationResults).forEach(([key, result]) => {
    if (result.errors) {
      report.summary.totalErrors += result.errors.length;
    }
    if (result.warnings) {
      report.summary.totalWarnings += result.warnings.length;
    }
    if (result.recordCount) {
      report.summary.recordCount = result.recordCount;
    }
    if (result.completeness) {
      report.summary.completeness = parseFloat(result.completeness);
    }
    if (result.consistencyScore) {
      report.summary.consistencyScore = result.consistencyScore;
    }
    report.details[key] = result;
  });

  // Calculate quality score
  report.qualityScore = calculateQualityScore(validationResults);

  // Determine overall status
  if (report.summary.totalErrors > 0) {
    report.overallStatus = 'failed';
  } else if (report.summary.totalWarnings > 0) {
    report.overallStatus = 'passed_with_warnings';
  }

  // Generate recommendations
  if (report.summary.completeness < 80) {
    report.recommendations.push('Data completeness is below 80%. Consider filling missing values or removing incomplete records.');
  }

  if (report.summary.totalWarnings > 10) {
    report.recommendations.push('High number of warnings detected. Review data quality and consider data cleaning.');
  }

  if (validationResults.vehicleMix && !validationResults.vehicleMix.withinTolerance) {
    report.recommendations.push('Vehicle mix deviates from Guyana statistics. Verify data source or adjust simulation parameters.');
  }

  if (validationResults.outliers) {
    const totalOutliers = Object.values(validationResults.outliers).reduce((sum, o) => sum + (o.count || 0), 0);
    if (totalOutliers > 0) {
      report.recommendations.push(`Found ${totalOutliers} outliers across multiple fields. Review and consider removing or correcting anomalous values.`);
    }
  }

  if (validationResults.consistency && validationResults.consistency.duplicates > 0) {
    report.recommendations.push(`Found ${validationResults.consistency.duplicates} duplicate records. Consider deduplication.`);
  }

  return report;
};

/**
 * Validate data completeness
 */
export const validateDataCompleteness = (data) => {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('No data to validate');
    return { isValid: false, errors, warnings, completeness: 0 };
  }

  const firstRow = data[0];
  const fields = Object.keys(firstRow);
  let totalCells = data.length * fields.length;
  let filledCells = 0;

  data.forEach(row => {
    fields.forEach(field => {
      if (row[field] !== null && row[field] !== undefined && row[field] !== '') {
        filledCells++;
      }
    });
  });

  const completeness = (filledCells / totalCells) * 100;

  if (completeness < 80) {
    warnings.push(`Data completeness is ${completeness.toFixed(2)}% (below 80% threshold)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness: completeness.toFixed(2),
    totalCells,
    filledCells
  };
};

export default {
  validateCSVData,
  validateJSONData,
  validateSUMOXMLData,
  validateVehicleMix,
  detectOutliers,
  generateValidationReport,
  validateDataCompleteness,
  validateDataConsistency,
  validateDataRanges,
  calculateQualityScore
};
