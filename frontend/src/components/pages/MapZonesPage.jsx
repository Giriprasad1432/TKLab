import React from 'react';
import { Map, MapPin, Shield, HeartPulse, LogOut, Radio, Compass } from 'lucide-react';

export default function MapZonesPage({ metrics, isConnected }) {
  const zoneDensity = metrics?.zone_density || {};

  const mapSectors = [
    { id: 1, name: 'Northwest Gate A', type: 'ENTRY / EXIT', x: '20%', y: '25%', security: 'Post 01' },
    { id: 2, name: 'North Concourse', type: 'OPEN SECTOR', x: '50%', y: '25%', security: 'Post 02' },
    { id: 3, name: 'Northeast Gate B', type: 'ENTRY / EXIT', x: '80%', y: '25%', security: 'Post 03' },
    { id: 4, name: 'West Corridor', type: 'CHOKEPOINT', x: '20%', y: '50%', medical: 'First Aid 01' },
    { id: 5, name: 'Central Plaza Stage', type: 'PRIMARY HUB', x: '50%', y: '50%', security: 'Cmd HQ' },
    { id: 6, name: 'East Corridor', type: 'CHOKEPOINT', x: '80%', y: '50%', medical: 'First Aid 02' },
    { id: 7, name: 'Southwest Lawn', type: 'SAFE ZONE', x: '20%', y: '75%', exit: 'Emergency Route A' },
    { id: 8, name: 'South Main Exit', type: 'PRIMARY EXIT', x: '50%', y: '75%', exit: 'Emergency Route B' },
    { id: 9, name: 'Southeast Lawn', type: 'SAFE ZONE', x: '80%', y: '75%', exit: 'Emergency Route C' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">GIS EMERGENCY ZONE & TACTICAL MAP</h2>
        <div className="page-subtitle text-muted font-mono">
          Spatial layout, emergency evacuation routes, and security post deployments
        </div>
      </div>

      <div className="ctrl-card map-view-card">
        <div className="ctrl-card-header">
          <div className="ctrl-card-title">
            <Map size={18} className="text-primary" />
            <span>FACILITY GIS TACTICAL OVERVIEW</span>
          </div>
          <div className="map-legend-items font-mono text-xs">
            <span>🟢 Normal Route</span>
            <span>🔴 Chokepoint Risk</span>
            <span>⚡ Emergency Evacuation Path</span>
          </div>
        </div>

        {/* GIS Map Vector Canvas */}
        <div className="gis-canvas">
          <div className="gis-grid-overlay" />
          
          {mapSectors.map((sector) => {
            const count = zoneDensity[`zone_${sector.id}`] || 0;
            const isHigh = count >= 4;
            return (
              <div 
                key={sector.id} 
                className={`gis-pin-node ${isHigh ? 'pin-critical' : 'pin-normal'}`}
                style={{ left: sector.x, top: sector.y }}
              >
                <div className="pin-head">
                  <MapPin size={18} />
                  <span className="pin-count font-mono">{isConnected ? count : '-'}</span>
                </div>
                <div className="pin-card font-mono">
                  <div className="pin-title">Z{sector.id}: {sector.name}</div>
                  <div className="pin-type text-muted">{sector.type}</div>
                  {sector.security && <div className="pin-asset"><Shield size={10} /> {sector.security}</div>}
                  {sector.medical && <div className="pin-asset text-warning"><HeartPulse size={10} /> {sector.medical}</div>}
                  {sector.exit && <div className="pin-asset text-safe"><LogOut size={10} /> {sector.exit}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
