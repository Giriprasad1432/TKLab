import React, { useState } from 'react';
import { Settings, Save, Volume2, Shield, Radio, Server, Check } from 'lucide-react';

export default function SettingsPage({ capacity, setCapacity, soundEnabled, setSoundEnabled }) {
  const [tempCapacity, setTempCapacity] = useState(capacity);
  const [saved, setSaved] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');

  const handleSave = (e) => {
    e.preventDefault();
    setCapacity(Number(tempCapacity));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">SYSTEM CONFIGURATION & OPERATIONAL SETTINGS</h2>
        <div className="page-subtitle text-muted font-mono">
          Tune safety thresholds, audio alert chimes, API connections, and detector capacity parameters
        </div>
      </div>

      <div className="ctrl-card settings-card">
        <div className="ctrl-card-header">
          <div className="ctrl-card-title">
            <Settings size={18} className="text-primary" />
            <span>CONTROL CENTER THRESHOLDS & PREFERENCES</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="settings-form font-mono">
          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Venue Maximum Capacity</div>
              <div className="setting-desc text-muted">Maximum number of people allowed in the monitored zone before OVER_CAPACITY alarm.</div>
            </div>
            <input 
              type="number" 
              className="ctrl-input font-mono setting-input"
              value={tempCapacity}
              onChange={(e) => setTempCapacity(e.target.value)}
              min="1"
              max="50000"
            />
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Emergency Audio Sirens</div>
              <div className="setting-desc text-muted">Play synth audio siren when critical stampede risk (score ≥ 70) is detected.</div>
            </div>
            <button
              type="button"
              className={`ctrl-btn ${soundEnabled ? 'ctrl-btn-primary' : 'ctrl-btn-outline'}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <Volume2 size={16} />
              <span>{soundEnabled ? 'AUDIO ENABLED' : 'AUDIO MUTED'}</span>
            </button>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Backend API Base Host URL</div>
              <div className="setting-desc text-muted">FastAPI Python backend connection string for WebSocket & analysis endpoint.</div>
            </div>
            <input 
              type="text" 
              className="ctrl-input font-mono setting-input"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          <div className="settings-footer">
            <button type="submit" className="ctrl-btn ctrl-btn-primary">
              {saved ? <Check size={16} /> : <Save size={16} />}
              <span>{saved ? 'SETTINGS SAVED' : 'SAVE CONFIGURATION'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
