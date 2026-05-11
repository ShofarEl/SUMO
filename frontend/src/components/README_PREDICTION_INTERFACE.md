# Frontend Prediction Interface

## Overview

This document describes the implementation of the Frontend Prediction Interface (Task 8) for the Georgetown Traffic AI Management System. The interface allows researchers to generate traffic predictions using LSTM and Random Forest models, visualize results, and compare model performance.

## Components Implemented

### 1. PredictionInput Component (`PredictionInput.jsx`)

**Purpose**: Form for configuring and submitting traffic prediction requests

**Features**:
- Model selection (LSTM or Random Forest)
- Configurable sequence length and prediction horizon
- Historical traffic data input with multiple data points
- Support for queue length, vehicle arrivals, time of day, and weather conditions
- Sample data generation for quick testing
- Form validation with error messages
- Responsive design

**Data Format**:
```javascript
{
  modelType: 'lstm' | 'rf',
  modelName: string,
  sequenceLength: number,
  predictionHorizon: number,
  historicalData: [
    {
      queue_length: number,
      vehicle_arrivals: number,
      time_of_day: number (0-1),
      weather: number (0=clear, 1=rain, 2=flood)
    }
  ]
}
```

### 2. PredictionResults Component (`PredictionResults.jsx`)

**Purpose**: Visualize prediction results with charts and metrics

**Features**:
- Performance metrics display (RMSE, MAE, R² Score, Processing Time)
- Target achievement indicators
- Line chart showing predicted vs actual queue lengths
- Confidence interval visualization with area chart
- Baseline comparison
- Detailed prediction table
- Improvement over baseline calculation
- Responsive charts using Recharts library

**Metrics Displayed**:
- RMSE (Root Mean Square Error)
- MAE (Mean Absolute Error)
- R² Score (coefficient of determination)
- Processing time
- Confidence intervals (if available)

**Target Thresholds**:
- LSTM: RMSE < 0.0263, MAE < 0.02
- Random Forest: RMSE < 0.0352, MAE < 0.025

### 3. ModelComparison Component (`ModelComparison.jsx`)

**Purpose**: Side-by-side comparison of multiple prediction models

**Features**:
- Summary cards for each model with key metrics
- Bar charts comparing RMSE, MAE, and R² Score
- Processing time comparison
- Radar chart for overall performance visualization
- Detailed comparison table with best model indicators
- Target achievement status
- Export functionality (CSV and JSON)
- Recommendation section

**Comparison Metrics**:
- Accuracy (RMSE)
- Precision (MAE)
- Speed (Processing Time)
- Reliability (R² Score)

**Export Formats**:
- CSV: Tabular data with all metrics
- JSON: Complete comparison data structure

### 4. PredictionPage Component (`PredictionPage.jsx`)

**Purpose**: Main page integrating all prediction components

**Features**:
- Tab-based navigation (Input, Results, Comparison)
- API integration with backend prediction endpoints
- Loading states and error handling
- Action buttons for workflow navigation
- Responsive layout

**Workflow**:
1. User fills out prediction input form
2. Submit generates prediction via API
3. Results are displayed with visualizations
4. User can compare multiple models
5. Export comparison data

## API Integration

### Endpoints Used

**Generate LSTM Prediction**:
```
POST /api/predictions/lstm
Body: {
  model_name: string,
  input_sequence: array
}
```

**Generate Random Forest Prediction**:
```
POST /api/predictions/rf
Body: {
  model_name: string,
  input_sequence: array
}
```

**Compare Models**:
```
POST /api/predictions/compare
Body: {
  model_names: string[],
  test_data: array,
  actual_values: array
}
```

## Styling

All components use consistent styling with:
- CSS custom properties for theming
- Dark mode support via `prefers-color-scheme`
- Responsive design with mobile breakpoints
- Consistent color scheme matching the application theme

## Dependencies Added

- **recharts**: ^2.x - React charting library for data visualization

## Navigation

The prediction interface is accessible from:
- Dashboard: "Predictions" quick action card
- Direct route: `/predictions`
- Protected route requiring authentication

## Requirements Satisfied

✅ **Requirement 4.1**: Traffic prediction input form with historical data fields
✅ **Requirement 4.3**: Prediction results visualization with charts
✅ **Requirement 4.4**: Display predicted vs actual with confidence intervals
✅ **Requirement 4.5**: Model comparison interface with performance metrics

## Usage Example

1. Navigate to `/predictions`
2. Select model type (LSTM or Random Forest)
3. Enter model name
4. Add historical traffic data points or load sample data
5. Click "Generate Prediction"
6. View results with charts and metrics
7. Click "Compare Models" to compare different models
8. Export comparison data as needed

## Future Enhancements

- Model training interface
- Historical prediction history
- Real-time prediction updates
- Integration with simulation results
- Advanced filtering and search
- Batch prediction support
- Model performance tracking over time

## Files Created

1. `frontend/src/components/PredictionInput.jsx`
2. `frontend/src/components/PredictionInput.css`
3. `frontend/src/components/PredictionResults.jsx`
4. `frontend/src/components/PredictionResults.css`
5. `frontend/src/components/ModelComparison.jsx`
6. `frontend/src/components/ModelComparison.css`
7. `frontend/src/pages/PredictionPage.jsx`
8. `frontend/src/pages/PredictionPage.css`

## Files Modified

1. `frontend/src/App.jsx` - Added prediction route
2. `frontend/src/pages/DashboardPage.jsx` - Added predictions link
3. `frontend/package.json` - Added recharts dependency
