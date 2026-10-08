import React from 'react';
import ZoneGridMap from '../dashboard/ZoneGridMap';
import { Users, Gauge, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function CrowdDensityPage({ metrics, isConnected, capacity }) {
  const peopleCount = metrics?.people_count ?? 0;
  const occupancy = metrics?.occupancy ?? 0;
  const status = metrics?.capacity_status ?? 'LOW';

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">CROWD DENSITY & OCCUPANCY MONITORING</h2>
        <div className="page-subtitle text-muted font-mono">
          High-resolution 3x3 sector spatial distribution and crowd capacity tracking
        </div>
      </div>

      <div className="page-grid-layout">
        {/* Top Summary Stats */}
        <div className="density-summary-row">
          <div className="ctrl-card">
            <div className="card-lbl text-muted">CURRENT TOTAL OCCUPANCY</div>
            <div className="card-val font-mono">{isConnected ? peopleCount : '---'} <span className="card-unit">people</span></div>
            <div className="card-sub text-muted">Site Capacity Limit: {capacity}</div>
          </div>

          <div className="ctrl-card">
            <div className="card-lbl text-muted">OCCUPANCY PERCENTAGE</div>
            <div className="card-val font-mono text-primary">{isConnected ? `${occupancy}%` : '---'}</div>
            <div className="card-sub text-muted">Threshold Status: <strong className="text-warning">{status}</strong></div>
          </div>

          <div className="ctrl-card">
            <div className="card-lbl text-muted">MOST DENSE SECTOR</div>
            <div className="card-val font-mono text-warning">{metrics?.max_zone_people ?? 0} <span className="card-unit">ppl</span></div>
            <div className="card-sub text-muted">Share: {metrics?.max_zone_percentage ?? 0}%</div>
          </div>
        </div>

        {/* 3x3 Sector Spatial Heatmap */}
        <ZoneGridMap metrics={metrics} isConnected={isConnected} />
      </div>
    </div>
  );
}
