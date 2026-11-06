import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, LineChart, PieChart, Video, Grid } from 'lucide-react';
import { getCameraConfig } from '../../config/cameraZones';

export default function AnalyticsPage({ metrics, isConnected, selectedSource = 'crowd.mp4', cameraConfigs = {} }) {
  const [history, setHistory] = useState([]);
  const currentConfig = getCameraConfig(cameraConfigs, selectedSource);
  const zoneDensity = metrics?.zone_density || {};
  const maxZoneCount = Math.max(metrics?.max_zone_people || 1, 1);

  useEffect(() => {
    if (!isConnected || !metrics) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => [
      ...prev.slice(-25),
      {
        time: now,
        count: metrics.people_count,
        risk: metrics.risk_score,
        speed: metrics.average_speed
      }
    ]);
  }, [metrics, isConnected]);

  // Generate SVG path for risk score chart
  const maxPoints = Math.max(history.length, 2);
  const chartHeight = 120;
  const chartWidth = 500;

  const points = history.map((h, i) => {
    const x = (i / (maxPoints - 1 || 1)) * chartWidth;
    const y = chartHeight - (h.risk / 100) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">HISTORICAL CROWD ANALYTICS & TRENDS</h2>
        <div className="page-subtitle text-muted font-mono">
          Temporal visualization of crowd density, risk threat progression, and 9-sector spatial breakdown
        </div>
      </div>

      <div className="analytics-grid">
        {/* Risk Score History Chart */}
        <div className="ctrl-card chart-card">
          <div className="ctrl-card-header">
            <div className="ctrl-card-title">
              <TrendingUp size={18} className="text-primary" />
              <span>REAL-TIME RISK SCORE PROGRESSION (0-100)</span>
            </div>
            <span className="font-mono text-muted text-xs">Live Window ({history.length} samples)</span>
          </div>

          <div className="svg-chart-container">
            {history.length > 1 ? (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="svg-chart">
                <polyline
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  points={points}
                />
              </svg>
            ) : (
              <div className="empty-chart-text font-mono text-muted">
                Collecting telemetry data points...
              </div>
            )}
          </div>
        </div>

        {/* Temporal Metrics Breakdown */}
        <div className="ctrl-card">
          <div className="ctrl-card-header">
            <div className="ctrl-card-title">
              <Activity size={18} className="text-primary" />
              <span>CURRENT TELEMETRY SNAPSHOT</span>
            </div>
          </div>
          <div className="analytics-metrics-list font-mono">
            <div>Active Camera Feed: <strong>{currentConfig.cameraName}</strong></div>
            <div>Average Flow Speed: <strong>{metrics?.average_speed ?? 0} px/s</strong></div>
            <div>Acceleration Variance: <strong>{metrics?.speed_variance ?? 0}</strong></div>
            <div>Density 3s Delta: <strong>{metrics?.density_change ?? 0} occupants</strong></div>
            <div>Coherence Alignment: <strong>{metrics?.collective_movement_percentage ?? 0}%</strong></div>
          </div>
        </div>
      </div>

      {/* 9-Division Sector Distribution Telemetry */}
      <div className="ctrl-card mt-4 font-mono">
        <div className="ctrl-card-header">
          <div className="ctrl-card-title">
            <Grid size={18} className="text-primary" />
            <span>9-SECTOR SPATIAL DISTRIBUTION — {currentConfig.cameraName.toUpperCase()}</span>
          </div>
          <span className="text-xs text-muted">Sector: {currentConfig.facilityZone}</span>
        </div>

        <div className="p-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const count = zoneDensity[`zone_${num}`] || 0;
            const name = currentConfig.divisions?.[num] || `Zone ${num}`;
            const pct = Math.min(100, Math.round((count / maxZoneCount) * 100));
            const isCritical = count >= 5;
            const isWarn = count >= 3;

            return (
              <div 
                key={num} 
                style={{ 
                  background: 'var(--bg-darkest)', 
                  border: `1px solid ${isCritical ? 'var(--risk-critical)' : isWarn ? 'var(--risk-warning)' : 'var(--bg-card-border)'}`,
                  borderRadius: '4px',
                  padding: '8px 10px'
                }}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-primary">Z{num}: {name}</span>
                  <span className={isCritical ? 'text-critical' : isWarn ? 'text-warning' : 'text-slate-200'}>
                    {isConnected ? `${count} ppl` : '---'}
                  </span>
                </div>
                <div style={{ background: '#020617', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${isConnected ? pct : 0}%`, 
                      height: '100%', 
                      background: isCritical ? 'var(--risk-critical)' : isWarn ? 'var(--risk-warning)' : 'var(--primary)',
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
