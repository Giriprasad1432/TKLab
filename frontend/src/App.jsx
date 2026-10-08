import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [metrics, setMetrics] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [capacity, setCapacity] = useState(20);
  const wsRef = useRef(null);

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setMetrics(null);
    setFrameCount(0);
    
    const ws = new WebSocket(`ws://localhost:8000/ws/analyze?capacity=${capacity}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.message && !data.error) {
        setMetrics(data);
        setFrameCount(f => f + 1);
      } else {
        console.log("Server Message:", data);
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setIsConnected(false);
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => disconnectWebSocket();
  }, []);

  const getRiskColor = (level) => {
    if (level === "SAFE") return "#10b981"; // green
    if (level === "WARNING") return "#f59e0b"; // yellow/orange
    if (level === "CRITICAL") return "#ef4444"; // red
    return "white";
  };
  
  const getHeatmapColor = (count, maxCount) => {
    if (maxCount === 0 || count === 0) return "rgba(255, 255, 255, 0.05)";
    const intensity = Math.min(1, count / Math.max(maxCount, 1));
    return `rgba(239, 68, 68, ${intensity * 0.8})`;
  };

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Crowd Behavior & Risk Monitor</h1>
        <div className="status-bar">
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? "Live Data Stream" : "Disconnected"}
          </div>
          {isConnected && <div className="frame-counter">Updates: {frameCount}</div>}
        </div>
      </header>
      
      {!isConnected && (
        <div className="connect-panel card">
          <h2>Start Live Simulation</h2>
          <div className="form-group">
            <label>Site Capacity</label>
            <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min="1" />
          </div>
          <button onClick={connectWebSocket} className="btn-primary">Connect to WebSocket</button>
        </div>
      )}

      {isConnected && (
        <div className="controls-panel">
          <button onClick={disconnectWebSocket} className="btn-danger">Stop Stream</button>
        </div>
      )}

      {metrics && metrics.frame_base64 && (
        <div className="video-container card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>Live Camera Feed</h3>
            <img 
              src={`data:image/jpeg;base64,${metrics.frame_base64}`} 
              alt="Live Crowd Feed" 
              style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} 
            />
        </div>
      )}

      {metrics && (
        <div className="dashboard-grid">
          
          {/* Top Section */}
          <div className="card risk-card" style={{ borderTop: `6px solid ${getRiskColor(metrics.risk_level)}` }}>
            <h2 style={{ color: getRiskColor(metrics.risk_level) }}>{metrics.risk_level}</h2>
            <div className="primary-metric">Risk Score: {metrics.risk_score}</div>
            <div className="sub-metrics">
              <div>
                <span className="label">People Count</span>
                <span className="value">{metrics.people_count}</span>
              </div>
              <div>
                <span className="label">Occupancy</span>
                <span className="value" style={{ color: metrics.occupancy > 100 ? '#ef4444' : 'inherit' }}>
                  {metrics.occupancy}%
                </span>
              </div>
              <div>
                <span className="label">Capacity Status</span>
                <span className="value" style={{ color: metrics.capacity_status === 'OVER_CAPACITY' ? '#ef4444' : 'inherit' }}>
                  {metrics.capacity_status || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Crowd Distribution */}
          <div className="card distribution-card">
            <h3>Crowd Distribution (3x3 Grid)</h3>
            <div className="heatmap-grid">
              {[1,2,3,4,5,6,7,8,9].map(i => {
                const zoneCount = metrics.zone_density[`zone_${i}`];
                return (
                  <div 
                    key={i} 
                    className="heatmap-cell"
                    style={{ backgroundColor: getHeatmapColor(zoneCount, metrics.max_zone_people) }}
                  >
                    {zoneCount}
                  </div>
                )
              })}
            </div>
            <div className="zone-stats">
              <div>Most Congested Zone: <strong>{metrics.max_zone_people} people</strong> ({metrics.max_zone_percentage}%)</div>
            </div>
          </div>

          {/* Movement & Behavior Features */}
          <div className="card movement-card">
            <h3>Behavior Indicators</h3>
            <div className="metrics-list">
              <div className="metric-item">
                <span className="label">Average Speed</span>
                <span className="value">{metrics.average_speed} px/s</span>
              </div>
              <div className="metric-item">
                <span className="label">Average Acceleration</span>
                <span className="value">{metrics.average_acceleration} px/s²</span>
              </div>
              <div className="metric-item">
                <span className="label">Speed Variance</span>
                <span className="value">{metrics.speed_variance}</span>
              </div>
              <div className="metric-item">
                <span className="label">Dominant Direction</span>
                <span className="value">{metrics.dominant_direction}°</span>
              </div>
              <div className="metric-item">
                <span className="label">Direction Consistency</span>
                <span className="value">{metrics.direction_consistency}</span>
              </div>
              <div className="metric-item">
                <span className="label">Collective Movement</span>
                <span className="value">{metrics.collective_movement_percentage}%</span>
              </div>
              <div className="metric-item">
                <span className="label">Density Change (3s)</span>
                <span className="value">{metrics.density_change > 0 ? '+' : ''}{metrics.density_change}</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;
