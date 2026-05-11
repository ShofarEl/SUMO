import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleSubmenu = (path) => {
    setExpandedMenus(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      roles: ['admin', 'researcher', 'viewer']
    },
    {
      label: 'Map View',
      path: '/map',
      icon: '🗺️',
      roles: ['admin', 'researcher', 'viewer']
    },
    {
      label: 'Simulations',
      path: '/simulations',
      icon: '🚦',
      roles: ['admin', 'researcher']
    },
    {
      label: 'Predictions',
      path: '/predictions',
      icon: '🤖',
      roles: ['admin', 'researcher']
    },
    {
      label: 'RL Agents',
      path: '/agents',
      icon: '🧠',
      roles: ['admin', 'researcher']
    },
    {
      label: 'MARL System',
      path: '/marl',
      icon: '🔗',
      roles: ['admin', 'researcher']
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: '📈',
      roles: ['admin', 'researcher', 'viewer']
    },
    {
      label: 'Data Management',
      path: '/admin/data',
      icon: '💾',
      roles: ['admin']
    },
    {
      label: 'Models',
      path: '/models',
      icon: '⚙️',
      roles: ['admin', 'researcher']
    },
    {
      label: 'Research',
      path: '/research',
      icon: '📚',
      roles: ['admin', 'researcher', 'viewer'],
      submenu: [
        { label: 'Methodology', path: '/research/methodology' },
        { label: 'Literature Review', path: '/research/literature' },
        { label: 'Results', path: '/research/results' },
        { label: 'Feasibility', path: '/research/feasibility' },
        { label: 'References', path: '/research/references' }
      ]
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: '📄',
      roles: ['admin', 'researcher', 'viewer']
    },
    {
      label: 'User Management',
      path: '/admin/users',
      icon: '👥',
      roles: ['admin']
    },
    {
      label: 'System Config',
      path: '/admin/config',
      icon: '⚙️',
      roles: ['admin']
    },
    {
      label: 'System Logs',
      path: '/admin/logs',
      icon: '📋',
      roles: ['admin']
    }
  ];

  const visibleNavItems = navigationItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🚦</span>
            {sidebarOpen && <span className="logo-text">Georgetown Traffic AI</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <div key={item.path}>
              {item.submenu ? (
                <>
                  <button
                    className={`nav-item submenu-toggle ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => toggleSubmenu(item.path)}
                    title={!sidebarOpen ? item.label : ''}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {sidebarOpen && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <span className="submenu-arrow">
                          {expandedMenus[item.path] ? '▼' : '▶'}
                        </span>
                      </>
                    )}
                  </button>
                  {sidebarOpen && expandedMenus[item.path] && (
                    <div className="submenu">
                      {item.submenu.map((subitem) => (
                        <Link
                          key={subitem.path}
                          to={subitem.path}
                          className={`submenu-item ${isActive(subitem.path) ? 'active' : ''}`}
                        >
                          {subitem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {sidebarOpen && <span className="nav-label">{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="sidebar-footer">
            <div className="sidebar-info">
              <p className="sidebar-version">Version 1.0.0</p>
              <p className="sidebar-copyright">© 2026 Georgetown Traffic AI</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">
              {visibleNavItems.find(item => isActive(item.path))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="header-right">
            {/* User Profile Dropdown */}
            <div className="user-profile">
              <button
                className="user-profile-button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div className="user-details">
                  <span className="user-name">{user?.firstName} {user?.lastName}</span>
                  <span className="user-role-badge">{user?.role}</span>
                </div>
                <span className="dropdown-arrow">{userMenuOpen ? '▲' : '▼'}</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user?.firstName} {user?.lastName}</p>
                    <p className="dropdown-email">{user?.email}</p>
                    {user?.organization && (
                      <p className="dropdown-org">{user?.organization}</p>
                    )}
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/profile" className="dropdown-item">
                    <span className="dropdown-icon">👤</span>
                    Profile Settings
                  </Link>
                  <Link to="/preferences" className="dropdown-item">
                    <span className="dropdown-icon">⚙️</span>
                    Preferences
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="dropdown-item logout">
                    <span className="dropdown-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
