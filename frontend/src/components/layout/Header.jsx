import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  Clock, 
  Bell, 
  Volume2, 
  VolumeX, 
  Power, 
  Activity,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

export default function Header({ 
  isConnected, 
  onConnect, 
  onDisconnect, 
  capacity, 
  setCapacity,
  metrics,
  soundEnabled,
  setSoundEnabled 
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCritical = metrics?.risk_level === 'CRITICAL';
  const isWarning = metrics?.risk_level === 'WARNING';

  return (
    <header className="ctrl-header">
      {/* Brand & System Identifier */}
      <div className="header-brand">
        <div className="logo-icon-box">
          <ShieldAlert className="logo-icon text-primary" size={24} />
        </div>
        <div className="brand-text">
          <div className="brand-title">
            STAMPADE <span className="brand-badge">CONTROL CENTER</span>
          </div>
          <div className="brand-subtitle">Crowd Safety & Stampede Prevention Operations</div>
        </div>
      </div>

      {/* Center Operational Status Pill */}
      <div className="header-status-center">
        {isConnected ? (
          <div className={`status-pill ${isCritical ? 'status-pill-critical' : isWarning ? 'status-pill-warning' : 'status-pill-live'}`}>
            <span className="status-dot pulse-active"></span>
            <Radio size={14} />
            <span className="status-label">
              {isCritical ? 'CRITICAL EVENT ACTIVE' : isWarning ? 'ELEVATED RISK MONITORING' : 'LIVE MONITORING ONLINE'}
            </span>
          </div>
        ) : (
          <div className="status-pill status-pill-offline">
            <span className="status-dot offline"></span>
            <Activity size={14} />
            <span className="status-label">SYSTEM STANDBY / DISCONNECTED</span>
          </div>
        )}
      </div>

      {/* Right Controls & Clock */}
      <div className="header-actions">
        {/* Real-time Clock */}
        <div className="header-clock font-mono">
          <Clock size={15} className="text-muted" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span className="clock-date">{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        </div>

        {/* Audio Alert Toggle */}
        <button 
          className={`header-icon-btn ${soundEnabled ? 'active' : ''}`}
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "Mute Emergency Audio Alerts" : "Enable Emergency Audio Alerts"}
        >
          {soundEnabled ? <Volume2 size={18} className="text-primary" /> : <VolumeX size={18} className="text-muted" />}
        </button>

        {/* Quick Connection Controls */}
        {!isConnected ? (
          <div className="quick-connect-box">
            <label className="capacity-label">Cap:</label>
            <input 
              type="number" 
              className="ctrl-input capacity-input font-mono" 
              value={capacity} 
              onChange={(e) => setCapacity(Number(e.target.value))}
              min="1"
              max="10000"
            />
            <button className="ctrl-btn ctrl-btn-primary" onClick={onConnect}>
              <Power size={15} />
              <span>START STREAM</span>
            </button>
          </div>
        ) : (
          <button className="ctrl-btn ctrl-btn-danger" onClick={onDisconnect}>
            <Power size={15} />
            <span>STOP STREAM</span>
          </button>
        )}

        {/* Operator Info */}
        <div className="operator-badge" title="Logged in as Chief Safety Operator">
          <UserCheck size={16} className="text-primary" />
          <span className="operator-name">CMD-OPS 01</span>
        </div>
      </div>
    </header>
  );
}
