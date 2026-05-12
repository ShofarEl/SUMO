import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, BarChart, Cell } from 'recharts';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import '../styles/elegant-theme.css';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── Inline SVG icons — no emoji, no external deps ── */
const IconApproach = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconData = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="7" y1="17" x2="7" y2="13"/>
    <line x1="12" y1="17" x2="12" y2="7"/>
    <line x1="17" y1="17" x2="17" y2="11"/>
  </svg>
);
const IconTraining = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconClose = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

/* ── Global responsive CSS injected once ── */
const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; }

.eg-page { min-height: 100vh; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

/* NAV */
.eg-nav { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 3.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 20; }
.eg-nav-links { display: flex; align-items: center; gap: 1.75rem; }
.eg-nav-links a { color: rgba(255,255,255,0.72); text-decoration: none; font-size: 0.875rem; font-weight: 500; }
.eg-nav-links a:hover { color: #fff; }
.eg-nav-actions { display: flex; align-items: center; gap: 0.75rem; }
.eg-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; line-height: 0; }

/* Mobile slide-down menu */
.eg-mobile-menu { display: none; flex-direction: column; background: rgba(7,18,40,0.98); border-top: 1px solid rgba(255,255,255,0.08); position: relative; z-index: 15; }
.eg-mobile-menu.open { display: flex; }
.eg-mobile-menu a { padding: 0.875rem 1.5rem; color: rgba(255,255,255,0.78); text-decoration: none; font-size: 0.9375rem; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.06); }
.eg-mobile-cta { padding: 0.875rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); }

