import { useState, useEffect } from 'react';
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

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        .global-header-wrapper {
          position: sticky;
          top: 0;
          z-index: 9999;
          background: linear-gradient(135deg, #071228 0%, #0a1420 100%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        
        @media (max-width: 768px) {
          .global-nav-links { display: none !important; }
          .global-hamburger { display: flex !important; }
        }
        
        .global-hamburger { 
          display: none; 
          background: none; 
          border: none; 
          cursor: pointer; 
          padding: 8px; 
          color: white; 
          transition: all 0.2s;
          border-radius: 4px;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          position: relative;
        }
        .global-hamburger:hover { 
          opacity: 0.8; 
          background: rgba(255,255,255,0.1);
        }
        .global-hamburger:active {
          transform: scale(0.95);
        }
        
        /* Overlay */
        .global-mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 9998;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .global-mobile-overlay.open {
          opacity: 1;
          visibility: visible;
        }
        
        /* Side Menu */
        .global-mobile-menu { 
          position: fixed;
          top: 0;
          right: 0;
          width: 280px;
          height: 100vh;
          background: linear-gradient(135deg, #071228 0%, #0a1420 100%);
          box-shadow: -4px 0 24px rgba(0,0,0,0.5);
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10000;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .global-mobile-menu.open {
          transform: translateX(0);
        }
        
        /* Menu Header */
        .global-mobile-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
        }
        .global-mobile-menu-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #fff;
        }
        .global-mobile-close {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .global-mobile-close:hover {
          background: rgba(255,255,255,0.1);
        }
        
        /* Menu Links */
        .global-mobile-menu a { 
          padding: 1rem 1.5rem; 
          color: rgba(255,255,255,0.9); 
          text-decoration: none; 
          border-bottom: 1px solid rgba(255,255,255,0.06); 
          transition: all 0.2s;
          font-weight: 500;
          font-size: 0.9375rem;
          display: block;
        }
        .global-mobile-menu a:hover { 
          background: rgba(255,255,255,0.08); 
          color: #fff;
          padding-left: 1.75rem;
        }
        .global-mobile-menu a.active { 
          color: #fbbf24; 
          background: rgba(251,191,36,0.12);
          border-left: 3px solid #fbbf24;
        }
        .global-mobile-cta {
          padding: 1rem 1.5rem;
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
        }
        .global-mobile-cta a {
          display: block;
          text-align: center;
          padding: 0.75rem 1.5rem;
          background: #f59e0b;
          color: #111827;
          font-weight: 600;
          border-radius: 0.5rem;
          text-decoration: none;
          transition: all 0.2s;
          border: none;
        }
        .global-mobile-cta a:hover {
          background: #fbbf24;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          padding-left: 1.5rem;
        }
      `}</style>

      <header className="global-header-wrapper">
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
                to="/training-results" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive('/training-results') 
                    ? 'bg-blue-700 text-white shadow-md' 
                    : 'text-white/85 hover:bg-blue-700/50 hover:text-white'
                }`}
              >
                Training
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

        {/* Mobile Overlay */}
        <div 
          className={`global-mobile-overlay ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Mobile Side Menu */}
        <div className={`global-mobile-menu ${menuOpen ? 'open' : ''}`}>
          <div className="global-mobile-menu-header">
            <span className="global-mobile-menu-title">Menu</span>
            <button 
              className="global-mobile-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <IconClose />
            </button>
          </div>
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
            to="/training-results" 
            onClick={() => setMenuOpen(false)}
            className={isActive('/training-results') ? 'active' : ''}
          >
            Training
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
          <div className="global-mobile-cta">
            <Link 
              to="/register" 
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
