import dataValidationService from '../src/services/dataValidation.service.js';

describe('Data Validation Service', () => {
  describe('validateCSVData', () => {
    test('should validate valid CSV data', () => {
      const data = [
        { timestamp: '2024-01-01', vehicle_type: 'car', speed: 50 },
        { timestamp: '2024-01-02', vehicle_type: 'motorcycle', speed: 60 }
      ];

      const result = dataValidationService.validateCSVData(data);

      expect(result.isValid).toBe(true);
      expect(result.recordCount).toBe(2);
    });

    test('should detect empty CSV data', () => {
      const result = dataValidationService.validateCSVData([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV data is empty or invalid format');
    });

    test('should detect missing values', () => {
      const data = [
        { timestamp: '2024-01-01', vehicle_type: 'car', speed: 50 },
        { timestamp: '', vehicle_type: 'motorcycle', speed: null }
      ];

      const result = dataValidationService.validateCSVData(data);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('missing values');
    });
  });

  describe('validateVehicleMix', () => {
    test('should validate vehicle mix within tolerance', () => {
      const vehicleMix = {
        cars: 56,
        motorcycles: 24,
        minibuses: 15,
        trucks: 5
      };

      const result = dataValidationService.validateVehicleMix(vehicleMix);

      expect(result.isValid).toBe(true);
      expect(result.withinTolerance).toBe(true);
    });

    test('should detect vehicle mix deviation', () => {
      const vehicleMix = {
        cars: 70,
        motorcycles: 20,
        minibuses: 5,
        trucks: 5
      };

      const result = dataValidationService.validateVehicleMix(vehicleMix);

      expect(result.isValid).toBe(true);
      expect(result.withinTolerance).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should reject invalid vehicle mix sum', () => {
      const vehicleMix = {
        cars: 50,
        motorcycles: 25,
        minibuses: 15,
        trucks: 5
      };

      const result = dataValidationService.validateVehicleMix(vehicleMix);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must sum to 100');
    });
  });

  describe('detectOutliers', () => {
    test('should detect outliers using IQR method', () => {
      const data = [
        { speed: 50 },
        { speed: 55 },
        { speed: 52 },
        { speed: 48 },
        { speed: 200 } // Outlier
      ];

      const result = dataValidationService.detectOutliers(data, 'speed');

      expect(result.count).toBeGreaterThan(0);
      expect(result.outliers[0].value).toBe(200);
    });

    test('should return empty for no outliers', () => {
      const data = [
        { speed: 50 },
        { speed: 55 },
        { speed: 52 }
      ];

      const result = dataValidationService.detectOutliers(data, 'speed');

      expect(result.count).toBe(0);
    });
  });

  describe('validateDataCompleteness', () => {
    test('should calculate completeness correctly', () => {
      const data = [
        { a: 1, b: 2, c: 3 },
        { a: 1, b: null, c: 3 },
        { a: 1, b: 2, c: '' }
      ];

      const result = dataValidationService.validateDataCompleteness(data);

      expect(result.isValid).toBe(true);
      expect(parseFloat(result.completeness)).toBeLessThan(100);
    });

    test('should warn when completeness is low', () => {
      const data = [
        { a: 1, b: null, c: null },
        { a: null, b: null, c: null }
      ];

      const result = dataValidationService.validateDataCompleteness(data);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('below 80% threshold');
    });
  });

  describe('validateDataConsistency', () => {
    test('should detect duplicate records', () => {
      const data = [
        { a: 1, b: 2 },
        { a: 1, b: 2 }, // Duplicate
        { a: 3, b: 4 }
      ];

      const result = dataValidationService.validateDataConsistency(data);

      expect(result.duplicates).toBe(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should detect temporal inconsistencies', () => {
      const data = [
        { timestamp: '2024-01-03', value: 1 },
        { timestamp: '2024-01-01', value: 2 }, // Out of order
        { timestamp: '2024-01-02', value: 3 }
      ];

      const result = dataValidationService.validateDataConsistency(data);

      expect(result.temporalIssues).toBeGreaterThan(0);
    });
  });

  describe('validateDataRanges', () => {
    test('should detect values outside expected ranges', () => {
      const data = [
        { speed: 50, queue_length: 100 },
        { speed: 200, queue_length: 50 } // Speed out of range
      ];

      const result = dataValidationService.validateDataRanges(data);

      expect(result.violationCount).toBeGreaterThan(0);
      expect(result.violations.speed).toBeDefined();
    });

    test('should pass for values within ranges', () => {
      const data = [
        { speed: 50, queue_length: 100 },
        { speed: 80, queue_length: 200 }
      ];

      const result = dataValidationService.validateDataRanges(data);

      expect(result.violationCount).toBe(0);
    });
  });

  describe('calculateQualityScore', () => {
    test('should calculate quality score correctly', () => {
      const validationResults = {
        format: { errors: [], warnings: ['test warning'] },
        completeness: { completeness: '95.00' },
        consistency: { duplicates: 2, temporalIssues: 0 },
        outliers: {},
        ranges: { violationCount: 1 }
      };

      const score = dataValidationService.calculateQualityScore(validationResults);

      expect(parseFloat(score)).toBeLessThan(100);
      expect(parseFloat(score)).toBeGreaterThan(0);
    });

    test('should return 100 for perfect data', () => {
      const validationResults = {
        format: { errors: [], warnings: [] },
        completeness: { completeness: '100.00' },
        consistency: { duplicates: 0, temporalIssues: 0 },
        outliers: {},
        ranges: { violationCount: 0 }
      };

      const score = dataValidationService.calculateQualityScore(validationResults);

      expect(parseFloat(score)).toBe(100);
    });
  });

  describe('generateValidationReport', () => {
    test('should generate comprehensive report', () => {
      const validationResults = {
        format: { 
          isValid: true, 
          errors: [], 
          warnings: ['test warning'],
          recordCount: 100
        },
        completeness: { 
          completeness: '85.00',
          isValid: true,
          errors: [],
          warnings: []
        }
      };

      const report = dataValidationService.generateValidationReport(validationResults);

      expect(report.timestamp).toBeDefined();
      expect(report.overallStatus).toBe('passed_with_warnings');
      expect(report.qualityScore).toBeDefined();
      expect(report.summary.totalWarnings).toBe(1);
      expect(report.summary.recordCount).toBe(100);
      expect(report.details).toBeDefined();
    });

    test('should generate recommendations', () => {
      const validationResults = {
        format: { errors: [], warnings: [] },
        completeness: { completeness: '70.00' }, // Below threshold
        consistency: { duplicates: 5, temporalIssues: 0 }
      };

      const report = dataValidationService.generateValidationReport(validationResults);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('completeness'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('duplicate'))).toBe(true);
    });
  });
});
