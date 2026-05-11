import { Link } from 'react-router-dom';
import '../styles/elegant-theme.css';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, #071228 0%, #0f2847 100%)', 
        padding: '1.25rem 3.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Georgetown Traffic AI
          </Link>
          <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Home</Link>
            <Link to="/results" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Results</Link>
            <Link to="/about" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>About</Link>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Sign In</Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, #071228 0%, #0f2847 100%)', 
        padding: '4rem 2rem',
        textAlign: 'center',
        color: '#fff'
      }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          About This Research
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.8)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
          A Master's thesis exploring AI-driven traffic management solutions for Georgetown, Guyana
        </p>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' }}>
        
        {/* Project Overview */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>
            Project Overview
          </h2>
          <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: 1.8, marginBottom: '1rem' }}>
            This research project investigates the application of Artificial Intelligence techniques to predict and manage 
            urban traffic congestion in Georgetown, Guyana. The study focuses on evaluating machine learning prediction 
            models and reinforcement learning-based adaptive signal control through simulation-based analysis.
          </p>
          <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: 1.8 }}>
            Georgetown faces significant traffic challenges due to rapid urbanization, increasing vehicle ownership, and 
            limited road infrastructure. Traditional fixed-timing traffic signals cannot adapt to dynamic traffic conditions, 
            leading to prolonged delays and congestion. This research explores whether AI-based solutions can provide 
            effective alternatives.
          </p>
        </section>

        {/* Research Objectives */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>
            Research Objectives
          </h2>
          <div style={{ background: '#f9fafb', padding: '2rem', borderRadius: '0.75rem', borderLeft: '4px solid #2563eb' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, marginBottom: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#2563eb', fontWeight: 700 }}>1.</span>
                Evaluate the effectiveness of AI-based predictive techniques (LSTM, Random Forest) in forecasting 
                short-term traffic congestion compared to traditional methods
              </li>
              <li style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, marginBottom: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#2563eb', fontWeight: 700 }}>2.</span>
                Assess how reinforcement learning algorithms (DQN, MARL) can optimize traffic signal timing at 
                key intersections in Georgetown
              </li>
              <li style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, paddingLeft: '1.5rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#2563eb', fontWeight: 700 }}>3.</span>
                Identify data infrastructure and governance frameworks required to implement AI-driven traffic 
                management systems in resource-constrained urban environments
              </li>
            </ul>
          </div>
        </section>

        {/* Methodology */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>
            Methodology
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.75rem' }}>
                Simulation Platform
              </h3>
              <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: 1.7 }}>
                SUMO (Simulation of Urban Mobility) for microscopic traffic modeling with Georgetown's actual road network
              </p>
            </div>
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.75rem' }}>
                ML Models
              </h3>
              <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: 1.7 }}>
                LSTM and Random Forest models for traffic prediction with RMSE and MAE evaluation metrics
              </p>
            </div>
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.75rem' }}>
                RL Agents
              </h3>
              <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: 1.7 }}>
                Deep Q-Network (DQN) and Multi-Agent RL for adaptive signal control and network-wide coordination
              </p>
            </div>
          </div>
        </section>

        {/* Key Findings */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>
            Key Findings
          </h2>
          <div style={{ background: '#ecfdf5', padding: '2rem', borderRadius: '0.75rem', borderLeft: '4px solid #10b981' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ fontSize: '1rem', color: '#065f46', lineHeight: 1.8, marginBottom: '1rem', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', marginRight: '0.75rem', fontSize: '1.25rem' }}>✓</span>
                DQN agent achieved <strong>35.8% reduction</strong> in average vehicle delay (42.7s → 27.5s)
              </li>
              <li style={{ fontSize: '1rem', color: '#065f46', lineHeight: 1.8, marginBottom: '1rem', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', marginRight: '0.75rem', fontSize: '1.25rem' }}>✓</span>
                Queue lengths reduced by <strong>39.6%</strong> compared to fixed-timing baseline
              </li>
              <li style={{ fontSize: '1rem', color: '#065f46', lineHeight: 1.8, marginBottom: '1rem', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', marginRight: '0.75rem', fontSize: '1.25rem' }}>✓</span>
                LSTM model achieved prediction accuracy with RMSE of 0.0263 and MAE of 0.02
              </li>
              <li style={{ fontSize: '1rem', color: '#065f46', lineHeight: 1.8, display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', marginRight: '0.75rem', fontSize: '1.25rem' }}>✓</span>
                Multi-agent coordination improved network-wide throughput by 15-25%
              </li>
            </ul>
          </div>
        </section>

        {/* Technology Stack */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>
            Technology Stack
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { category: 'Simulation', tech: 'SUMO, OSMnx, NetworkX' },
              { category: 'Machine Learning', tech: 'TensorFlow, Scikit-learn' },
              { category: 'Deep Learning', tech: 'PyTorch, Keras' },
              { category: 'Backend', tech: 'Node.js, Express, FastAPI' },
              { category: 'Frontend', tech: 'React, Vite, Recharts' },
              { category: 'Database', tech: 'MongoDB, Redis' },
            ].map(({ category, tech }) => (
              <div key={category} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {category}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                  {tech}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Limitations */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>
            Limitations & Future Work
          </h2>
          <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: 1.8, marginBottom: '1rem' }}>
            This study is based on simulation rather than real-world deployment. Results use estimated traffic data 
            and proxy datasets due to limited historical data availability in Georgetown. The findings demonstrate 
            technical feasibility but require validation through pilot implementations.
          </p>
          <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: 1.8 }}>
            Future work includes: deploying pilot systems at selected intersections, integrating real-time data from 
            SRIS cameras and GPS traces, conducting field validation studies, and developing comprehensive data 
            governance frameworks for citywide implementation.
          </p>
        </section>

        {/* Contact/CTA */}
        <section style={{ background: '#f9fafb', padding: '2.5rem', borderRadius: '0.875rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
            Explore the Platform
          </h2>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            Access the full research platform to run simulations, train models, and explore detailed analytics.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/results" style={{
              padding: '0.75rem 2rem',
              background: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
            }}>
              View Results
            </Link>
            <Link to="/register" style={{
              padding: '0.75rem 2rem',
              background: '#fff',
              color: '#374151',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              border: '1.5px solid #e5e7eb',
            }}>
              Create Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: '#111827', padding: '2.5rem 1.5rem', textAlign: 'center', marginTop: '4rem' }}>
        <p style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.375rem' }}>Georgetown Traffic AI</p>
        <p style={{ color: '#9ca3af', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Master's Thesis Research Project</p>
        <p style={{ color: '#6b7280', fontSize: '0.8125rem' }}>Simulation-based feasibility study for AI-driven traffic management</p>
      </footer>
    </div>
  );
}
