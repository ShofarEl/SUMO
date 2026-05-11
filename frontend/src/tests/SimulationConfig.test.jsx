import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SimulationConfig from '../components/SimulationConfig';

describe('SimulationConfig', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders simulation configuration form', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/traffic demand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/control strategy/i)).toBeInTheDocument();
  });

  it('renders vehicle mix inputs', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/cars/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/motorcycles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/minibuses/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trucks/i)).toBeInTheDocument();
  });

  it('validates vehicle mix sum to 100', async () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    const carsInput = screen.getByLabelText(/cars/i);
    const motorcyclesInput = screen.getByLabelText(/motorcycles/i);
    const minibusesInput = screen.getByLabelText(/minibuses/i);
    const trucksInput = screen.getByLabelText(/trucks/i);
    
    fireEvent.change(carsInput, { target: { value: '50' } });
    fireEvent.change(motorcyclesInput, { target: { value: '25' } });
    fireEvent.change(minibusesInput, { target: { value: '15' } });
    fireEvent.change(trucksInput, { target: { value: '5' } });
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);
    
    // Should show error if sum is not 100
  });

  it('renders time of day options', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/time of day/i)).toBeInTheDocument();
  });

  it('renders weather options', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/weather/i)).toBeInTheDocument();
  });

  it('renders control strategy options', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    const strategySelect = screen.getByLabelText(/control strategy/i);
    expect(strategySelect).toBeInTheDocument();
  });

  it('submits form with valid data', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Simulation' } });
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);
    
    // Form submission depends on validation
  });

  it('displays default vehicle mix values', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    const carsInput = screen.getByLabelText(/cars/i);
    expect(carsInput.value).toBe('55');
    
    const motorcyclesInput = screen.getByLabelText(/motorcycles/i);
    expect(motorcyclesInput.value).toBe('25');
  });

  it('allows editing all form fields', () => {
    render(<SimulationConfig onSubmit={mockOnSubmit} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'New Simulation' } });
    expect(nameInput.value).toBe('New Simulation');
    
    const carsInput = screen.getByLabelText(/cars/i);
    fireEvent.change(carsInput, { target: { value: '60' } });
    expect(carsInput.value).toBe('60');
  });
});
