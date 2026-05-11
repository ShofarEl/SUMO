import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthProvider } from '../contexts/AuthContext';

// Mock AuthContext
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'researcher'
      },
      logout: vi.fn()
    })
  };
});

describe('DashboardLayout', () => {
  const renderDashboardLayout = (children = <div>Test Content</div>) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders dashboard layout', () => {
    renderDashboardLayout();
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays user information', () => {
    renderDashboardLayout();
    
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
  });

  it('renders navigation menu', () => {
    renderDashboardLayout();
    
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulations/i)).toBeInTheDocument();
    expect(screen.getByText(/Map/i)).toBeInTheDocument();
  });

  it('renders sidebar navigation links', () => {
    renderDashboardLayout();
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('displays role-based menu items', () => {
    renderDashboardLayout();
    
    // Researcher should see these items
    expect(screen.getByText(/Predictions/i)).toBeInTheDocument();
    expect(screen.getByText(/RL Agents/i)).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderDashboardLayout(<div data-testid="child-content">Child Component</div>);
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });
});
