import React, { useState } from 'react';
import AlertPanel from '../dashboard/AlertPanel';
import { Bell, ShieldAlert, Filter, CheckCircle } from 'lucide-react';

export default function AlertsPage({ metrics, isConnected, soundEnabled }) {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">EMERGENCY ALERT LOG & RESPONSE CENTER</h2>
        <div className="page-subtitle text-muted font-mono">
          Full audit trail of automated safety alerts, notifications, and operator acknowledgements
        </div>
      </div>

      <div className="page-grid-layout">
        <AlertPanel metrics={metrics} isConnected={isConnected} soundEnabled={soundEnabled} />
      </div>
    </div>
  );
}
