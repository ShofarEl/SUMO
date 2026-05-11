# Data Validation Service

## Overview

The Data Validation Service provides comprehensive validation capabilities for traffic data uploaded to the Georgetown Traffic AI Management System. It ensures data quality, consistency, and compliance with Guyana traffic statistics.

## Features

### 1. Format Validation

Validates data format for CSV, JSON, and SUMO XML files:

- **CSV Validation**: Checks for required fields, missing values, and data structure
- **JSON Validation**: Validates object/array structure and consistency
- **SUMO XML Validation**: Verifies SUMO-specific tags and structure

### 2. Data Quality Checks

#### Missing Values Detection
- Identifies null, undefined, or empty values
- Calculates percentage of missing data
- Provides warnings when missing values exceed thresholds

#### Outlier Detection
- Uses both Standard Deviation (3σ) and IQR (Interquartile Range) methods
- Identifies anomalous values in numeric fields
- Provides statistical context (mean, median, quartiles)

#### Data Completeness
- Calculates overall data completeness percentage
- Warns when completeness falls below 80%
- Tracks filled vs. total cells

### 3. Data Consistency Checks

#### Duplicate Detection
- Identifies exact duplicate records
- Reports duplicate percentage

#### Temporal Consistency
- Validates timestamp ordering
- Detects invalid date/time values
- Ensures chronological data flow

#### Type Consistency
- Checks for consistent data types across fields
- Identifies fields with mixed types

### 4. Vehicle Mix Validation

Validates vehicle composition against Guyana statistics:

- **Target Mix**: 55% cars, 25% motorcycles, 15% minibuses, 5% trucks
- **Tolerance**: ±2% deviation allowed
- **Reporting**: Detailed deviation analysis per vehicle type

### 5. Range Validation

Validates numeric values against expected ranges:

- **Speed**: 0-150 km/h
- **Queue Length**: 0-10,000 meters
- **Delay**: 0-3,600 seconds
- **Volume**: 0-10,000 vehicles/hour
- **Occupancy**: 0-100%

### 6. Quality Scoring

Calculates an overall quality score (0-100) based on:

- Errors (10 points each)
- Warnings (2 points each)
- Missing values (0.1 points each)
- Outliers (0.5 points each)
- Duplicates (1 point each)
- Temporal issues (1 point each)
- Range violations (0.5 points each)
- Vehicle mix deviations (5 points)

### 7. Validation Reports

Generates comprehensive reports including:

- Overall status (passed, passed_with_warnings, failed)
- Quality score
- Summary statistics
- Detailed validation results
- Actionable recommendations

## API Usage

### Validate Traffic Data

```javascript
GET /api/traffic-data/:id/validate
```

**Response:**

```json
{
  "success": true,
  "data": {
    "trafficDataId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "report": {
      "timestamp": "2026-05-09T10:30:00.000Z",
      "overallStatus": "passed_with_warnings",
      "qualityScore": "87.50",
      "summary": {
        "totalErrors": 0,
        "totalWarnings": 5,
        "recordCount": 1000,
        "completeness": 95.5,
        "consistencyScore": 92.3
      },
      "details": {
        "format": {
          "isValid": true,
          "errors": [],
          "warnings": ["Missing recommended fields: weather"],
          "recordCount": 1000
        },
        "completeness": {
          "isValid": true,
          "errors": [],
          "warnings": [],
          "completeness": "95.50",
          "totalCells": 10000,
          "filledCells": 9550
        },
        "consistency": {
          "isValid": true,
          "errors": [],
          "warnings": ["Found 12 duplicate records (1.20%)"],
          "duplicates": 12,
          "temporalIssues": 0,
          "typeInconsistencies": {},
          "consistencyScore": 94.0
        },
        "ranges": {
          "isValid": true,
          "errors": [],
          "warnings": ["Field 'speed' has 3 values outside expected range (0-150 km/h)"],
          "violations": {
            "speed": [
              { "index": 45, "value": 165, "expected": "0-150 km/h" },
              { "index": 234, "value": 180, "expected": "0-150 km/h" },
              { "index": 567, "value": 155, "expected": "0-150 km/h" }
            ]
          },
          "violationCount": 3
        },
        "outliers": {
          "queue_length": {
            "outliers": [
              { "index": 123, "value": 850, "deviation": 3.2, "method": "IQR" }
            ],
            "count": 1,
            "mean": 45.6,
            "stdDev": 12.3,
            "median": 42.0,
            "q1": 30.0,
            "q3": 60.0,
            "iqr": 30.0,
            "lowerBound": -15.0,
            "upperBound": 105.0,
            "percentage": 0.1
          }
        },
        "vehicleMix": {
          "isValid": true,
          "errors": [],
          "warnings": [
            "cars percentage (57%) deviates from Guyana statistics (55%) by 2.00%"
          ],
          "deviations": {
            "cars": 2.0,
            "motorcycles": 1.5,
            "minibuses": 0.5,
            "trucks": 0.0
          },
          "withinTolerance": true
        }
      },
      "recommendations": [
        "Found 1 outliers across multiple fields. Review and consider removing or correcting anomalous values.",
        "Found 12 duplicate records. Consider deduplication."
      ]
    }
  }
}
```

## Service Functions

### validateCSVData(data)

Validates CSV data format and structure.

