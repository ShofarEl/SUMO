import React, { useState, useEffect } from 'react';
import './MARLCoordination.css';

/**
 * MARL Coordination Visualization Component
 * 
 * Displays:
 * - Signal timing coordination across intersections
 * - Upstream/downstream traffic flow effects
 * - Network-wide performance metrics
 * - Agent communication patterns
 */
const MARLCoordination = ({ marlId, trainingData, realTimeData }) => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewMode, setViewMode] = useState('network'); // 'network', 'timeline', 'metrics'
  const [timeWindow, setTimeWindow] = useState(60); // seconds

  // Extract agent data
  const agents = trainingData?.agents || {};
  const globalMetrics = trainingData?.global || {};
  const coordinationMetrics = trainingData?.coordination_metrics || {};

  // Calculate coordination strength between agents
  const calculateCoordinationStrength = (agent1, agent2) => {
    // Based on neighbor relationships and reward correlation
    const neighbors1 = agent1.neighbors?.neighbors || [];
    const isNeighbor = neighbors1.some(n => n.id === agent2.id);
    
    if (!isNeighbor) return 0;
    
    // Simple correlation based on rewards (placeholder)
    return 0.5 + Math.random() * 0.5;
  };

  // Render network view showing agent connections
  const renderNetworkView = () => {
    const agentIds = Object.keys(agents);
    
    if (agentIds.length === 0) {
      return (
        <div className="empty-state">
          <p>No agent data available</p>
        </div>
      );
    }

    return (
      <div className="network-view">
        <svg className="network-svg" viewBox="0 0 800 600">
          {/* Draw connections between neighbors */}
          {agentIds.map((agentId, idx) => {
            const agent = agents[agentId];
            const neighbors = agent.neighbors?.neighbors || [];
            const x1 = 150 + (idx % 3) * 250;
            const y1 = 150 + Math.floor(idx / 3) * 200;

            return neighbors.map((neighbor, nIdx) => {
              const neighborIdx = agentIds.indexOf(neighbor.id);
              if (neighborIdx === -1 || neighborIdx <= idx) return null;

              const x2 = 150 + (neighborIdx % 3) * 250;
              const y2 = 150 + Math.floor(neighborIdx / 3) * 200;

              const strength = calculateCoordinationStrength(agent, agents[neighbor.id]);
              const strokeWidth = 1 + strength * 3;
              const opacity = 0.3 + strength * 0.7;

              return (
                <line
                  key={`${agentId}-${neighbor.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#4CAF50"
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  className="connection-line"
                />
              );
            });
          })}

          {/* Draw agent nodes */}
          {agentIds.map((agentId, idx) => {
            const agent = agents[agentId];
            const x = 150 + (idx % 3) * 250;
            const y = 150 + Math.floor(idx / 3) * 200;
            const isSelected = selectedAgent === agentId;

            return (
              <g
                key={agentId}
                className={`agent-node ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedAgent(agentId)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 35 : 30}
                  fill={isSelected ? '#2196F3' : '#4CAF50'}
                  stroke="#fff"
                  strokeWidth="3"
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {agentId.substring(0, 8)}
                </text>
                
                {/* Queue length indicator */}
                <rect
                  x={x - 20}
                  y={y + 40}
                  width={40}
                  height={8}
                  fill="#fff"
                  stroke="#333"
                  strokeWidth="1"
                />
                <rect
                  x={x - 20}
                  y={y + 40}
                  width={Math.min(40, (agent.queue_length || 0) / 10 * 40)}
                  height={8}
                  fill="#FF5722"
                />
              </g>
            );
          })}
        </svg>

        {/* Agent details panel */}
        {selectedAgent && (
          <div className="agent-details-panel">
            <h3>Agent: {selectedAgent}</h3>
            <div className="detail-row">
              <span>Current Phase:</span>
              <span className="phase-indicator">
                Phase {agents[selectedAgent]?.phase || 0}
              </span>
            </div>
            <div className="detail-row">
              <span>Queue Length:</span>
              <span>{agents[selectedAgent]?.queue_length || 0} vehicles</span>
            </div>
            <div className="detail-row">
              <span>Delay:</span>
              <span>{(agents[selectedAgent]?.delay || 0).toFixed(1)}s</span>
            </div>
            <div className="detail-row">
              <span>Neighbors:</span>
              <span>{agents[selectedAgent]?.neighbors?.count || 0}</span>
            </div>
            
            <h4>Neighbor States</h4>
            <div className="neighbors-list">
              {(agents[selectedAgent]?.neighbors?.neighbors || []).map(neighbor => (
                <div key={neighbor.id} className="neighbor-item">
                  <span className="neighbor-id">{neighbor.id.substring(0, 8)}</span>
                  <span className="neighbor-phase">Phase {neighbor.phase}</span>
                  <span className="neighbor-queue">Q: {neighbor.queue_length}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render timeline view showing signal coordination over time
  const renderTimelineView = () => {
    const agentIds = Object.keys(agents);
    
    if (agentIds.length === 0) {
      return (
        <div className="empty-state">
          <p>No timeline data available</p>
        </div>
      );
    }

    // Generate sample timeline data (in real implementation, use actual data)
    const timeSteps = Array.from({ length: timeWindow }, (_, i) => i);

    return (
      <div className="timeline-view">
        <div className="timeline-controls">
          <label>
            Time Window:
            <select value={timeWindow} onChange={(e) => setTimeWindow(Number(e.target.value))}>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={120}>120 seconds</option>
            </select>
          </label>
        </div>

        <div className="timeline-chart">
          <div className="timeline-labels">
            {agentIds.map(agentId => (
              <div key={agentId} className="timeline-label">
                {agentId.substring(0, 10)}
              </div>
            ))}
          </div>

          <div className="timeline-bars">
            {agentIds.map((agentId, agentIdx) => (
              <div key={agentId} className="timeline-row">
                {timeSteps.map(t => {
                  // Simulate phase changes (in real implementation, use actual data)
                  const phase = Math.floor((t + agentIdx * 15) / 30) % 4;
                  const phaseColors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336'];
                  
                  return (
                    <div
                      key={t}
                      className="timeline-cell"
                      style={{
                        backgroundColor: phaseColors[phase],
                        width: `${100 / timeWindow}%`
                      }}
                      title={`Time: ${t}s, Phase: ${phase}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="timeline-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#4CAF50' }}></span>
            <span>Phase 0 (N-S)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2196F3' }}></span>
            <span>Phase 1 (E-W)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#FF9800' }}></span>
            <span>Phase 2 (Turns)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#F44336' }}></span>
            <span>Phase 3 (All Red)</span>
          </div>
        </div>

        <div className="coordination-info">
          <h4>Coordination Patterns</h4>
          <p>
            Green waves and synchronized phases help reduce stops and delays.
            Upstream signals affect downstream traffic flow.
          </p>
        </div>
      </div>
    );
  };

  // Render metrics view showing network-wide performance
  const renderMetricsView = () => {
    return (
      <div className="metrics-view">
        <div className="metrics-grid">
          {/* Global Metrics */}
          <div className="metric-card global">
            <h3>Network-Wide Metrics</h3>
            <div className="metric-item">
              <span className="metric-label">Total Queue Length</span>
              <span className="metric-value">
                {globalMetrics.total_queue || 0} vehicles
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Total Delay</span>
              <span className="metric-value">
                {(globalMetrics.total_delay || 0).toFixed(1)}s
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Total Throughput</span>
              <span className="metric-value">
                {globalMetrics.total_throughput || 0} veh/h
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Network Efficiency</span>
              <span className="metric-value">
                {(globalMetrics.network_efficiency || 0).toFixed(3)}
              </span>
            </div>
          </div>

          {/* Coordination Metrics */}
          <div className="metric-card coordination">
            <h3>Coordination Metrics</h3>
            <div className="metric-item">
              <span className="metric-label">Synchronization Score</span>
              <span className="metric-value">
                {(coordinationMetrics.synchronization_score || 0).toFixed(3)}
              </span>
              <div className="metric-bar">
                <div
                  className="metric-bar-fill"
                  style={{
                    width: `${(coordinationMetrics.synchronization_score || 0) * 100}%`,
                    backgroundColor: '#4CAF50'
                  }}
                />
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-label">Communication Efficiency</span>
              <span className="metric-value">
                {(coordinationMetrics.communication_efficiency || 0).toFixed(3)}
              </span>
              <div className="metric-bar">
                <div
                  className="metric-bar-fill"
                  style={{
                    width: `${(coordinationMetrics.communication_efficiency || 0) * 100}%`,
                    backgroundColor: '#2196F3'
                  }}
                />
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-label">Global/Local Reward Ratio</span>
              <span className="metric-value">
                {(coordinationMetrics.global_vs_local_reward_ratio || 0).toFixed(3)}
              </span>
            </div>
          </div>

          {/* Individual Agent Performance */}
          <div className="metric-card agents">
            <h3>Individual Agent Performance</h3>
            <div className="agent-metrics-list">
              {Object.entries(agents).map(([agentId, agent]) => (
                <div key={agentId} className="agent-metric-row">
                  <span className="agent-metric-id">{agentId.substring(0, 12)}</span>
                  <div className="agent-metric-bars">
                    <div className="mini-metric">
                      <span>Q:</span>
                      <div className="mini-bar">
                        <div
                          className="mini-bar-fill"
                          style={{
                            width: `${Math.min(100, (agent.queue_length || 0) * 5)}%`,
                            backgroundColor: '#FF5722'
                          }}
                        />
                      </div>
                      <span>{agent.queue_length || 0}</span>
                    </div>
                    <div className="mini-metric">
                      <span>D:</span>
                      <div className="mini-bar">
                        <div
                          className="mini-bar-fill"
                          style={{
                            width: `${Math.min(100, (agent.delay || 0) / 2)}%`,
                            backgroundColor: '#FF9800'
                          }}
                        />
                      </div>
                      <span>{(agent.delay || 0).toFixed(0)}s</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upstream/Downstream Effects */}
          <div className="metric-card effects">
            <h3>Traffic Flow Effects</h3>
            <p className="info-text">
              Coordinated signal timing creates green waves that allow vehicles
              to pass through multiple intersections without stopping.
            </p>
            <div className="effect-diagram">
              <div className="effect-row">
                <div className="effect-intersection upstream">
                  <span>Upstream</span>
                  <div className="effect-signal green"></div>
                </div>
                <div className="effect-arrow">→</div>
                <div className="effect-intersection current">
                  <span>Current</span>
                  <div className="effect-signal green"></div>
                </div>
                <div className="effect-arrow">→</div>
                <div className="effect-intersection downstream">
                  <span>Downstream</span>
                  <div className="effect-signal green"></div>
                </div>
              </div>
              <p className="effect-description">
                When upstream signals release vehicles, coordinated downstream
                signals turn green to maintain flow and reduce stops.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="marl-coordination">
      <div className="coordination-header">
        <h2>Multi-Agent Coordination Visualization</h2>
        <div className="view-selector">
          <button
            className={viewMode === 'network' ? 'active' : ''}
            onClick={() => setViewMode('network')}
          >
            Network View
          </button>
          <button
            className={viewMode === 'timeline' ? 'active' : ''}
            onClick={() => setViewMode('timeline')}
          >
            Timeline View
          </button>
          <button
            className={viewMode === 'metrics' ? 'active' : ''}
            onClick={() => setViewMode('metrics')}
          >
            Metrics View
          </button>
        </div>
      </div>

      <div className="coordination-content">
        {viewMode === 'network' && renderNetworkView()}
        {viewMode === 'timeline' && renderTimelineView()}
        {viewMode === 'metrics' && renderMetricsView()}
      </div>

      {realTimeData && (
        <div className="real-time-indicator">
          <span className="pulse-dot"></span>
          <span>Live Data</span>
        </div>
      )}
    </div>
  );
};

export default MARLCoordination;
