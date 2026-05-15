import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserManagementPage from './pages/UserManagementPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import MapPage from './pages/MapPage';
import SimulationPage from './pages/SimulationPage';
import PredictionPage from './pages/PredictionPage';
import RLAgentPage from './pages/RLAgentPage';
import AgentTrainingPage from './pages/AgentTrainingPage';
import MARLPage from './pages/MARLPage';
import ModelManagementPage from './pages/ModelManagementPage';
import ReportsPage from './pages/ReportsPage';
import SystemConfigPage from './pages/SystemConfigPage';
import LogsViewerPage from './pages/LogsViewerPage';
import ElegantDashboard from './pages/ElegantDashboard';
import ResultsDashboard from './pages/ResultsDashboard';
import AboutPage from './pages/AboutPage';
import TrainingResultsPage from './pages/TrainingResultsPage';
import LiveSimulationPage from './pages/LiveSimulationPage';
import InteractiveSimulationPage from './pages/InteractiveSimulationPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Public Home Page - Live Simulation Dashboard */}
          <Route path="/" element={<LiveSimulationPage />} />
          
          {/* Public Results Dashboard */}
          <Route path="/results" element={<ResultsDashboard />} />
          
          {/* Public About Page */}
          <Route path="/about" element={<AboutPage />} />
          
          {/* Public Elegant Dashboard */}
          <Route path="/elegant" element={<ElegantDashboard />} />
          
          {/* Public Training Results Page */}
          <Route path="/training-results" element={<TrainingResultsPage />} />
          
          {/* Live Simulation Page (also accessible via /live-simulation) */}
          <Route path="/live-simulation" element={<LiveSimulationPage />} />
          
          {/* Interactive Simulation Page - 4-Step Guided Workflow */}
          <Route path="/interactive-simulation" element={<InteractiveSimulationPage />} />
          
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/simulations"
            element={
              <ProtectedRoute>
                <SimulationPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <PredictionPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/agents"
            element={
              <ProtectedRoute requiredRole="researcher">
                <RLAgentPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/agents/:agentId/train"
            element={
              <ProtectedRoute requiredRole="researcher">
                <AgentTrainingPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/marl"
            element={
              <ProtectedRoute requiredRole="researcher">
                <MARLPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/config"
            element={
              <ProtectedRoute requiredRole="admin">
                <SystemConfigPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute requiredRole="admin">
                <LogsViewerPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/models"
            element={
              <ProtectedRoute requiredRole="researcher">
                <ModelManagementPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
