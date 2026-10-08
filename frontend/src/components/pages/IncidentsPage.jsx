import React, { useState } from 'react';
import { ClipboardList, Plus, Filter, ShieldAlert, CheckCircle2, Clock, UserCheck } from 'lucide-react';

export default function IncidentsPage() {
  const [filter, setFilter] = useState('ALL');
  const [incidents, setIncidents] = useState([
    {
      id: 'INC-9041',
      zone: 'Zone 1 (NW Gate)',
      time: '10:42:15 AM',
      severity: 'CRITICAL',
      description: 'Main gate entry bottlenecking caused crowd buildup near security scanners.',
      team: 'Alpha Response Squad',
      status: 'INVESTIGATING'
    },
    {
      id: 'INC-9040',
      zone: 'Zone 5 (Central Plaza)',
      time: '10:30:00 AM',
      severity: 'HIGH',
      description: 'Sudden velocity surge detected during main stage exit transition.',
      team: 'Bravo Security',
      status: 'RESPONDING'
    },
    {
      id: 'INC-9039',
      zone: 'Zone 8 (South Exit)',
      time: '10:15:10 AM',
      severity: 'MEDIUM',
      description: 'Minor obstacle in corridor cleared. Flow returned to baseline.',
      team: 'Medical Unit 01',
      status: 'RESOLVED'
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newZone, setNewZone] = useState('Zone 1 (NW Gate)');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState('HIGH');

  const filteredIncidents = filter === 'ALL' 
    ? incidents 
    : incidents.filter(inc => inc.status === filter);

  const handleCreateIncident = (e) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const newInc = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      zone: newZone,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      severity: newSeverity,
      description: newDesc,
      team: 'Dispatched Unit 01',
      status: 'OPEN'
    };

    setIncidents([newInc, ...incidents]);
    setNewDesc('');
    setShowModal(false);
  };

  const updateStatus = (id, newStatus) => {
    setIncidents(incidents.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">CROWD SAFETY INCIDENT MANAGEMENT BOARD</h2>
        <div className="page-subtitle text-muted font-mono">
          Operational log of dispatched security units, crowd bottlenecks, and emergency resolutions
        </div>
      </div>

      <div className="ctrl-card incidents-card">
        <div className="ctrl-card-header">
          <div className="ctrl-card-title">
            <ClipboardList size={18} className="text-primary" />
            <span>INCIDENT LOG DIRECTORY</span>
          </div>

          <div className="incidents-header-actions font-mono">
            {/* Filter Buttons */}
            <div className="filter-group">
              {['ALL', 'OPEN', 'INVESTIGATING', 'RESPONDING', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  className={`filter-btn ${filter === st ? 'active' : ''}`}
                  onClick={() => setFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            <button className="ctrl-btn ctrl-btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={15} />
              <span>LOG INCIDENT</span>
            </button>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="incidents-table-wrapper">
          <table className="incidents-table font-mono">
            <thead>
              <tr>
                <th>INCIDENT ID</th>
                <th>TIMESTAMP</th>
                <th>LOCATION</th>
                <th>SEVERITY</th>
                <th>DESCRIPTION</th>
                <th>ASSIGNED TEAM</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map(inc => (
                <tr key={inc.id}>
                  <td><strong className="text-primary">{inc.id}</strong></td>
                  <td className="text-muted">{inc.time}</td>
                  <td>{inc.zone}</td>
                  <td>
                    <span className={`badge-pill ${inc.severity === 'CRITICAL' ? 'bg-critical text-critical' : inc.severity === 'HIGH' ? 'bg-high text-high' : 'bg-warning text-warning'}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="desc-cell">{inc.description}</td>
                  <td className="text-secondary">{inc.team}</td>
                  <td>
                    <span className={`status-tag status-${inc.status.toLowerCase()}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td>
                    <select 
                      className="ctrl-input status-select font-mono"
                      value={inc.status}
                      onChange={(e) => updateStatus(inc.id, e.target.value)}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="RESPONDING">RESPONDING</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Log Incident */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="ctrl-card modal-box">
            <div className="ctrl-card-header">
              <div className="ctrl-card-title">LOG NEW CROWD SAFETY INCIDENT</div>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateIncident} className="modal-form font-mono">
              <div className="form-group">
                <label>Zone Location:</label>
                <select className="ctrl-input w-full" value={newZone} onChange={e => setNewZone(e.target.value)}>
                  <option>Zone 1 (NW Gate)</option>
                  <option>Zone 2 (North Concourse)</option>
                  <option>Zone 3 (NE Gate)</option>
                  <option>Zone 5 (Central Plaza)</option>
                  <option>Zone 8 (South Exit)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Severity Level:</label>
                <select className="ctrl-input w-full" value={newSeverity} onChange={e => setNewSeverity(e.target.value)}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div className="form-group">
                <label>Incident Details:</label>
                <textarea 
                  className="ctrl-input w-full" 
                  rows="3" 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Describe observed crowd behavior, obstacle, or alert..."
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="ctrl-btn ctrl-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ctrl-btn ctrl-btn-primary">Dispatch & Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
