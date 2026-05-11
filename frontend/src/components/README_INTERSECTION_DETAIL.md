# IntersectionDetail Component

## Overview

The `IntersectionDetail` component is a comprehensive modal interface that displays detailed information about a specific intersection in the Georgetown road network. It provides multiple views of intersection data including signal timing history, queue analysis, throughput metrics, and historical performance data.

## Features

### 1. Overview Tab
- **Location Information**: Displays intersection name, OSM ID, coordinates, and connection count
- **Signal Configuration**: Shows signal type, cycle length, and number of phases
- **Current Performance**: Real-time metrics including average delay, queue length, throughput, and capacity utilization
- **Connected Streets**: Lists all streets connected to the intersection
- **Hotspot Indicator**: Visual badge for known congestion hotspots

### 2. Signal Timing Tab
- **Configured Phases**: Grid display of all signal phases with color-coded indicators
- **Phase Details**: Shows phase duration, green time, and yellow time for each phase
- **Phase Changes Over Time**: Bar chart showing signal phase duration history
- **Real-time Updates**: Displays signal timing data from simulations

### 3. Queue Analysis Tab
- **Queue Length Evolution**: Area chart showing queue length changes over time
- **Vehicles in Queue**: Line chart tracking the number of vehicles waiting
- **Average Delay**: Line chart displaying delay trends
- **Time-series Analysis**: Comprehensive view of queue formation and dissipation

### 4. Throughput Tab
- **Throughput Over Time**: Line chart comparing actual throughput vs capacity
- **Average Speed**: Area chart showing vehicle speed trends
- **Performance Summary**: Key metrics including peak throughput, average throughput, and capacity utilization
- **Efficiency Metrics**: Displays how effectively the intersection is processing traffic

### 5. Performance Tab
- **Historical Performance Cards**: Visual cards showing key metrics with trend indicators
  - Average Delay
  - Queue Length
  - Throughput
  - Efficiency
- **Trend Analysis**: Shows percentage change compared to previous period
- **Historical Comparison**: Line chart comparing delay and throughput over time
- **Long-term Trends**: Visualizes performance changes across different time periods

## Usage

### Basic Usage

```jsx
import IntersectionDetail from '../components/IntersectionDetail';

function MapPage() {
  const [selectedIntersection, setSelectedIntersection] = useState(null);

  return (
    <>
      {/* Your map component */}
      
      {selectedIntersection && (
        <IntersectionDetail
          intersection={selectedIntersection}
          onClose={() => setSelectedIntersection(null)}
        />
      )}
    </>
  );
}
```

### With Simulation Context

