import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const IconMenu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const IconClose = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .global-nav-links { display: none !important; }
          .global-hamburger { display: block !important; }
          .global-mobile-menu.open { display: flex !important; }
        }
        .global-hamburger { 
          display: none; 
          background: none; 
          border: none; 
          cursor: pointer; 
          padding: 8px; 
          color: white; 
          transition: opacity 0.2s;
          border-radius: 4px;
        }
        .global-hamburger:hover { 
          opacity: 0.8; 
          background: rgba(255,255,255,0.1);
        }
        .global-mobile-menu { 
          display: none; 
          flex-direction: column; 
          background: rgba(7,18,40,0.98); 
          border-top: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .global-mobile-menu a { 
          padding: 1rem 1.5rem; 
          color: rgba(255,255,255,0.85); 
          text-decoration: none; 
          border-bottom: 1px solid rgba(255,255,255,0.06); 
          transition: all 0.2s;
          font-weight: 500;
        }
        .global-mobile-menu a:hover { 
          background: rgba(255,255,255,0.08); 
          color: #fff;
          padding-left: 1.75rem;
        }
        .global-mobile-menu a.active { 
          color: #fbbf24; 
          background: rgba(251,191,36,0.1);
          border-left: 3px solid #fbbf24;
        }
      `}</style>

      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-lg sticky top-0 z-50 border-b border-blue-700/30">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 text-white font-bold text-lg hover:text-amber-400 transition-colors duration-200 group">
              <svg className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Georgetown Traffic AI</span>
              <span className="sm:hidden">GT AI</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="global-nav-links flex items-center space-x-1">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-blue-700 text-white shadow-md' 
                    : 'text-white/85 hover:bg-blue-700/50 hover:text-white'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/results" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive('/results') 
                    ? 'bg-blue-700 text-white shadow-md' 
                    : 'text-white/85 hover:bg-blue-700/50 hover:text-white'
                }`}
              >
                Results
              </Link>
              <Link 
                to="/simulations" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive('/simulations') 
                    ? 'bg-blue-700 text-white shadow-md' 
                    : 'text-white/85 hover:bg-blue-700/50 hover:text-white'
                }`}
              >
                Simulations
              </Link>
              <Link 
                to="/about" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive('/about') 
                    ? 'bg-blue-700 text-white shadow-md' 
                    : 'text-white/85 hover:bg-blue-700/50 hover:text-white'
                }`}
              >
                About
              </Link>
              <div className="h-6 w-px bg-white/20 mx-2"></div>
              <Link 
                to="/login" 
                className="px-3 py-2 rounded-md text-sm font-medium text-white/85 hover:bg-blue-700/50 hover:text-white transition-all duration-200"
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="px-4 py-2 rounded-md text-sm font-medium bg-amber-500 text-gray-900 hover:bg-amber-400 hover:shadow-lg transition-all duration-200 font-semibold"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <button 
              className="global-hamburger" 
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className={`global-mobile-menu ${menuOpen ? 'open' : ''}`}>
          <Link 
            to="/" 
            onClick={() => setMenuOpen(false)}
            className={isActive('/') ? 'active' : ''}
          >
            Home
          </Link>
          <Link 
            to="/results" 
            onClick={() => setMenuOpen(false)}
            className={isActive('/results') ? 'active' : ''}
          >
            Results
          </Link>
          <Link 
            to="/simulations" 
            onClick={() => setMenuOpen(false)}
            className={isActive('/simulations') ? 'active' : ''}
          >
            Simulations
          </Link>
          <Link 
            to="/about" 
            onClick={() => setMenuOpen(false)}
            className={isActive('/about') ? 'active' : ''}
          >
            About
          </Link>
          <Link 
            to="/login" 
            onClick={() => setMenuOpen(false)}
          >
            Sign In
          </Link>
          <div style={{ padding: '1rem 1.5rem', borderBottom: 'none', background: 'rgba(0,0,0,0.2)' }}>
            <Link 
              to="/register" 
              onClick={() => setMenuOpen(false)}
              className="block text-center px-4 py-3 rounded-md bg-amber-500 text-gray-900 font-semibold hover:bg-amber-400 transition-all duration-200 shadow-md hover:shadow-lg"
              style={{ color: '#111827', textDecoration: 'none' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
