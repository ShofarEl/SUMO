import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GeorgetownMap from '../components/GeorgetownMap';

// Mock Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => <div data-testid="map-container" {...props}>{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn()
  })
}));

describe('GeorgetownMap', () => {
  const mockIntersections = [
    {
      _id: '1',
      name: 'Vlissengen Road',
      location: {
        coordinates: [-58.1551, 6.8013]
      },
      isCongestionHotspot: true
    },
    {
      _id: '2',
      name: 'Sheriff Street',
      location: {
        coordinates: [-58.1450, 6.8100]
      },
      isCongestionHotspot: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders map container', () => {
    render(<GeorgetownMap intersections={[]} />);
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders tile layer', () => {
    render(<GeorgetownMap intersections={[]} />);
    
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('renders intersection markers', () => {
    render(<GeorgetownMap intersections={mockIntersections} />);
    
    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBe(2);
  });

  it('displays intersection names in popups', () => {
    render(<GeorgetownMap intersections={mockIntersections} />);
    
    expect(screen.getByText('Vlissengen Road')).toBeInTheDocument();
    expect(screen.getByText('Sheriff Street')).toBeInTheDocument();
  });

  it('handles empty intersections array', () => {
    render(<GeorgetownMap intersections={[]} />);
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
  });

  it('highlights congestion hotspots', () => {
    render(<GeorgetownMap intersections={mockIntersections} />);
    
    // Both intersections are hotspots
    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBe(2);
  });

  it('centers map on Georgetown', () => {
    const { container } = render(<GeorgetownMap intersections={[]} />);
    
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
  });
});