**Parameters:**
- `data` (Array): Parsed CSV records

**Returns:**
```javascript
{
  isValid: boolean,
  errors: string[],
  warnings: string[],
  recordCount: number
}
```

### validateJSONData(data)

Validates JSON data format and structure.

**Parameters:**
- `data` (Object|Array): JSON data

**Returns:**
```javascript
{
  isValid: boolean,
  errors: string[],
  warnings: string[],
  recordCount: number
}
```

### validateSUMOXMLData(xmlString)

Validates SUMO XML format.

**Parameters:**
- `xmlString` (String): XML content

**Returns:**
```javascript
{
  isValid: boolean,
  errors: string[],
  warnings: string[],
  recordCount: number
}
```

### validateVehicleMix(vehicleMix)

Validates vehicle mix against Guyana statistics.

**Parameters:**
```javascript
{
  cars: number,        // Percentage (0-100)
  motorcycles: number, // Percentage (0-100)
  minibuses: number,   // Percentage (0-100)
  trucks: number       // Percentage (0-100)
}
```

**Returns:**
```javascript
{
  isValid: boolean,
  errors: string[],
  warnings: string[],
  deviations: {
    cars: number,
    motorcycles: number,
    minibuses: number,
    trucks: number
  },
  withinTolerance: boolean
}
```

### detectOutliers(data, field)

Detects outliers in numeric data using both Standard Deviation and IQR methods.

**Parameters:**
- `data` (Array): Data records
- `field` (String): Field name to analyze

**Returns:**
```javascript
{
  outliers: Array<{
    index: number,
    value: number,
    deviation: number,
    method: 'StdDev' | 'IQR'
  }>,
  count: number,
  mean: number,
  stdDev: number,
  median: number,
  q1: number,
  q3: number,
  iqr: number,
  lowerBound: number,
  upperBound: number,
  percentage: number
}
```

### validateDataCompleteness(data)

Validates data completeness.

**Parameters:**
- `data` (Array): Data records

**Returns:**
```javascript
{
  isValid: boolean,
  errors: string[],
  warnings: string[],
  completeness: string, // Percentage
  totalCells: number,
  filledCells: number
}
```

### validateDataConsistency(data)

Validates data consistency (duplicates, temporal order, type consistency).

**Parameters:**
- `data` (Array): Data records

**Returns:**
```javascript
{
  isValid: boolean,
  errors: string[],
  warnings: string[],
  duplicates: number,
  temporalIssues: number,
  typeInconsistencies: Object,
  consistencyScore: number
}
```

### validateDataRanges(data, rangeDefinitions)

Validates numeric values against expected ranges.

**Parameters:**
- `data` (Array): Data records
- `rangeDefinitions` (Object): Optional custom range definitions

**Returns:**
```javascript
{
  isValid: boolean,
  errors: string[],
  warnings: string[],
  violations: Object,
  violationCount: number
}
```

### calculateQualityScore(validationResults)

Calculates overall data quality score.

**Parameters:**
- `validationResults` (Object): Aggregated validation results

**Returns:**
- `score` (String): Quality score (0-100)

### generateValidationReport(validationResults)

Generates comprehensive validation report.

**Parameters:**
- `validationResults` (Object): Aggregated validation results

**Returns:**
```javascript
{
  timestamp: string,
  overallStatus: 'passed' | 'passed_with_warnings' | 'failed',
  qualityScore: string,
  summary: {
    totalErrors: number,
    totalWarnings: number,
    recordCount: number,
    completeness: number,
    consistencyScore: number
  },
  details: Object,
  recommendations: string[]
}
```

## Quality Score Interpretation

- **90-100**: Excellent quality, ready for use
- **80-89**: Good quality, minor issues
- **70-79**: Acceptable quality, some concerns
- **60-69**: Poor quality, significant issues
- **Below 60**: Unacceptable quality, requires data cleaning

## Best Practices

1. **Always validate data after upload** to ensure quality before use in simulations
2. **Review warnings carefully** even if validation passes
3. **Address outliers** by investigating their source before removal
4. **Maintain vehicle mix compliance** within ±2% of Guyana statistics
5. **Ensure temporal consistency** for time-series data
6. **Remove duplicates** to avoid skewed analysis
7. **Aim for >80% completeness** for reliable results
8. **Document data quality issues** in dataset metadata

## Error Handling

All validation functions return structured results with:
- `isValid`: Boolean indicating if validation passed
- `errors`: Array of critical issues that prevent data use
- `warnings`: Array of non-critical issues that should be reviewed

The validation endpoint returns appropriate HTTP status codes:
- `200`: Validation completed successfully
- `404`: Traffic data not found
- `500`: Validation error (file read failure, parsing error, etc.)

## Integration with Frontend

The validation results are displayed in the Data Management interface:

1. Upload dataset
2. Automatic basic validation on upload
3. Click "Validate" button for comprehensive validation
4. View detailed validation report
5. Review quality score and recommendations
6. Address issues before using data in simulations

## Requirements Satisfied

This implementation satisfies the following requirements:

- **9.1**: Data format validation (CSV, JSON, SUMO XML)
- **9.2**: Vehicle mix validation against Guyana statistics
- **9.3**: Data consistency and completeness checks
- **9.5**: Anomaly detection and quality metrics
