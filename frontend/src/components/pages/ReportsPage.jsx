import React from 'react';
import { FileText, Download, ShieldCheck, Printer, CheckCircle, Video } from 'lucide-react';
import { getCameraConfig } from '../../config/cameraZones';

export default function ReportsPage({ metrics, capacity, selectedSource, cameraConfigs = {} }) {
  const generatePrintReport = () => {
    window.print();
  };

  const isLive = selectedSource === 'webcam' || metrics?.is_live;
  const currentConfig = getCameraConfig(cameraConfigs, selectedSource);
  const zoneDensity = metrics?.zone_density || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">CROWD SAFETY OPERATIONAL REPORTS</h2>
        <div className="page-subtitle text-muted font-mono">
          Exportable incident summaries, capacity compliance documents, and emergency logs
        </div>
      </div>

      <div className="ctrl-card report-preview-card">
        <div className="ctrl-card-header">
          <div className="ctrl-card-title">
            <FileText size={18} className="text-primary" />
            <span>OFFICIAL INCIDENT & CAPACITY AUDIT REPORT</span>
          </div>

          <button className="ctrl-btn ctrl-btn-primary" onClick={generatePrintReport}>
            <Printer size={15} />
            <span>PRINT / EXPORT PDF</span>
          </button>
        </div>

        <div className="report-paper font-mono">
          <div className="report-header-banner">
            <h3>STAMPADE CONTROL CENTER — SAFETY AUDIT</h3>
            <div>Date: {new Date().toLocaleDateString()} | Time: {new Date().toLocaleTimeString()}</div>
            <div>Monitored Facility Area: <strong>{currentConfig.facilityZone}</strong></div>
            <div>Active Video Feed: <strong>{currentConfig.cameraName} ({selectedSource || 'crowd.mp4'})</strong></div>
            <div>Feed Type: <strong>{isLive ? 'Live Sensor Feed' : 'Recorded Simulation Stream'}</strong></div>
          </div>

          <div className="report-section">
            <h4>1. OPERATIONAL SUMMARY</h4>
            <div>Site Capacity Setting: <strong>{capacity} Max Occupants</strong></div>
            <div>Current Occupant Count: <strong>{metrics?.people_count ?? 0} occupants</strong></div>
            <div>Current Occupancy Rate: <strong>{metrics?.occupancy ?? 0}%</strong></div>
            <div>Current Threat Level: <strong>{metrics?.risk_level ?? 'SAFE'} ({metrics?.risk_score ?? 0}/100)</strong></div>
          </div>

          <div className="report-section">
            <h4>2. KINETIC BEHAVIOR & RISK METRICS</h4>
            <div>Peak Flow Speed: <strong>{metrics?.average_speed ?? 0} px/s</strong></div>
            <div>Collective Coherence: <strong>{metrics?.collective_movement_percentage ?? 0}%</strong></div>
            <div>Sudden Acceleration Spike: <strong>{metrics?.sudden_movement ? 'YES - ANOMALY' : 'NO'}</strong></div>
            <div>Crowd Packs Detected: <strong>{metrics?.clusters?.length ?? 0} groups ({metrics?.clustered_people_count ?? 0} people)</strong></div>
          </div>

          <div className="report-section">
            <h4>3. 3x3 SPATIAL SECTOR DISTRIBUTION ({currentConfig.cameraName})</h4>
            <div className="report-sectors-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const count = zoneDensity[`zone_${num}`] || 0;
                const name = currentConfig.divisions?.[num] || `Zone ${num}`;
                return (
                  <div key={num} style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Z{num}: {name}</div>
                    <div style={{ fontSize: '12px', color: count >= 4 ? '#b91c1c' : '#334155' }}>
                      Count: <strong>{count}</strong> {count === 1 ? 'person' : 'people'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="report-footer text-muted" style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            Generated automatically by Stampade Crowd Management Platform. Confidential & Restricted.
          </div>
        </div>
      </div>
    </div>
  );
}
