import React, { useState } from 'react';
import { Grid, Eye, AlertCircle, CheckCircle2, ArrowUpRight, Sliders, RotateCcw, Check, X, Video } from 'lucide-react';
import { getCameraConfig } from '../../config/cameraZones';

export default function ZoneGridMap({ 
  metrics, 
  isConnected, 
  selectedSource = 'crowd.mp4',
  cameraConfigs = {},
  onUpdateDivisionName,
  onResetDivisions 
}) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editNames, setEditNames] = useState({});

  const zoneDensity = metrics?.zone_density || {
    zone_1: 0, zone_2: 0, zone_3: 0,
    zone_4: 0, zone_5: 0, zone_6: 0,
    zone_7: 0, zone_8: 0, zone_9: 0
  };

  const maxZoneCount = metrics?.max_zone_people || 1;

  // Resolve dynamic division names for the currently selected camera view
  const currentConfig = getCameraConfig(cameraConfigs, selectedSource);
  const zoneNames = currentConfig.divisions || {};

  const handleStartEdit = () => {
    setEditNames({ ...zoneNames });
    setIsEditing(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (onUpdateDivisionName) {
      Object.keys(editNames).forEach((zNum) => {
        onUpdateDivisionName(selectedSource, zNum, editNames[zNum]);
      });
    }
    setIsEditing(false);
  };

  const handleReset = () => {
    if (onResetDivisions) {
      onResetDivisions(selectedSource);
    }
    setIsEditing(false);
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

  const mostCongestedKey = Object.keys(zoneDensity).reduce(
    (a, b) => (zoneDensity[a] > zoneDensity[b] ? a : b),
    'zone_1'
  );
  const mostCongestedNum = parseInt(mostCongestedKey.replace('zone_', ''), 10) || 1;

  return (
    <div className="ctrl-card zone-grid-card">
      <div className="ctrl-card-header">
        <div className="ctrl-card-title">
          <Grid size={18} className="text-primary" />
          <span>CROWD DISTRIBUTION MATRIX (3x3 SECTORS)</span>
        </div>

        <div className="feed-header-actions">
          <button 
            type="button"
            className="ctrl-btn ctrl-btn-outline edit-zones-btn font-mono"
            onClick={handleStartEdit}
            title="Customize 9 Division Names for this Camera View"
          >
            <Sliders size={13} />
            <span>CUSTOMIZE NAMES</span>
          </button>
        </div>
      </div>

      {/* Active Camera View & Facility Area Sub-banner */}
      <div className="camera-zone-subbar font-mono">
        <span className="camera-subbar-pill">
          <Video size={12} className="text-primary" />
          <span className="text-muted">VIEW:</span> 
          <strong>{currentConfig.cameraName}</strong>
        </span>
        <span className="camera-subbar-pill">
          <span className="text-muted">SECTOR:</span> 
          <strong className="text-accent-cyan">{currentConfig.facilityZone}</strong>
        </span>
      </div>

      {/* Inline Division Names Editor Modal / Drawer */}
      {isEditing && (
        <div className="division-editor-card font-mono">
          <div className="editor-header">
            <span className="editor-title">
              EDIT 9 DIVISION NAMES — {currentConfig.cameraName}
            </span>
            <button 
              type="button" 
              className="close-detail-btn" 
              onClick={() => setIsEditing(false)}
            >
              ×
            </button>
          </div>
          <p className="editor-desc text-muted">
            Customize the sector division names specifically for this camera view. Standard directional compass sectors (NW, North, NE, West, Center, East, SW, South, SE) match any camera video accurately.
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mb-3 font-mono">
            <span className="text-xs text-muted">PRESETS:</span>
            <button
              type="button"
              className="ctrl-btn ctrl-btn-outline text-xs py-0.5 px-2"
              onClick={() => setEditNames({
                1: 'NW (Top-Left)', 2: 'North (Top-Center)', 3: 'NE (Top-Right)',
                4: 'West (Mid-Left)', 5: 'Center (Mid-Field)', 6: 'East (Mid-Right)',
                7: 'SW (Bottom-Left)', 8: 'South (Foreground)', 9: 'SE (Bottom-Right)'
              })}
            >
              🧭 Compass (NW, N, NE, W, C, E, SW, S, SE)
            </button>
            <button
              type="button"
              className="ctrl-btn ctrl-btn-outline text-xs py-0.5 px-2"
              onClick={() => setEditNames({
                1: 'Far-Left (Back)', 2: 'Far-Center (Back)', 3: 'Far-Right (Back)',
                4: 'Mid-Left (Mid)', 5: 'Center (Focal)', 6: 'Mid-Right (Mid)',
                7: 'Near-Left (Front)', 8: 'Near-Center (Front)', 9: 'Near-Right (Front)'
              })}
            >
              📐 Perspective (Far, Mid, Near)
            </button>
          </div>

          <form onSubmit={handleSaveEdit}>
            <div className="editor-3x3-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <div key={num} className="editor-cell">
                  <label className="editor-cell-label">Zone {num}</label>
                  <input
                    type="text"
                    className="ctrl-input editor-input"
                    value={editNames[num] || ''}
                    onChange={(e) => setEditNames({ ...editNames, [num]: e.target.value })}
                    placeholder={`Division ${num}`}
                  />
                </div>
              ))}
            </div>

            <div className="editor-actions">
              <button 
                type="button" 
                className="ctrl-btn ctrl-btn-outline" 
                onClick={handleReset}
              >
                <RotateCcw size={13} />
                <span>Reset to Camera Defaults</span>
              </button>
              <div className="editor-actions-right">
                <button 
                  type="button" 
                  className="ctrl-btn ctrl-btn-outline" 
                  onClick={() => setIsEditing(false)}
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
                <button type="submit" className="ctrl-btn ctrl-btn-primary">
                  <Check size={13} />
                  <span>Save Division Names</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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
              title={`Click to inspect Zone ${zoneNum}: ${zoneNames[zoneNum] || `Zone ${zoneNum}`}`}
            >
              <div className="sector-num font-mono">Z{zoneNum}</div>
              <div className="sector-count font-mono">{isConnected ? count : '-'}</div>
              <div className="sector-label">{zoneNames[zoneNum] || `Zone ${zoneNum}`}</div>
            </div>
          );
        })}
      </div>

      {/* Zone Detail Inspector */}
      {selectedZone && (
        <div className="zone-detail-banner">
          <div className="detail-header">
            <span className="detail-title font-mono">
              SECTOR DETAILS — ZONE {selectedZone}: {zoneNames[selectedZone] || `Zone ${selectedZone}`}
            </span>
            <button className="close-detail-btn" onClick={() => setSelectedZone(null)}>×</button>
          </div>
          <div className="detail-metrics font-mono">
            <div>Current Count: <strong>{zoneDensity[`zone_${selectedZone}`] || 0} occupants</strong></div>
            <div>Camera View: <strong>{currentConfig.cameraName}</strong></div>
            <div>Facility Sector: <strong>{currentConfig.facilityZone}</strong></div>
            <div>Status: <span className={(zoneDensity[`zone_${selectedZone}`] || 0) > 4 ? "text-critical" : "text-safe"}>
              {(zoneDensity[`zone_${selectedZone}`] || 0) > 4 ? "CONGESTION ALERT" : "NORMAL FLOW"}
            </span></div>
          </div>
        </div>
      )}

      {/* Footer summary */}
      <div className="grid-footer text-muted font-mono">
        <span>
          Most Congested Sector: <strong className="text-warning">
            Z{mostCongestedNum}: {zoneNames[mostCongestedNum] || `Zone ${mostCongestedNum}`}
          </strong>
        </span>
        <span>Peak Zone Density: <strong className="text-primary">{metrics?.max_zone_people || 0} occupants</strong></span>
      </div>
    </div>
  );
}
