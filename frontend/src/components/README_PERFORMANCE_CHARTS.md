# Performance Charts Component

## Overview

The `PerformanceCharts` component provides comprehensive visualization of traffic management system performance metrics using Recharts library. It displays time-series data, distributions, comparisons, and emissions analysis to help researchers and policymakers understand system behavior.

## Features Implemented

### 1. Time-Series Delay Chart
- **Type**: Line Chart
- **Purpose**: Shows average vehicle delay over 24-hour period
- **Data Points**: Hourly delay measurements
- **Highlights**: Peak hours (7-9am, 4-6:30pm) vs off-peak periods
- **Y-Axis**: Delay in seconds
- **X-Axis**: Time of day (00:00 - 23:00)

### 2. Queue Length Distribution Chart
- **Type**: Bar Chart
- **Purpose**: Displays frequency distribution of queue lengths
- **Categories**: 0-10m, 10-20m, 20-30m, 30-40m, 40-50m, 50+m
- **Y-Axis**: Frequency (number of occurrences)
- **X-Axis**: Queue length ranges
- **Use Case**: Identify most common congestion levels

### 3. Throughput Comparison Chart
- **Type**: Bar Chart with colored bars
- **Purpose**: Compare vehicle throughput across control strategies
- **Strategies Compared**:
  - Fixed Timing (baseline)
  - LSTM (ML prediction)
  - Random Forest (ML prediction)
  - DQN (single-agent RL)
  - PPO (single-agent RL)
  - MARL (multi-agent RL)
- **Y-Axis**: Throughput (vehicles/hour)
- **Color Coding**: Each strategy has unique color for easy identification

### 4. Emissions Analysis Chart
- **Type**: Pie Chart with legend
- **Purpose**: Breakdown of CO₂ emissions by vehicle type
- **Categories**:
  - Cars (55%)
  - Motorcycles (15%)
  - Minibuses (20%)
  - Trucks (10%)
- **Display**: Percentage and absolute values (kg)
- **Legend**: Detailed breakdown with colors

### 5. Queue Length Time Series
- **Type**: Area Chart
- **Purpose**: Shows queue length evolution over 24 hours
- **Y-Axis**: Queue length in meters
- **X-Axis**: Time of day
- **Visual**: Filled area for better visibility of trends

### 6. Throughput Time Series
- **Type**: Line Chart
- **Purpose**: Vehicle throughput throughout the day
- **Y-Axis**: Throughput (vehicles/hour)
- **X-Axis**: Time of day
- **Highlights**: Peak vs off-peak traffic patterns

## Component Props

```javascript
<PerformanceCharts 
  simulationId={string | null}  // Optional: Filter by specific simulation
  timeRange={string}             // Time range: '1h', '6h', '24h', '7d', '30d'
/>
```

## Data Flow

1. **Fetch Data**: Component calls `/api/analytics/metrics` endpoint
2. **Transform Data**: Raw metrics transformed into chart-ready format
3. **Generate Time Series**: Creates 24-hour data points with peak/off-peak patterns
4. **Render Charts**: Recharts components render interactive visualizations

## Chart Interactions

- **Tooltips**: Hover over data points to see exact values
- **Legend**: Click legend items to show/hide data series
- **Filter**: Dropdown to show all charts or specific chart types
- **Responsive**: Charts adapt to screen size

## Styling

- **Colors**: Consistent color scheme across all charts
- **Layout**: Grid layout with proper spacing
- **Cards**: Each chart in elevated card with hover effects
- **Typography**: Clear titles and descriptions
- **Loading States**: Spinner animation while fetching data
- **Error States**: User-friendly error messages with retry button

## Data Generation

Since real-time data may not be available initially, the component includes intelligent data generation:

- **Time Series**: Generates 24 hourly data points with realistic peak/off-peak patterns
- **Queue Distribution**: Creates distribution based on typical traffic patterns
- **Throughput Comparison**: Shows relative performance of different strategies
- **Emissions**: Calculates breakdown based on vehicle mix percentages

## Integration

### In AnalyticsPage
```javascript
import PerformanceCharts from '../components/PerformanceCharts';

<PerformanceCharts 
  simulationId={selectedSimulation} 
  timeRange={timeRange} 
/>
```

### Backend API Requirements
The component expects the following data structure from `/api/analytics/metrics`:

```javascript
{
  success: true,
  data: {
    avgDelay: number,           // Average delay in seconds
    avgQueueLength: number,     // Average queue length in meters
    throughput: number,         // Vehicles per hour
    co2Emissions: number,       // CO₂ emissions in kg
    predictionRMSE: number,     // Prediction accuracy
    predictionMAE: number       // Prediction accuracy
  }
}
```

## Requirements Satisfied

✅ **Requirement 7.2**: Display comparison views between baseline fixed-timing control, prediction-enhanced control, and RL-based adaptive control

✅ **Requirement 7.3**: Render interactive charts with time-series data for peak and off-peak scenarios

### Specific Task Completion

- ✅ Install Recharts (v3.8.1)
- ✅ Create time-series delay charts
- ✅ Build queue length distribution charts
- ✅ Create throughput comparison charts
- ✅ Add emissions analysis charts

## Chart Types Used

1. **LineChart**: Time-series delay and throughput
2. **BarChart**: Queue distribution and strategy comparison
3. **AreaChart**: Queue length time series
4. **PieChart**: Emissions breakdown

## Responsive Design

- **Desktop**: Full-width charts with optimal height
- **Tablet**: Adjusted layout for medium screens
- **Mobile**: Stacked layout with smaller fonts

## Performance Considerations

- **Lazy Loading**: Charts render only when data is available
- **Memoization**: Data transformation cached to prevent re-computation
- **Responsive Container**: Charts resize efficiently
- **Conditional Rendering**: Only selected charts render when filtered

## Future Enhancements

- Real-time data streaming via WebSocket
- Export charts as PNG/SVG images
- Custom date range selection
- Zoom and pan interactions
- Comparison of multiple simulations side-by-side
- Statistical significance indicators
- Animated transitions between data updates

## Testing

To test the component:

1. Navigate to Analytics page
2. Verify all 6 chart types render correctly
3. Test chart filter dropdown
4. Hover over data points to see tooltips
5. Test responsive behavior on different screen sizes
6. Verify loading and error states

## Dependencies

- `recharts`: ^3.8.1 - Chart library
- `axios`: HTTP client for API calls
- `react`: Component framework

## Files

- `frontend/src/components/PerformanceCharts.jsx` - Main component
- `frontend/src/components/PerformanceCharts.css` - Styling
- `frontend/src/pages/AnalyticsPage.jsx` - Integration page
- `backend/src/controllers/analytics.controller.js` - API endpoint
