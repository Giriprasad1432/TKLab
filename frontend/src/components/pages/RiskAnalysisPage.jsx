import React from 'react';
import RiskOverview from '../dashboard/RiskOverview';
import { ShieldAlert, TrendingUp, Zap, Compass, Activity, ArrowUpRight } from 'lucide-react';

export default function RiskAnalysisPage({ metrics, isConnected }) {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">STAMPEDE RISK & BEHAVIORAL KINETICS</h2>
        <div className="page-subtitle text-muted font-mono">
          Mathematical velocity, acceleration, directional vector, and turbulence analysis
        </div>
      </div>

      <div className="page-grid-layout">
        <RiskOverview metrics={metrics} isConnected={isConnected} />

        <div className="ctrl-card">
          <div className="ctrl-card-header">
            <div className="ctrl-card-title">
              <Compass size={18} className="text-primary" />
              <span>CROWD VECTOR DIRECTIONAL COMPASS</span>
            </div>
          </div>

          <div className="compass-wrapper font-mono text-center" style={{ padding: '2rem' }}>
            <div className="compass-dial" style={{ transform: `rotate(${metrics?.dominant_direction ?? 0}deg)` }}>
              <div className="compass-arrow text-primary">▲</div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              Dominant Vector: <strong>{metrics?.dominant_direction ?? 0}°</strong>
            </div>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              Directional Alignment: <strong>{metrics?.collective_movement_percentage ?? 0}% Coherent</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
