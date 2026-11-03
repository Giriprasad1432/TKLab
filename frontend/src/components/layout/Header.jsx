import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  Clock, 
  Volume2, 
  VolumeX, 
  Play,
  Square,
  Activity,
  UserCheck,
  Video,
  Camera
} from 'lucide-react';

export default function Header({ 
  isConnected, 
  onConnect, 
  onDisconnect, 
  capacity, 
  onUpdateCapacity, 
  selectedSource,
  onSelectSource,
  availableSources = [],
  metrics,
  soundEnabled,
  setSoundEnabled 
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [localCap, setLocalCap] = useState(String(capacity));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLocalCap(String(capacity));
  }, [capacity]);

  const handleCapChange = (val) => {
    setLocalCap(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      onUpdateCapacity(num);
    }
  };

  const handleCapBlur = () => {
    const num = parseInt(localCap, 10);
    if (isNaN(num) || num <= 0) {
      setLocalCap(String(capacity));
    } else {
      onUpdateCapacity(num);
    }
  };

  const handleCapKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleStep = (delta) => {
    const current = parseInt(localCap, 10) || capacity;
    const nextVal = Math.max(1, current + delta);
    setLocalCap(String(nextVal));
    onUpdateCapacity(nextVal);
  };

  const isCritical = metrics?.risk_level === 'CRITICAL';
  const isWarning = metrics?.risk_level === 'WARNING';
  const isLiveCam = selectedSource === 'webcam' || metrics?.is_live;

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
            {isLiveCam ? <Camera size={14} className="text-critical" /> : <Radio size={14} />}
            <span className="status-label">
              {isCritical ? 'CRITICAL EVENT ACTIVE' : isWarning ? 'ELEVATED RISK MONITORING' : isLiveCam ? 'LIVE WEBCAM ONLINE' : 'STREAM ACTIVE'}
            </span>
          </div>
        ) : (
          <div className="status-pill status-pill-offline">
            <span className="status-dot offline"></span>
            <Activity size={14} />
            <span className="status-label">SYSTEM STANDBY / READY</span>
          </div>
        )}
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="header-actions">
        {/* Source Dropdown Selector */}
        <div className="source-select-box" title="Select Video Source or Live Camera">
          <Video size={14} className={isLiveCam ? 'text-critical' : 'text-primary'} />
          <select 
            className="source-select font-mono"
            value={selectedSource}
            onChange={(e) => onSelectSource(e.target.value)}
          >
            {availableSources && availableSources.length > 0 ? (
              availableSources.map(s => (
                <option key={s.id} value={s.id}>
                  {s.type === 'live' ? '📹 ' : '🎬 '}
                  {s.name}
                </option>
              ))
            ) : (
              <>
                <option value="crowd.mp4">🎬 Main Entrance (crowd.mp4)</option>
                <option value="crowd2.mp4">🎬 High Density (crowd2.mp4)</option>
                <option value="crowd3.mp4">🎬 Rapid Dynamics (crowd3.mp4)</option>
                <option value="mot20_crowd.mp4">🎬 MOT20 Benchmark (mot20_crowd.mp4)</option>
                <option value="webcam">📹 Live Webcam (CAM 0)</option>
              </>
            )}
          </select>
        </div>

        {/* Capacity Stepper & Direct Typing Input */}
        <div className="capacity-control-group" title="Venue Capacity: click +/- or type number directly and hit Enter">
          <label className="capacity-label">CAP:</label>
          <div className="capacity-stepper">
            <button 
              type="button" 
              className="stepper-btn stepper-minus" 
              onClick={() => handleStep(-5)}
              title="Decrease Capacity (-5)"
            >
              -
            </button>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="ctrl-input capacity-input font-mono" 
              value={localCap} 
              onChange={(e) => handleCapChange(e.target.value)}
              onBlur={handleCapBlur}
              onKeyDown={handleCapKeyDown}
              title="Type capacity number directly (press Enter to apply)"
            />
            <button 
              type="button" 
              className="stepper-btn stepper-plus" 
              onClick={() => handleStep(5)}
              title="Increase Capacity (+5)"
            >
              +
            </button>
          </div>
        </div>

        {/* Start / Stop Stream Button */}
        {!isConnected ? (
          <button className="ctrl-btn ctrl-btn-primary" onClick={() => onConnect()}>
            <Play size={14} />
            <span>START STREAM</span>
          </button>
        ) : (
          <button className="ctrl-btn ctrl-btn-danger" onClick={onDisconnect}>
            <Square size={14} />
            <span>STOP STREAM</span>
          </button>
        )}

        {/* Audio Alert Toggle */}
        <button 
          className={`header-icon-btn ${soundEnabled ? 'active' : ''}`}
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "Mute Emergency Audio Alerts" : "Enable Emergency Audio Alerts"}
        >
          {soundEnabled ? <Volume2 size={18} className="text-primary" /> : <VolumeX size={18} className="text-muted" />}
        </button>

        {/* Real-time Clock */}
        <div className="header-clock font-mono">
          <Clock size={15} className="text-muted" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {/* Operator Info */}
        <div className="operator-badge" title="Logged in as Chief Safety Operator">
          <UserCheck size={16} className="text-primary" />
          <span className="operator-name">CMD-OPS 01</span>
        </div>
      </div>
    </header>
  );
}
