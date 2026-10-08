import React from 'react';
import { ShieldAlert, Activity, Compass, Zap, ArrowUp, AlertTriangle } from 'lucide-react';

export default function RiskOverview({ metrics, isConnected }) {
  const riskScore = metrics?.risk_score ?? 0;
  const riskLevel = metrics?.risk_level ?? 'SAFE';

  const getGaugeColor = (score) => {
    if (score >= 70) return 'var(--risk-critical)';
    if (score >= 40) return 'var(--risk-warning)';
    return 'var(--risk-safe)';
  };

  return (
    <div className="ctrl-card risk-overview-card">
      <div className="ctrl-card-header">
        <div className="ctrl-card-title">
          <ShieldAlert size={18} className="text-primary" />
          <span>RISK ASSESSMENT & BEHAVIOR INDICATORS</span>
        </div>

        <div className={`risk-level-badge font-mono ${riskLevel === 'CRITICAL' ? 'bg-critical text-critical' : riskLevel === 'WARNING' ? 'bg-warning text-warning' : 'bg-safe text-safe'}`}>
          {riskLevel} THREAT
        </div>
      </div>

      <div className="risk-content-grid">
        {/* Risk Score Circle / Dial Display */}
        <div className="risk-score-box">
          <div className="score-dial-outer" style={{ borderColor: getGaugeColor(riskScore) }}>
            <div className="score-dial-inner">
              <span className="score-number font-mono" style={{ color: getGaugeColor(riskScore) }}>
                {isConnected ? riskScore : '--'}
              </span>
              <span className="score-max font-mono">/ 100</span>
            </div>
          </div>
          <div className="score-title font-mono">CROWD STAMPEDE RISK INDEX</div>
        </div>

        {/* Contributing Behavior Factors List */}
        <div className="risk-factors-list">
          <div className="factor-item">
            <div className="factor-info">
              <Activity size={14} className="text-primary" />
              <span className="factor-lbl">Average Velocity</span>
            </div>
            <span className="factor-val font-mono">{metrics?.average_speed ?? 0} px/s</span>
          </div>

          <div className="factor-item">
            <div className="factor-info">
              <Zap size={14} className="text-warning" />
              <span className="factor-lbl">Average Acceleration</span>
            </div>
            <span className="factor-val font-mono">{metrics?.average_acceleration ?? 0} px/s²</span>
          </div>

          <div className="factor-item">
            <div className="factor-info">
              <Compass size={14} className="text-accent-cyan" />
              <span className="factor-lbl">Dominant Direction</span>
            </div>
            <span className="factor-val font-mono">{metrics?.dominant_direction ?? 0}°</span>
          </div>

          <div className="factor-item">
            <div className="factor-info">
              <ArrowUp size={14} className="text-primary" />
              <span className="factor-lbl">Collective Flow Coherence</span>
            </div>
            <span className="factor-val font-mono">{metrics?.collective_movement_percentage ?? 0}%</span>
          </div>

          <div className="factor-item">
            <div className="factor-info">
              <AlertTriangle size={14} className={metrics?.sudden_movement ? "text-critical" : "text-muted"} />
              <span className="factor-lbl">Sudden Movement Spike</span>
            </div>
            <span className={`factor-val font-mono ${metrics?.sudden_movement ? "text-critical" : "text-safe"}`}>
              {metrics?.sudden_movement ? "ANOMALY DETECTED ⚠️" : "STABLE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
