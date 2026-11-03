import React, { useState, useEffect } from 'react';
import { Settings, Save, Volume2, Video, Check } from 'lucide-react';

export default function SettingsPage({
  capacity,
  setCapacity,
  onUpdateCapacity,
  soundEnabled,
  setSoundEnabled,
  selectedSource,
  onSelectSource,
  availableSources = []
}) {
  const [tempCapacity, setTempCapacity] = useState(String(capacity));
  const [tempSource, setTempSource] = useState(selectedSource || 'crowd.mp4');
  const [saved, setSaved] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');

  useEffect(() => {
    setTempCapacity(String(capacity));
  }, [capacity]);

  useEffect(() => {
    if (selectedSource) {
      setTempSource(selectedSource);
    }
  }, [selectedSource]);

  const handleSave = (e) => {
    e.preventDefault();
    const capNum = Math.max(1, parseInt(tempCapacity, 10) || 20);
    setCapacity(capNum);
    if (onUpdateCapacity) {
      onUpdateCapacity(capNum);
    }
    if (onSelectSource && tempSource !== selectedSource) {
      onSelectSource(tempSource);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const stepCapacity = (delta) => {
    const cur = parseInt(tempCapacity, 10) || 20;
    const nextVal = Math.max(1, cur + delta);
    setTempCapacity(String(nextVal));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">SYSTEM CONFIGURATION & OPERATIONAL SETTINGS</h2>
        <div className="page-subtitle text-muted font-mono">
          Tune safety thresholds, audio alert chimes, video feed sources, and detector capacity parameters
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
              <div className="setting-desc text-muted">
                Maximum number of people allowed in the monitored zone before OVER_CAPACITY alarm.
              </div>
            </div>
            <div className="capacity-stepper">
              <button
                type="button"
                className="stepper-btn stepper-minus"
                onClick={() => stepCapacity(-10)}
                title="Decrease Capacity (-10)"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="ctrl-input font-mono setting-input text-center"
                style={{ width: '80px' }}
                value={tempCapacity}
                onChange={(e) => setTempCapacity(e.target.value)}
              />
              <button
                type="button"
                className="stepper-btn stepper-plus"
                onClick={() => stepCapacity(10)}
                title="Increase Capacity (+10)"
              >
                +
              </button>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Default Video / Camera Feed</div>
              <div className="setting-desc text-muted">
                Primary feed source to initialize for real-time YOLOv11 person tracking & risk detection.
              </div>
            </div>
            <select
              className="ctrl-input font-mono setting-input"
              value={tempSource}
              onChange={(e) => setTempSource(e.target.value)}
            >
              <option value="webcam">📹 Live Webcam (Camera Device 0)</option>
              <option value="crowd.mp4">🎬 Test Video 1: Entrance Flow (crowd.mp4)</option>
              <option value="crowd2.mp4">🎬 Test Video 2: High Density Concourse (crowd2.mp4)</option>
              <option value="crowd3.mp4">🎬 Test Video 3: Rapid Dynamics (crowd3.mp4)</option>
              <option value="mot20_crowd.mp4">🎬 Test Video 4: MOT20 Benchmark (mot20_crowd.mp4)</option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Emergency Audio Sirens</div>
              <div className="setting-desc text-muted">
                Play synth audio siren when critical stampede risk (score ≥ 70) is detected.
              </div>
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
              <div className="setting-desc text-muted">
                FastAPI Python backend connection string for WebSocket & analysis endpoint.
              </div>
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
              <span>{saved ? 'SETTINGS SAVED & APPLIED' : 'SAVE CONFIGURATION'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
