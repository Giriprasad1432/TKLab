import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, LineChart, PieChart } from 'lucide-react';

export default function AnalyticsPage({ metrics, isConnected }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!isConnected || !metrics) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => [
      ...prev.slice(-20),
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
          Temporal visualization of crowd density, risk threat progression, and velocity variance
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
            <div>Average Flow Speed: <strong>{metrics?.average_speed ?? 0} px/s</strong></div>
            <div>Acceleration Variance: <strong>{metrics?.speed_variance ?? 0}</strong></div>
            <div>Density 3s Delta: <strong>{metrics?.density_change ?? 0} occupants</strong></div>
            <div>Coherence Alignment: <strong>{metrics?.collective_movement_percentage ?? 0}%</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