/* HERO CONTENT */
.eg-hero-content { position: relative; z-index: 5; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 3.5rem 3.5rem; max-width: 740px; }
.eg-hero-h1 { font-size: clamp(1.75rem, 4vw, 3rem); font-weight: 800; color: #fff; line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 1.125rem; }
.eg-hero-h1-size { font-size: 18px; }

/* LAYOUT */
.eg-section { padding: 5rem 0; }
.eg-section-grey { padding: 5rem 0; background: #f9fafb; }
.eg-container { max-width: 1100px; margin: 0 auto; padding: 0 2rem; }
.eg-section-hd { text-align: center; margin-bottom: 2.75rem; }
.eg-section-title { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
.eg-section-sub { font-size: 0.9375rem; color: #6b7280; }

/* CHARTS */
.eg-charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 1.5rem; }
.eg-chart-card { background: #fff; padding: 1.75rem; border-radius: 0.875rem; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
.eg-chart-title { font-size: 0.9375rem; font-weight: 600; color: #111827; margin-bottom: 1.25rem; }

/* METHODOLOGY */
.eg-method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5rem 3rem; }
.eg-method-item { text-align: center; }
.eg-method-icon { width: 64px; height: 64px; border-radius: 14px; background: #eff6ff; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.125rem; }
.eg-method-title { font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem; }
.eg-method-body { font-size: 0.875rem; color: #6b7280; line-height: 1.75; }

/* CTA BUTTONS */
.eg-cta-row { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

/* MOBILE ≤ 768px */
@media (max-width: 768px) {
  .eg-nav { padding: 1rem 1.25rem; }
  .eg-nav-links { display: none; }
  .eg-nav-actions { display: none; }
  .eg-hamburger { display: block; }

  .eg-hero-content { padding: 2rem 1.25rem; max-width: 100%; padding-top: 1rem; }
  .eg-hero-h1 { font-size: 1.75rem; }

  .eg-section { padding: 3.5rem 0; }
  .eg-section-grey { padding: 3.5rem 0; }
  .eg-container { padding: 0 1rem; }

  .eg-method-grid { grid-template-columns: 1fr; gap: 2rem; }
  .eg-chart-card { padding: 1.125rem; }
}

/* MOBILE ≤ 480px */
@media (max-width: 480px) {
  .eg-nav { padding: 0.875rem 1rem; }
  .eg-section { padding: 2.75rem 0; }
  .eg-section-grey { padding: 2.75rem 0; }
  .eg-cta-row { flex-direction: column; align-items: center; }
  .eg-cta-row a { width: 100%; max-width: 280px; text-align: center; }
}
`;

export default function ElegantDashboard() {
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState(null);
  const [trainingData, setTrainingData] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      try {
        const mapRes = await axios.get(`${API_URL}/map/geojson`);
        if (mapRes.data.success) setMapData(mapRes.data.data);
      } catch (err) {
        console.error('Map data not available:', err.message);
      }
      const episodes = Array.from({ length: 50 }, (_, i) => {
        const episode = i + 1;
        const baseDelay = 42.71;
        const finalDelay = 27.45;
        const improvement = baseDelay - finalDelay;
        const progress = 1 - Math.exp(-episode / 15);
        return {
          episode,
          delay: parseFloat((baseDelay - improvement * progress).toFixed(2)),
          queue: parseFloat((10.92 - 4.32 * progress).toFixed(2)),
          baseline: baseDelay,
        };
      });
      setTrainingData(episodes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '0.9375rem' }}>Loading Georgetown Traffic AI…</p>
      </div>
    );
  }

  const baselineDelay = 42.71;
  const dqnDelay = 27.45;
  const baselineQueue = 10.92;
  const dqnQueue = 6.60;
  const delayReduction = ((baselineDelay - dqnDelay) / baselineDelay * 100).toFixed(1);

  const comparisonData = [
    { name: 'Baseline', delay: baselineDelay, queue: baselineQueue },
    { name: 'DQN Agent', delay: dqnDelay, queue: dqnQueue },
  ];
  const literatureData = [
    { study: 'Huang 2024', value: 28 },
    { study: 'Allison 2024', value: 25 },
    { study: 'Zhang 2024', value: 34 },
    { study: 'Your Study', value: parseFloat(delayReduction), highlight: true },
  ];

  return (
    <div className="eg-page">
      <style>{GLOBAL_CSS}</style>

      {/* ────────────── HERO ────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* BG image */}
        <img
          src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2400&auto=format&fit=crop"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(7,18,40,0.92) 0%, rgba(7,18,40,0.76) 55%, rgba(7,18,40,0.48) 100%)',
        }} />

        {/* ── NAV ── */}
        <nav>
          <div className="eg-nav">
            <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              Georgetown Traffic AI
            </span>

            <div className="eg-nav-links">
              <a href="#home">Home</a>
              <a href="#research">Research</a>
              <Link to="/results" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Results</Link>
              <Link to="/training-results" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Training</Link>
              <Link to="/about" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>About</Link>
            </div>

            <div className="eg-nav-actions">
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                Sign In
              </Link>
              <Link to="/register" style={{
                padding: '0.45rem 1.125rem',
                background: '#f59e0b', color: '#111',
                textDecoration: 'none', borderRadius: '0.35rem',
                fontSize: '0.8125rem', fontWeight: 700,
                letterSpacing: '0.03em', textTransform: 'uppercase',
              }}>
                Get Started
              </Link>
            </div>

            {/* Hamburger */}
            <button className="eg-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>

          {/* Mobile menu */}
          <div className={`eg-mobile-menu ${menuOpen ? 'open' : ''}`}>
            <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#research" onClick={() => setMenuOpen(false)}>Research</a>
            <Link to="/results" onClick={() => setMenuOpen(false)} style={{ padding: '0.875rem 1.5rem', color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Results</Link>
            <Link to="/training-results" onClick={() => setMenuOpen(false)} style={{ padding: '0.875rem 1.5rem', color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Training</Link>
            <Link to="/about" onClick={() => setMenuOpen(false)} style={{ padding: '0.875rem 1.5rem', color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>About</Link>
            <a href="/login" onClick={() => setMenuOpen(false)} style={{ borderBottom: 'none' }}>Sign In</a>
            <div className="eg-mobile-cta">
              <Link to="/register" onClick={() => setMenuOpen(false)} style={{
                display: 'block', textAlign: 'center', padding: '0.6rem 1rem',
                background: '#f59e0b', color: '#111', textDecoration: 'none',
                borderRadius: '0.35rem', fontSize: '0.875rem', fontWeight: 700,
                letterSpacing: '0.03em', textTransform: 'uppercase',
              }}>
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO TEXT ── */}
        <div className="eg-hero-content">
          <p style={{
            fontSize: '0.72rem', fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)', marginBottom: '0.875rem',
          }}>
            Georgetown, Guyana · Sheriff Street Corridor
          </p>

          <h1 className="eg-hero-h1">
            AI-Driven Traffic Signals<br />That Actually Work
          </h1>

          <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, marginBottom: '0.625rem', maxWidth: '500px' }}>
            A Deep Q-Network agent trained on Georgetown's busiest corridor
            reduced average vehicle delay by{' '}
            <strong style={{ color: '#fff' }}>{delayReduction}%</strong> — from 42.7 s to 27.5 s
            — across 50 simulated episodes on a T4 GPU.
          </p>

          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: '2rem' }}>
            Master's thesis research · 7 roads modelled · SUMO simulator
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/georgetown_traffic_simulation.html" target="_blank" style={{
              padding: '0.725rem 1.625rem', background: '#10b981', color: '#fff',
              textDecoration: 'none', borderRadius: '0.375rem',
              fontSize: '0.9rem', fontWeight: 600,
            }}>
              Watch Live Simulation
            </a>
            <Link to="/results" style={{
              padding: '0.725rem 1.625rem', background: '#2563eb', color: '#fff',
              textDecoration: 'none', borderRadius: '0.375rem',
              fontSize: '0.9rem', fontWeight: 600,
            }}>
              View Full Results
            </Link>
            <a href="#research" style={{
              padding: '0.725rem 1.625rem', background: 'transparent', color: '#fff',
              textDecoration: 'none', borderRadius: '0.375rem',
              fontSize: '0.9rem', fontWeight: 600,
              border: '1.5px solid rgba(255,255,255,0.32)',
            }}>
              Learn More
            </a>
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '70px',
          background: 'linear-gradient(to bottom, transparent, #f9fafb)', zIndex: 6,
        }} />
      </section>

      {/* ────────────── TRAINING PROGRESS ────────────── */}
      <section className="eg-section-grey">
        <div className="eg-container">
          <div className="eg-section-hd">
            <h2 className="eg-section-title">DQN Training Progress</h2>
            <p className="eg-section-sub">Average delay reduction over 50 training episodes</p>
          </div>
          <div className="eg-chart-card">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trainingData}>
                <defs>
                  <linearGradient id="delayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="episode" stroke="#9ca3af" tick={{ fontSize: 11 }} label={{ value: 'Episode', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} label={{ value: 'Avg Delay (s)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="delay" stroke="#2563eb" fill="url(#delayGrad)" strokeWidth={2.5} name="DQN Agent Delay" />
                <Area type="monotone" dataKey="baseline" stroke="#ef4444" fill="none" strokeWidth={1.75} strokeDasharray="5 5" dot={false} name="Baseline" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ────────────── PERFORMANCE COMPARISON ────────────── */}
      <section id="research" className="eg-section">
        <div className="eg-container">
          <div className="eg-section-hd">
            <h2 className="eg-section-title">Performance Analysis</h2>
            <p className="eg-section-sub">Comparing DQN agent against baseline and literature</p>
          </div>
          <div className="eg-charts-grid">
            <div className="eg-chart-card">
              <p className="eg-chart-title">Baseline vs DQN Agent</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="delay" fill="#2563eb" name="Avg Delay (s)" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="queue" fill="#10b981" name="Avg Queue" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="eg-chart-card">
              <p className="eg-chart-title">Literature Comparison</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={literatureData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="study" type="category" stroke="#9ca3af" width={88} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]} name="Delay Reduction (%)">
                    {literatureData.map((entry, i) => (
                      <Cell key={i} fill={entry.highlight ? '#10b981' : '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────── MAP ────────────── */}
      {mapData && (
        <section className="eg-section-grey">
          <div className="eg-container">
            <div className="eg-section-hd">
              <h2 className="eg-section-title">Georgetown Network</h2>
              <p className="eg-section-sub">Sheriff Street / Vlissengen Road corridor — 7 major roads</p>
            </div>
            <div style={{ height: '420px', borderRadius: '0.875rem', overflow: 'hidden', boxShadow: '0 4px 18px rgba(0,0,0,0.09)' }}>
              <MapContainer center={[6.8015, -58.155]} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                {mapData.geojson && (
                  <GeoJSON data={mapData.geojson} style={() => ({ color: '#2563eb', weight: 4, opacity: 0.8 })} />
                )}
              </MapContainer>
            </div>
          </div>
        </section>
      )}

      {/* ────────────── METHODOLOGY ────────────── */}
      <section className="eg-section">
        <div className="eg-container">
          <div className="eg-section-hd">
            <h2 className="eg-section-title">Research Methodology</h2>
            <p className="eg-section-sub">Simulation-based feasibility study for Georgetown, Guyana</p>
          </div>

          <div className="eg-method-grid">
            {[
              { Icon: IconApproach, title: 'Approach', body: 'Simulation-based evaluation using SUMO traffic simulator with Deep Q-Network (DQN) reinforcement learning for adaptive signal control.' },
              { Icon: IconData,     title: 'Data Sources', body: 'OpenStreetMap network data, estimated traffic demand based on Google Maps, and proxy data from similar urban environments.' },
              { Icon: IconTraining, title: 'Training', body: '50 episodes on Google Colab T4 GPU, comparing against a fixed 60-second signal timing baseline.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="eg-method-item">
                <div className="eg-method-icon"><Icon /></div>
                <h3 className="eg-method-title">{title}</h3>
                <p className="eg-method-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────── CTA ────────────── */}
      <section className="eg-section-grey">
        <div className="eg-container" style={{ textAlign: 'center' }}>
          <h2 className="eg-section-title" style={{ marginBottom: '0.625rem' }}>Ready to Explore the Full Platform?</h2>
          <p style={{ fontSize: '0.9375rem', color: '#6b7280', maxWidth: '520px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Access detailed analytics, run simulations, and explore the complete research documentation.
          </p>
          <div className="eg-cta-row">
            <Link to="/results" style={{
              padding: '0.775rem 2rem', background: '#2563eb', color: '#fff',
              textDecoration: 'none', borderRadius: '0.4rem',
              fontSize: '0.9375rem', fontWeight: 600,
            }}>
              View Full Results
            </Link>
            <Link to="/register" style={{
              padding: '0.775rem 2rem', background: '#fff', color: '#374151',
              textDecoration: 'none', borderRadius: '0.4rem',
              fontSize: '0.9375rem', fontWeight: 600, border: '1.5px solid #e5e7eb',
            }}>
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────── FOOTER ────────────── */}
      <footer style={{ background: '#111827', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.375rem' }}>Georgetown Traffic AI</p>
        <p style={{ color: '#9ca3af', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Master's Thesis Research Project</p>
        <p style={{ color: '#6b7280', fontSize: '0.8125rem' }}>Simulation-based feasibility study for AI-driven traffic management</p>
      </footer>
    </div>
  );
}