import React, { useState, useEffect } from 'react';
import { Settings, Save, Volume2, Video, Check, Sliders, RotateCcw, Grid, Layers, Sparkles } from 'lucide-react';
import { getCameraConfig, DEFAULT_CAMERA_ZONES, GENERIC_DEFAULT_DIVISIONS } from '../../config/cameraZones';

export default function SettingsPage({
  capacity,
  setCapacity,
  onUpdateCapacity,
  soundEnabled,
  setSoundEnabled,
  selectedSource,
  onSelectSource,
  availableSources = [],
  cameraConfigs = {},
  onUpdateDivisionName,
  onResetDivisions,
  backendHost,
  onUpdateBackendHost
}) {
  const [tempCapacity, setTempCapacity] = useState(String(capacity));
  const [tempSource, setTempSource] = useState(selectedSource || 'crowd.mp4');
  const [saved, setSaved] = useState(false);
  const [apiUrl, setApiUrl] = useState(backendHost || 'localhost:8000');

  useEffect(() => {
    if (backendHost) {
      setApiUrl(backendHost);
    }
  }, [backendHost]);

  // Camera & 9-Division editor state
  const [selectedCamToEdit, setSelectedCamToEdit] = useState(selectedSource || 'crowd.mp4');
  const [divisionDraft, setDivisionDraft] = useState({});
  const [zoneSaveSuccess, setZoneSaveSuccess] = useState(false);

  useEffect(() => {
    setTempCapacity(String(capacity));
  }, [capacity]);

  useEffect(() => {
    if (selectedSource) {
      setTempSource(selectedSource);
      if (!selectedCamToEdit) {
        setSelectedCamToEdit(selectedSource);
      }
    }
  }, [selectedSource]);

  // Sync draft divisions when camera to edit changes
  useEffect(() => {
    const cfg = getCameraConfig(cameraConfigs, selectedCamToEdit);
    setDivisionDraft({ ...(cfg.divisions || GENERIC_DEFAULT_DIVISIONS) });
  }, [selectedCamToEdit, cameraConfigs]);

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
    if (onUpdateBackendHost && apiUrl) {
      onUpdateBackendHost(apiUrl);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const stepCapacity = (delta) => {
    const cur = parseInt(tempCapacity, 10) || 20;
    const nextVal = Math.max(1, cur + delta);
    setTempCapacity(String(nextVal));
  };

  const handleSaveDivisions = (e) => {
    e.preventDefault();
    if (onUpdateDivisionName) {
      Object.keys(divisionDraft).forEach((zNum) => {
        onUpdateDivisionName(selectedCamToEdit, zNum, divisionDraft[zNum]);
      });
    }
    setZoneSaveSuccess(true);
    setTimeout(() => setZoneSaveSuccess(false), 2500);
  };

  const handleResetCurrentCamDivisions = () => {
    if (onResetDivisions) {
      onResetDivisions(selectedCamToEdit);
    }
    const def = DEFAULT_CAMERA_ZONES[selectedCamToEdit];
    if (def) {
      setDivisionDraft({ ...def.divisions });
    }
    setZoneSaveSuccess(true);
    setTimeout(() => setZoneSaveSuccess(false), 2000);
  };

  const applyPreset = (presetType) => {
    if (presetType === 'directional') {
      setDivisionDraft({
        1: 'NW (Top-Left)', 2: 'North (Top-Center)', 3: 'NE (Top-Right)',
        4: 'West (Mid-Left)', 5: 'Center (Mid-Field)', 6: 'East (Mid-Right)',
        7: 'SW (Bottom-Left)', 8: 'South (Foreground)', 9: 'SE (Bottom-Right)'
      });
    } else if (presetType === 'depth') {
      setDivisionDraft({
        1: 'Far-Left (Background)', 2: 'Far-Center (Background)', 3: 'Far-Right (Background)',
        4: 'Mid-Left (Lateral)', 5: 'Center Core (Focal Point)', 6: 'Mid-Right (Lateral)',
        7: 'Near-Left (Foreground)', 8: 'Near-Center (Foreground)', 9: 'Near-Right (Foreground)'
      });
    } else if (presetType === 'venue') {
      setDivisionDraft({
        1: 'NW Gate (1)', 2: 'North Concourse (2)', 3: 'NE Gate (3)',
        4: 'West Corridor (4)', 5: 'Central Plaza (5)', 6: 'East Corridor (6)',
        7: 'SW Plaza (7)', 8: 'South Exit (8)', 9: 'SE Exit (9)'
      });
    }
  };

  const activeEditConfig = getCameraConfig(cameraConfigs, selectedCamToEdit);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">SYSTEM CONFIGURATION & OPERATIONAL SETTINGS</h2>
        <div className="page-subtitle text-muted font-mono">
          Tune safety thresholds, audio alert chimes, video feed sources, and 9-division camera zone names
        </div>
      </div>

      <div className="settings-page-stack">
        {/* SECTION 1: GLOBAL CONTROL THRESHOLDS */}
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
                <div className="setting-title">Backend API & WebSocket Server Host</div>
                <div className="setting-desc text-muted">
                  Host address used by Desktop, Website, and Mobile Apps to connect to Python WebSockets. For local mobile testing, enter your PC local Wi-Fi IP (e.g. <code>192.168.1.15:8000</code>).
                </div>
              </div>
              <input
                type="text"
                className="ctrl-input font-mono setting-input"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="localhost:8000 or IP:8000"
              />
            </div>

            <div className="settings-footer">
              <button type="submit" className="ctrl-btn ctrl-btn-primary">
                {saved ? <Check size={16} /> : <Save size={16} />}
                <span>{saved ? 'SETTINGS SAVED & APPLIED' : 'SAVE GENERAL CONFIG'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: CAMERA VIEWS & 9-DIVISION ZONE NAMES MANAGER */}
        <div className="ctrl-card settings-card mt-4">
          <div className="ctrl-card-header">
            <div className="ctrl-card-title">
              <Grid size={18} className="text-primary" />
              <span>CAMERA VIEWS & 9-DIVISION ZONE NAMES MANAGER</span>
            </div>
          </div>

          <div className="p-4 font-mono">
            <p className="text-muted text-sm mb-4">
              Each camera view monitors a distinct area of the facility. You can configure and customize the 9 spatial division names for each camera feed independently (e.g. NW Gate, West Corridor, Central Plaza, or custom names). Changes persist in your browser.
            </p>

            {/* Select Camera to Configure */}
            <div className="setting-row mb-4">
              <div className="setting-info">
                <div className="setting-title">Select Camera View to Configure:</div>
                <div className="setting-desc text-muted">
                  Assigned Facility Sector: <strong className="text-accent-cyan">{activeEditConfig.facilityZone}</strong>
                </div>
              </div>
              <select
                className="ctrl-input font-mono setting-input"
                value={selectedCamToEdit}
                onChange={(e) => setSelectedCamToEdit(e.target.value)}
              >
                <option value="crowd.mp4">Camera 01: Entrance Flow (crowd.mp4)</option>
                <option value="crowd2.mp4">Camera 02: High Density Concourse (crowd2.mp4)</option>
                <option value="crowd3.mp4">Camera 03: Rapid Movement (crowd3.mp4)</option>
                <option value="mot20_crowd.mp4">Camera 04: MOT20 Benchmark (mot20_crowd.mp4)</option>
                <option value="webcam">Camera 00: Live Webcam / Device 0 (webcam)</option>
              </select>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-xs text-muted flex items-center gap-1">
                <Sparkles size={13} className="text-accent-cyan" />
                <span>NAMING PRESETS:</span>
              </span>
              <button
                type="button"
                className="ctrl-btn ctrl-btn-outline text-xs py-1"
                onClick={() => applyPreset('directional')}
                title="Universal compass directions that match any camera video"
              >
                🧭 Compass Directional (NW, North, NE, West, Center...)
              </button>
              <button
                type="button"
                className="ctrl-btn ctrl-btn-outline text-xs py-1"
                onClick={() => applyPreset('depth')}
                title="Optical depth perspective (Background, Mid-Field, Foreground)"
              >
                📐 Perspective Depth (Far-Field, Mid, Foreground)
              </button>
              <button
                type="button"
                className="ctrl-btn ctrl-btn-outline text-xs py-1"
                onClick={() => applyPreset('venue')}
                title="Custom facility landmark names"
              >
                🏟️ Venue Landmarks (Optional: Gate, Plaza, Exit)
              </button>
            </div>

            {/* 3x3 Division Name Editor Grid */}
            <form onSubmit={handleSaveDivisions}>
              <div className="editor-3x3-grid mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <div key={num} className="editor-cell">
                    <label className="editor-cell-label text-xs">Sector Z{num}</label>
                    <input
                      type="text"
                      className="ctrl-input editor-input text-xs"
                      value={divisionDraft[num] || ''}
                      onChange={(e) => setDivisionDraft({ ...divisionDraft, [num]: e.target.value })}
                      placeholder={`Division ${num} name`}
                    />
                  </div>
                ))}
              </div>

              <div className="settings-footer flex items-center justify-between">
                <button
                  type="button"
                  className="ctrl-btn ctrl-btn-outline"
                  onClick={handleResetCurrentCamDivisions}
                >
                  <RotateCcw size={15} />
                  <span>RESET TO DEFAULTS</span>
                </button>

                <button type="submit" className="ctrl-btn ctrl-btn-primary">
                  {zoneSaveSuccess ? <Check size={16} /> : <Save size={16} />}
                  <span>{zoneSaveSuccess ? 'DIVISION NAMES SAVED!' : `APPLY TO ${activeEditConfig.cameraName.toUpperCase()}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
