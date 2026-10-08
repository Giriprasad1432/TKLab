import React from 'react';
import { FileText, Download, ShieldCheck, Printer, CheckCircle } from 'lucide-react';

export default function ReportsPage({ metrics, capacity }) {
  const generatePrintReport = () => {
    window.print();
  };

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
            <div>Facility: Main Concourse & Exit Hub | Operator ID: CMD-OPS 01</div>
          </div>

          <div className="report-section">
            <h4>1. OPERATIONAL SUMMARY</h4>
            <div>Site Capacity Setting: <strong>{capacity} Max Occupants</strong></div>
            <div>Current Occupant Count: <strong>{metrics?.people_count ?? 0}</strong></div>
            <div>Current Occupancy Rate: <strong>{metrics?.occupancy ?? 0}%</strong></div>
            <div>Current Threat Level: <strong>{metrics?.risk_level ?? 'SAFE'} ({metrics?.risk_score ?? 0}/100)</strong></div>
          </div>

          <div className="report-section">
            <h4>2. KINETIC BEHAVIOR & RISK METRICS</h4>
            <div>Peak Flow Speed: {metrics?.average_speed ?? 0} px/s</div>
            <div>Collective Coherence: {metrics?.collective_movement_percentage ?? 0}%</div>
            <div>Sudden Acceleration Spike: {metrics?.sudden_movement ? 'YES - ANOMALY' : 'NO'}</div>
          </div>

          <div className="report-footer text-muted">
            Generated automatically by Stampade Crowd Management Platform. Confidential & Restricted.
          </div>
        </div>
      </div>
    </div>
  );
}