```jsx
<IntersectionDetail
  intersection={selectedIntersection}
  onClose={handleClose}
  simulationId={currentSimulationId}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `intersection` | Object | Yes | Intersection data object containing id, name, location, etc. |
| `onClose` | Function | Yes | Callback function to close the modal |
| `simulationId` | String | No | Optional simulation ID to filter historical data |

### Intersection Object Structure

```javascript
{
  id: string,                    // Intersection ID
  osm_id: string,               // OpenStreetMap ID
  name: string,                 // Intersection name
  lat: number,                  // Latitude
  lon: number,                  // Longitude
  degree: number,               // Number of connections
  streets: string[],            // Connected street names
  is_congestion_hotspot: boolean, // Hotspot flag
  signal_config: {              // Signal configuration
    type: string,
    cycle_length: number,
    num_phases: number,
    phases: Array<{
      phase_id: number,
      name: string,
      duration: number,
      yellow_duration: number
    }>
  },
  description: string           // Optional description
}
```

## Time Range Selection

The component supports multiple time ranges for historical data:
- **1h**: Last hour (60 data points)
- **6h**: Last 6 hours (72 data points)
- **24h**: Last 24 hours (96 data points)
- **7d**: Last 7 days (168 data points)

Users can switch between time ranges using the dropdown in the modal header.

## API Endpoints

The component fetches data from the following endpoints:

### Get Intersection History
```
GET /api/map/intersections/:id/history?timeRange=1h&simulationId=xxx
```

Returns:
- Signal phase history
- Queue length evolution
- Throughput history

### Get Intersection Metrics
```
GET /api/map/intersections/:id/metrics?timeRange=1h&simulationId=xxx
```

Returns:
- Average delay
- Average queue length
- Throughput
- Capacity utilization
- Efficiency
- Trend indicators
- Historical comparison data

## Data Visualization

The component uses **Recharts** library for all visualizations:

### Chart Types Used
1. **BarChart**: Signal phase duration history
2. **AreaChart**: Queue length evolution, average speed
3. **LineChart**: Vehicle count, delay trends, throughput, historical comparison

### Chart Features
- Responsive design (100% width)
- Interactive tooltips
- Legend for multiple data series
- Grid lines for readability
- Custom colors matching the application theme

## Styling

The component uses a dedicated CSS file (`IntersectionDetail.css`) with:
- Modal overlay with backdrop blur
- Gradient header with purple theme
- Tab-based navigation
- Responsive grid layouts
- Card-based information display
- Smooth animations and transitions
- Mobile-responsive design

### Key CSS Classes
- `.intersection-detail-modal`: Main modal container
- `.modal-overlay`: Backdrop overlay
- `.modal-content`: Modal content wrapper
- `.modal-header`: Header with title and controls
- `.modal-tabs`: Tab navigation
- `.tab-content`: Tab content area
- `.chart-container`: Chart wrapper
- `.info-card`: Information card
- `.performance-card`: Performance metric card

## State Management

The component manages the following state:
- `activeTab`: Currently selected tab
- `loading`: Loading state for data fetching
- `error`: Error message if data fetch fails
- `historicalData`: Raw historical data
- `signalHistory`: Processed signal phase data
- `queueHistory`: Processed queue data
- `throughputHistory`: Processed throughput data
- `performanceMetrics`: Aggregated performance metrics
- `timeRange`: Selected time range

## Error Handling

The component handles errors gracefully:
- Displays error messages when data fetch fails
- Provides retry button for failed requests
- Shows "No data available" messages when no historical data exists
- Includes helpful hints for generating data (e.g., "Run a simulation")

## Sample Data Generation

When no real simulation data is available, the component displays sample data for demonstration purposes. This allows users to:
- Explore the interface without running simulations
- Understand the data structure and visualizations
- Test the component functionality

## Performance Considerations

- Data fetching is optimized with Promise.all for parallel requests
- Chart rendering is limited to reasonable data point counts (max 1000)
- Time-series data is aggregated appropriately for different time ranges
- Component uses React hooks for efficient state management

## Accessibility

- Modal can be closed with the close button
- Keyboard navigation support for tabs
- Clear visual indicators for active states
- High contrast colors for readability
- Responsive design for different screen sizes

## Future Enhancements

Potential improvements for future versions:
1. Export functionality for charts and data
2. Comparison mode to compare multiple intersections
3. Real-time updates via WebSocket
4. Customizable chart types and metrics
5. Advanced filtering and data aggregation options
6. Integration with prediction models for forecasting
7. Downloadable reports in PDF format

## Requirements Addressed

This component addresses the following requirements from the spec:
- **Requirement 2.3**: Display intersection details with signal phase states
- **Requirement 7.4**: Show historical performance data with charts and metrics

## Related Components

- `GeorgetownMap`: Main map component that triggers the intersection detail modal
- `MapPage`: Page component that manages intersection selection
- `PerformanceCharts`: Similar charting components used in analytics

## Dependencies

- `react`: ^18.0.0
- `recharts`: ^2.5.0
- `axios`: ^1.4.0

## Testing

To test the component:
1. Navigate to the Map page
2. Click on any intersection marker
3. Explore different tabs in the modal
4. Change time ranges to see different data views
5. Test with and without simulation data

## Troubleshooting

### No data displayed
- Ensure the Python AI service is running
- Check that the network has been imported from OSM
- Run a simulation to generate historical data

### Charts not rendering
- Verify Recharts is installed: `npm install recharts`
- Check browser console for errors
- Ensure data format matches expected structure

### Modal not closing
- Verify onClose prop is provided
- Check for JavaScript errors in console
- Ensure overlay click handler is working
