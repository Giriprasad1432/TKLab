import React, { useState } from 'react';
import { Grid, Eye, AlertCircle, CheckCircle2, ArrowUpRight } from 'lucide-react';

export default function ZoneGridMap({ metrics, isConnected }) {
  const [selectedZone, setSelectedZone] = useState(null);

  const zoneDensity = metrics?.zone_density || {
    zone_1: 0, zone_2: 0, zone_3: 0,
    zone_4: 0, zone_5: 0, zone_6: 0,
    zone_7: 0, zone_8: 0, zone_9: 0
  };

  const maxZoneCount = metrics?.max_zone_people || 1;

  // Sector labels (spatial 3x3 grid)
  const zoneNames = {
    1: 'NW Gate (1)', 2: 'North Concourse (2)', 3: 'NE Gate (3)',
    4: 'West Corridor (4)', 5: 'Central Plaza (5)', 6: 'East Corridor (6)',
    7: 'SW Plaza (7)', 8: 'South Exit (8)', 9: 'SE Exit (9)'
  };

  const getHeatStyle = (count) => {
    if (!isConnected || count === 0) {
      return { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: 'var(--text-muted)' };
    }
    const ratio = Math.min(1, count / Math.max(maxZoneCount, 1));
    if (count >= 5 || ratio >= 0.7) {
      return { 
        backgroundColor: `rgba(239, 68, 68, ${0.25 + ratio * 0.55})`, 
        color: '#ffffff',
        borderColor: 'var(--risk-critical)',
        boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)'
      };
    }
    if (count >= 3 || ratio >= 0.4) {
      return { 
        backgroundColor: `rgba(245, 158, 11, ${0.2 + ratio * 0.4})`, 
        color: '#ffffff',
        borderColor: 'var(--risk-warning)'
      };
    }
    return { 
      backgroundColor: `rgba(56, 189, 248, ${0.1 + ratio * 0.3})`, 
      color: 'var(--text-primary)',
      borderColor: 'rgba(56, 189, 248, 0.2)'
    };
  };

  return (
    <div className="ctrl-card zone-grid-card">
      <div className="ctrl-card-header">
        <div className="ctrl-card-title">
          <Grid size={18} className="text-primary" />
          <span>CROWD DISTRIBUTION MATRIX (3x3 SECTORS)</span>
        </div>

        <div className="matrix-legend font-mono">
          <span className="legend-item"><span className="legend-dot bg-safe"></span> SAFE</span>
          <span className="legend-item"><span className="legend-dot bg-warning"></span> MODERATE</span>
          <span className="legend-item"><span className="legend-dot bg-critical"></span> HIGH RISK</span>
        </div>
      </div>

      {/* 3x3 Heatmap Grid */}
      <div className="sector-matrix">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((zoneNum) => {
          const key = `zone_${zoneNum}`;
          const count = zoneDensity[key] || 0;
          const heatStyle = getHeatStyle(count);
          const isSelected = selectedZone === zoneNum;

          return (
            <div
              key={zoneNum}
              className={`sector-cell ${isSelected ? 'selected' : ''}`}
              style={heatStyle}
              onClick={() => setSelectedZone(zoneNum)}
            >
              <div className="sector-num font-mono">Z{zoneNum}</div>
              <div className="sector-count font-mono">{isConnected ? count : '-'}</div>
              <div className="sector-label">{zoneNames[zoneNum]}</div>
            </div>
          );
        })}
      </div>

      {/* Zone Detail Inspector */}
      {selectedZone && (
        <div className="zone-detail-banner">
          <div className="detail-header">
            <span className="detail-title font-mono">SECTOR DETAILS — ZONE {selectedZone}: {zoneNames[selectedZone]}</span>
            <button className="close-detail-btn" onClick={() => setSelectedZone(null)}>×</button>
          </div>
          <div className="detail-metrics font-mono">
            <div>Current Count: <strong>{zoneDensity[`zone_${selectedZone}`] || 0} occupants</strong></div>
            <div>Zone Capacity Share: <strong>{metrics?.max_zone_percentage || 0}%</strong></div>
            <div>Status: <span className={(zoneDensity[`zone_${selectedZone}`] || 0) > 4 ? "text-critical" : "text-safe"}>
              {(zoneDensity[`zone_${selectedZone}`] || 0) > 4 ? "CONGESTION ALERT" : "NORMAL FLOW"}
            </span></div>
          </div>
        </div>
      )}

      {/* Footer summary */}
      <div className="grid-footer text-muted font-mono">
        <span>Most Congested Sector: <strong className="text-warning">Zone {Object.keys(zoneDensity).reduce((a, b) => zoneDensity[a] > zoneDensity[b] ? a : b, 'zone_1').replace('zone_', '')}</strong></span>
        <span>Peak Zone Density: <strong className="text-primary">{metrics?.max_zone_people || 0} occupants</strong></span>
      </div>
    </div>
  );
}
