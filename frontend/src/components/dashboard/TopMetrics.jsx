import React from 'react';
import { Users, AlertTriangle, ShieldCheck, Gauge, Activity } from 'lucide-react';

export default function TopMetrics({ metrics, capacity, isConnected }) {
  const peopleCount = metrics?.people_count ?? 0;
  const occupancy = metrics?.occupancy ?? 0;
  const riskScore = metrics?.risk_score ?? 0;
  const riskLevel = metrics?.risk_level ?? 'SAFE';
  const capacityStatus = metrics?.capacity_status ?? 'LOW';

  // Count high risk zones (> 3 people or > 30% of max)
  const zoneDensity = metrics?.zone_density || {};
  const highRiskZones = Object.values(zoneDensity).filter(count => count >= 3).length;

  const getRiskBadgeColor = (level) => {
    if (level === 'CRITICAL') return 'text-critical bg-critical';
    if (level === 'WARNING') return 'text-warning bg-warning';
    return 'text-safe bg-safe';
  };

  return (
    <div className="top-metrics-grid">
      {/* 1. TOTAL CROWD COUNT */}
      <div className="ctrl-card metric-card">
        <div className="metric-header">
          <span className="metric-title">TOTAL CROWD DETECTED</span>
          <Users size={18} className="text-primary" />
        </div>
        <div className="metric-body">
          <div className="metric-value font-mono">
            {isConnected ? peopleCount.toLocaleString() : '---'}
          </div>
          <div className="metric-sub text-muted">
            Site Max Capacity: <span className="font-mono text-primary">{capacity}</span>
          </div>
        </div>
        <div className="metric-progress-bar">
          <div 
            className="metric-progress-fill"
            style={{ 
              width: `${Math.min(occupancy, 100)}%`,
              backgroundColor: occupancy > 90 ? 'var(--risk-critical)' : occupancy > 70 ? 'var(--risk-warning)' : 'var(--primary)'
            }}
          />
        </div>
      </div>

      {/* 2. OCCUPANCY & CAPACITY STATUS */}
      <div className="ctrl-card metric-card">
        <div className="metric-header">
          <span className="metric-title">CAPACITY UTILIZATION</span>
          <Gauge size={18} className="text-primary" />
        </div>
        <div className="metric-body">
          <div className="metric-value font-mono">
            {isConnected ? `${occupancy}%` : '---'}
          </div>
          <div className="metric-sub">
            Status:{' '}
            <span className={`status-badge font-mono ${capacityStatus === 'OVER_CAPACITY' || capacityStatus === 'CRITICAL' ? 'text-critical' : capacityStatus === 'HIGH' ? 'text-warning' : 'text-safe'}`}>
              {capacityStatus}
            </span>
          </div>
        </div>
        <div className="metric-progress-bar">
          <div 
            className="metric-progress-fill" 
            style={{ 
              width: `${Math.min(occupancy, 100)}%`,
              backgroundColor: capacityStatus === 'OVER_CAPACITY' ? 'var(--risk-critical)' : 'var(--accent-cyan)'
            }} 
          />
        </div>
      </div>

      {/* 3. HIGH RISK ZONES */}
      <div className="ctrl-card metric-card">
        <div className="metric-header">
          <span className="metric-title">CONGESTED SECTORS</span>
          <AlertTriangle size={18} className={highRiskZones > 0 ? "text-warning" : "text-muted"} />
        </div>
        <div className="metric-body">
          <div className={`metric-value font-mono ${highRiskZones > 0 ? 'text-warning' : ''}`}>
            {isConnected ? `${highRiskZones} / 9` : '---'}
          </div>
          <div className="metric-sub text-muted">
            Peak Zone: <span className="font-mono text-secondary">{metrics?.max_zone_people ?? 0} occupants</span> ({metrics?.max_zone_percentage ?? 0}%)
          </div>
        </div>
        <div className="metric-progress-bar">
          <div 
            className="metric-progress-fill" 
            style={{ 
              width: `${(highRiskZones / 9) * 100}%`,
              backgroundColor: highRiskZones > 2 ? 'var(--risk-critical)' : 'var(--risk-warning)'
            }} 
          />
        </div>
      </div>

      {/* 4. OVERALL RISK THREAT SCORE */}
      <div className="ctrl-card metric-card">
        <div className="metric-header">
          <span className="metric-title">SAFETY RISK LEVEL</span>
          <ShieldCheck size={18} className={riskLevel === 'CRITICAL' ? "text-critical" : riskLevel === 'WARNING' ? "text-warning" : "text-safe"} />
        </div>
        <div className="metric-body">
          <div className="metric-value-row">
            <span className={`metric-value font-mono ${riskLevel === 'CRITICAL' ? 'text-critical' : riskLevel === 'WARNING' ? 'text-warning' : 'text-safe'}`}>
              {isConnected ? `${riskScore}/100` : '---'}
            </span>
            {isConnected && (
              <span className={`risk-pill font-mono ${getRiskBadgeColor(riskLevel)}`}>
                {riskLevel}
              </span>
            )}
          </div>
          <div className="metric-sub text-muted">
            Sudden Motion Spike:{' '}
            <span className={metrics?.sudden_movement ? "text-critical font-mono" : "text-safe font-mono"}>
              {metrics?.sudden_movement ? "DETECTED ⚠️" : "NORMAL"}
            </span>
          </div>
        </div>
        <div className="metric-progress-bar">
          <div 
            className="metric-progress-fill" 
            style={{ 
              width: `${riskScore}%`,
              backgroundColor: riskLevel === 'CRITICAL' ? 'var(--risk-critical)' : riskLevel === 'WARNING' ? 'var(--risk-warning)' : 'var(--risk-safe)'
            }} 
          />
        </div>
      </div>
    </div>
  );
}
