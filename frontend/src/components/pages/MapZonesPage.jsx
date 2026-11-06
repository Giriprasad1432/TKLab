import React from 'react';
import { Map, MapPin, Shield, HeartPulse, LogOut, Radio, Compass, Video, Eye, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { getCameraConfig } from '../../config/cameraZones';

export default function MapZonesPage({ 
  metrics, 
  isConnected, 
  selectedSource = 'crowd.mp4', 
  onSelectSource,
  cameraConfigs = {}
}) {
  const zoneDensity = metrics?.zone_density || {};
  const currentConfig = getCameraConfig(cameraConfigs, selectedSource);

  const mapSectors = [
    { 
      id: 1, 
      name: 'Northwest Gate A', 
      type: 'ENTRY / EXIT', 
      x: '20%', 
      y: '25%', 
      security: 'Post 01',
      cameraSource: 'crowd.mp4',
      cameraLabel: 'Cam 01 (Entrance)'
    },
    { 
      id: 2, 
      name: 'North Concourse', 
      type: 'OPEN SECTOR', 
      x: '50%', 
      y: '25%', 
      security: 'Post 02',
      cameraSource: 'crowd2.mp4',
      cameraLabel: 'Cam 02 (Concourse)'
    },
    { 
      id: 3, 
      name: 'Northeast Gate B', 
      type: 'ENTRY / EXIT', 
      x: '80%', 
      y: '25%', 
      security: 'Post 03',
      cameraSource: 'crowd.mp4',
      cameraLabel: 'Cam 01 (Inflow)'
    },
    { 
      id: 4, 
      name: 'West Corridor', 
      type: 'CHOKEPOINT', 
      x: '20%', 
      y: '50%', 
      medical: 'First Aid 01',
      cameraSource: 'crowd3.mp4',
      cameraLabel: 'Cam 03 (Junction)'
    },
    { 
      id: 5, 
      name: 'Central Plaza Stage', 
      type: 'PRIMARY HUB', 
      x: '50%', 
      y: '50%', 
      security: 'Cmd HQ',
      cameraSource: 'crowd2.mp4',
      cameraLabel: 'Cam 02 (Plaza)'
    },
    { 
      id: 6, 
      name: 'East Corridor', 
      type: 'CHOKEPOINT', 
      x: '80%', 
      y: '50%', 
      medical: 'First Aid 02',
      cameraSource: 'crowd3.mp4',
      cameraLabel: 'Cam 03 (Flow)'
    },
    { 
      id: 7, 
      name: 'Southwest Lawn', 
      type: 'SAFE ZONE', 
      x: '20%', 
      y: '75%', 
      exit: 'Emergency Route A',
      cameraSource: 'webcam',
      cameraLabel: 'Cam 00 (Webcam)'
    },
    { 
      id: 8, 
      name: 'South Main Exit', 
      type: 'PRIMARY EXIT', 
      x: '50%', 
      y: '75%', 
      exit: 'Emergency Route B',
      cameraSource: 'mot20_crowd.mp4',
      cameraLabel: 'Cam 04 (MOT20 Transit)'
    },
    { 
      id: 9, 
      name: 'Southeast Lawn', 
      type: 'SAFE ZONE', 
      x: '80%', 
      y: '75%', 
      exit: 'Emergency Route C',
      cameraSource: 'mot20_crowd.mp4',
      cameraLabel: 'Cam 04 (Exit)'
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">GIS EMERGENCY ZONE & FACILITY TACTICAL MAP</h2>
        <div className="page-subtitle text-muted font-mono">
          Fixed 9 facility divisions mapped to CCTV camera views, emergency routes, and security posts
        </div>
      </div>

      {/* Active Camera View Quick Switch Strip */}
      <div className="ctrl-card mb-4 p-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Video size={16} className="text-primary" />
            <span className="text-muted text-xs uppercase">ACTIVE CAMERA FEED:</span>
            <strong className="text-primary">{currentConfig.cameraName}</strong>
            <span className="live-pill font-mono">SECTOR: {currentConfig.facilityZone}</span>
          </div>
          <div className="text-xs text-muted">
            Click any camera pin on the tactical map to switch the live stream to that zone
          </div>
        </div>
      </div>

      <div className="ctrl-card map-view-card">
        <div className="ctrl-card-header">
          <div className="ctrl-card-title">
            <Map size={18} className="text-primary" />
            <span>FACILITY GIS TACTICAL OVERVIEW (9 MASTER DIVISIONS)</span>
          </div>
          <div className="map-legend-items font-mono text-xs">
            <span>🟢 Normal Flow</span>
            <span>🔴 Chokepoint Risk</span>
            <span>⚡ Evacuation Route</span>
            <span className="text-accent-cyan">📹 Camera Node</span>
          </div>
        </div>

        {/* GIS Map Vector Canvas */}
        <div className="gis-canvas">
          <div className="gis-grid-overlay" />

          {mapSectors.map((sector) => {
            const count = zoneDensity[`zone_${sector.id}`] || 0;
            const isHigh = count >= 4;
            const isCameraActive = selectedSource === sector.cameraSource;

            return (
              <div
                key={sector.id}
                className={`gis-pin-node ${isHigh ? 'pin-critical' : 'pin-normal'} ${isCameraActive ? 'pin-active-feed' : ''}`}
                style={{ left: sector.x, top: sector.y }}
                onClick={() => onSelectSource && onSelectSource(sector.cameraSource)}
                title={`Click to switch live camera to ${sector.name} (${sector.cameraLabel})`}
              >
                <div className="pin-head">
                  <MapPin size={18} />
                  <span className="pin-count font-mono">{isConnected ? count : '-'}</span>
                </div>
                <div className="pin-card font-mono">
                  <div className="pin-title">
                    Z{sector.id}: {sector.name}
                    {isCameraActive && (
                      <span className="pin-active-badge">ACTIVE CAM</span>
                    )}
                  </div>
                  <div className="pin-type text-muted">{sector.type}</div>
                  <div className="pin-cam text-accent-cyan flex items-center gap-1 mt-1">
                    <Video size={10} />
                    <span>{sector.cameraLabel}</span>
                  </div>
                  {sector.security && <div className="pin-asset"><Shield size={10} /> {sector.security}</div>}
                  {sector.medical && <div className="pin-asset text-warning"><HeartPulse size={10} /> {sector.medical}</div>}
                  {sector.exit && <div className="pin-asset text-safe"><LogOut size={10} /> {sector.exit}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Camera-to-Division Mapping Matrix Table */}
      <div className="ctrl-card mt-4 font-mono">
        <div className="ctrl-card-header">
          <div className="ctrl-card-title">
            <Video size={16} className="text-primary" />
            <span>CAMERA VIEWS TO FACILITY 9-DIVISION SECTOR MATRIX</span>
          </div>
        </div>
        <div className="table-responsive p-3">
          <table className="camera-mapping-table w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-muted">
                <th className="p-2">CAMERA VIEW</th>
                <th className="p-2">FACILITY MASTER ZONE</th>
                <th className="p-2">INTERNAL 9 SUB-DIVISIONS SUMMARY</th>
                <th className="p-2">STREAM STATUS</th>
                <th className="p-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(cameraConfigs).map((camKey) => {
                const cfg = cameraConfigs[camKey];
                const isActive = selectedSource === camKey;
                const sampleSubzones = Object.values(cfg.divisions || {}).slice(0, 3).join(', ') + '...';

                return (
                  <tr key={camKey} className={`border-b border-slate-800 hover:bg-slate-800/50 ${isActive ? 'bg-primary/10' : ''}`}>
                    <td className="p-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <Video size={12} className={isActive ? 'text-primary' : 'text-muted'} />
                        <span>{cfg.cameraName}</span>
                      </div>
                      <span className="text-muted text-[10px]">{camKey}</span>
                    </td>
                    <td className="p-2">
                      <strong className="text-accent-cyan">{cfg.facilityZone}</strong>
                    </td>
                    <td className="p-2 text-muted">
                      <span>{sampleSubzones}</span>
                    </td>
                    <td className="p-2">
                      {isActive ? (
                        <span className="status-pill status-pill-safe text-[10px]">
                          <span className="live-dot pulse-active" style={{ width: 5, height: 5 }}></span> ACTIVE STREAM
                        </span>
                      ) : (
                        <span className="text-muted text-[10px]">STANDBY</span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        className={`ctrl-btn text-xs py-1 px-2.5 ${isActive ? 'ctrl-btn-primary' : 'ctrl-btn-outline'}`}
                        onClick={() => onSelectSource && onSelectSource(camKey)}
                      >
                        {isActive ? 'VIEWING' : 'SWITCH FEED'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
