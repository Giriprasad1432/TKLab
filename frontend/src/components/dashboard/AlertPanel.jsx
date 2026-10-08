import React, { useState, useEffect } from 'react';
import { Bell, AlertOctagon, AlertTriangle, Info, Check, Trash2 } from 'lucide-react';

export default function AlertPanel({ metrics, isConnected, soundEnabled }) {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      time: new Date(Date.now() - 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level: 'INFO',
      title: 'System Initialized',
      message: 'Stampade Control Center monitoring engine online.',
      acknowledged: true
    }
  ]);

  // Generate real alerts based on incoming WebSocket metrics
  useEffect(() => {
    if (!isConnected || !metrics) return;

    const newAlerts = [];

    if (metrics.risk_level === 'CRITICAL') {
      newAlerts.push({
        id: Date.now() + 1,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'CRITICAL',
        title: 'STAMPEDE CRITICAL RISK',
        message: `High risk score (${metrics.risk_score}/100) detected. Occupancy at ${metrics.occupancy}%.`,
        acknowledged: false
      });
    } else if (metrics.risk_level === 'WARNING') {
      newAlerts.push({
        id: Date.now() + 2,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'WARNING',
        title: 'Elevated Risk Level',
        message: `Crowd risk level raised to WARNING (${metrics.risk_score}/100).`,
        acknowledged: false
      });
    }

    if (metrics.sudden_movement) {
      newAlerts.push({
        id: Date.now() + 3,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'HIGH',
        title: 'Sudden Movement Anomaly',
        message: `Abrupt velocity acceleration of ${metrics.average_speed} px/s detected in active zone.`,
        acknowledged: false
      });
    }

    if (metrics.capacity_status === 'OVER_CAPACITY') {
      newAlerts.push({
        id: Date.now() + 4,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'CRITICAL',
        title: 'Site Over Capacity Exceeded',
        message: `Occupancy exceeded 100% threshold (${metrics.occupancy}%).`,
        acknowledged: false
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => {
        // Prevent exact duplicates within last 3 seconds
        const recent = prev.slice(0, 15);
        const filtered = newAlerts.filter(na => !recent.some(r => r.title === na.title && r.time === na.time));
        if (filtered.length === 0) return prev;

        // Play audio alert if enabled & critical
        if (soundEnabled && filtered.some(a => a.level === 'CRITICAL')) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch (e) {
            // Audio context fallback
          }
        }

        return [...filtered, ...prev].slice(0, 25);
      });
    }
  }, [metrics, isConnected, soundEnabled]);

  const acknowledgeAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const getAlertIcon = (level) => {
    if (level === 'CRITICAL') return <AlertOctagon size={16} className="text-critical" />;
    if (level === 'HIGH' || level === 'WARNING') return <AlertTriangle size={16} className="text-warning" />;
    return <Info size={16} className="text-primary" />;
  };

  const unackCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="ctrl-card alert-panel-card">
      <div className="ctrl-card-header">
        <div className="ctrl-card-title">
          <Bell size={18} className="text-primary" />
          <span>ACTIVE EMERGENCY ALERTS</span>
          {unackCount > 0 && (
            <span className="unack-badge font-mono bg-critical text-critical">
              {unackCount} UNACKNOWLEDGED
            </span>
          )}
        </div>

        {alerts.length > 0 && (
          <button className="ctrl-btn ctrl-btn-outline icon-btn-sm" onClick={clearAlerts} title="Clear Log">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="empty-alert-state text-muted font-mono">
            No active emergency alerts recorded.
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              className={`alert-item ${alert.acknowledged ? 'acknowledged' : 'unacknowledged'} alert-${alert.level.toLowerCase()}`}
            >
              <div className="alert-icon-col">
                {getAlertIcon(alert.level)}
              </div>
              
              <div className="alert-body">
                <div className="alert-top font-mono">
                  <span className="alert-title-txt">{alert.title}</span>
                  <span className="alert-time">{alert.time}</span>
                </div>
                <div className="alert-msg">{alert.message}</div>
              </div>

              {!alert.acknowledged && (
                <button 
                  className="ack-btn font-mono" 
                  onClick={() => acknowledgeAlert(alert.id)}
                  title="Acknowledge Alert"
                >
                  <Check size={12} /> ACK
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
