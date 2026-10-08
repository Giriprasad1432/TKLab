import React, { useState, useEffect } from 'react';
import { Activity, Clock, Shield, MapPin, TrendingUp } from 'lucide-react';

export default function ActivityFeed({ metrics, isConnected }) {
  const [logs, setLogs] = useState([
    {
      id: 1,
      time: new Date(Date.now() - 120000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      event: 'System Initialized',
      zone: 'Global Center',
      severity: 'NORMAL'
    }
  ]);

  useEffect(() => {
    if (!isConnected || !metrics) return;

    // Log significant changes
    if (metrics.max_zone_people > 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLog = {
        id: Date.now(),
        time: now,
        event: `Sector peak count: ${metrics.max_zone_people} occupants (${metrics.max_zone_percentage}%)`,
        zone: `Zone ${metrics.worst_zone_density ? Object.keys(metrics.worst_zone_density).reduce((a, b) => metrics.worst_zone_density[a] > metrics.worst_zone_density[b] ? a : b, '1').replace('zone_', '') : '1'}`,
        severity: metrics.risk_level
      };

      setLogs(prev => {
        if (prev[0] && prev[0].event === newLog.event) return prev;
        return [newLog, ...prev].slice(0, 20);
      });
    }
  }, [metrics, isConnected]);

  return (
    <div className="ctrl-card activity-feed-card">
      <div className="ctrl-card-header">
        <div className="ctrl-card-title">
          <Activity size={18} className="text-primary" />
          <span>REAL-TIME OPERATIONAL ACTIVITY STREAM</span>
        </div>
        <span className="font-mono text-muted text-xs">Auto-Updated</span>
      </div>

      <div className="activity-timeline">
        {logs.map(log => (
          <div key={log.id} className="timeline-item font-mono">
            <div className="timeline-time">{log.time}</div>
            <div className={`timeline-dot ${log.severity === 'CRITICAL' ? 'dot-critical' : log.severity === 'WARNING' ? 'dot-warning' : 'dot-normal'}`} />
            <div className="timeline-content">
              <span className="timeline-event">{log.event}</span>
              <span className="timeline-zone text-muted">[{log.zone}]</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
