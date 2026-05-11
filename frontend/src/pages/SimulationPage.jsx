import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SimulationConfig from '../components/SimulationConfig';
import SimulationRunner from '../components/SimulationRunner';
import SimulationHistory from '../components/SimulationHistory';
import SimulationResults from '../components/SimulationResults';
import GeorgetownMap from '../components/GeorgetownMap';
import './SimulationPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SimulationPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create'); // create, run, history, results
  const [currentSimulation, setCurrentSimulation] = useState(null);
  const [selectedResultsId, setSelectedResultsId] = useState(null);
  const [error, setError] = useState(null);

  // Map state for real-time visualization
  const [intersections, setIntersections] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [signalStates, setSignalStates] = useState({});
  const [queueFormations, setQueueFormations] = useState({});

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateSimulation = async (formData) => {
    try {
      setError(null);
      
      const response = await axios.post(`${API_URL}/simulations`, formData);
      
      if (response.data.success) {
        const simulation = response.data.data;
        setCurrentSimulation(simulation);
        setActiveTab('run');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to create simulation';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleSelectSimulation = (simulation) => {
    setCurrentSimulation(simulation);
    setActiveTab('run');
  };

  const handleViewResults = (simulationId) => {
    setSelectedResultsId(simulationId);
    setActiveTab('results');
  };

  const handleSimulationComplete = () => {
    alert('Simulation completed successfully!');
    setActiveTab('history');
  };

  const handleSimulationError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <div className="simulation-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>Georgetown Traffic AI - Simulations</h1>
          <div className="user-menu">
            <div className="user-info">
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn-nav">
              Dashboard
            </button>
            <button onClick={() => navigate('/map')} className="btn-nav">
              Map
            </button>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Simulation
        </button>
        <button
          className={`tab ${activeTab === 'run' ? 'active' : ''}`}
          onClick={() => setActiveTab('run')}
          disabled={!currentSimulation}
        >
          Run Simulation
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        {selectedResultsId && (
          <button
            className={`tab ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            Results
          </button>
        )}
      </div>

      {/* Main Content */}
      <main className="page-main">
        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)} className="btn-dismiss">×</button>
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="tab-content">
            <SimulationConfig
              onSubmit={handleCreateSimulation}
              onCancel={() => setActiveTab('history')}
            />
          </div>
        )}

        {/* Run Tab */}
        {activeTab === 'run' && currentSimulation && (
          <div className="tab-content">
            <div className="run-layout">
              <div className="run-sidebar">
                <SimulationRunner
                  simulationId={currentSimulation._id}
                  onComplete={handleSimulationComplete}
                  onError={handleSimulationError}
                />
              </div>
              <div className="run-main">
                <div className="map-section">
                  <h3>Real-Time Visualization</h3>
                  <GeorgetownMap
                    intersections={intersections}
                    vehicles={vehicles}
                    signalStates={signalStates}
                    queueFormations={queueFormations}
                    showHeatmap={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content">
            <SimulationHistory
              onSelectSimulation={handleSelectSimulation}
              onViewResults={handleViewResults}
            />
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && selectedResultsId && (
          <div className="tab-content">
            <SimulationResults
              simulationId={selectedResultsId}
              onClose={() => {
                setSelectedResultsId(null);
                setActiveTab('history');
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default SimulationPage;
