import React, { useState } from 'react';
import LiveCameraFeed from '../dashboard/LiveCameraFeed';
import { Upload, FileVideo, CheckCircle2, AlertCircle, Play, RefreshCw, Film } from 'lucide-react';

export default function LiveMonitoringPage({ 
  metrics, 
  isConnected, 
  frameCount, 
  onConnect, 
  capacity,
  onUpdateCapacity,
  selectedSource,
  onSelectSource,
  availableSources,
  streamError
}) {
  const [uploadFile, setUploadFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingName, setAnalyzingName] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setAnalyzing(true);
    setAnalyzingName(uploadFile.name);
    setErrorMsg(null);
    setBatchResult(null);

    const formData = new FormData();
    formData.append('video', uploadFile);
    formData.append('capacity', capacity);

    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setBatchResult(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze video file');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePreloadedAnalysis = async (filename) => {
    setAnalyzing(true);
    setAnalyzingName(filename);
    setErrorMsg(null);
    setBatchResult(null);

    try {
      const res = await fetch(`http://localhost:8000/analyze/preloaded?filename=${encodeURIComponent(filename)}&capacity=${capacity}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setBatchResult(data);
    } catch (err) {
      setErrorMsg(err.message || `Failed to analyze ${filename}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">LIVE CAMERA MONITORING & VIDEO ANALYZER</h2>
        <div className="page-subtitle text-muted font-mono">
          Real-time WebSocket AI stream & batch video inspection platform
        </div>
      </div>

      <div className="monitoring-layout-grid">
        {/* Main Live Stream Feed */}
        <div className="main-stream-col">
          <LiveCameraFeed 
            metrics={metrics}
            isConnected={isConnected}
            frameCount={frameCount}
            onConnect={onConnect}
            selectedSource={selectedSource}
            onSelectSource={onSelectSource}
            availableSources={availableSources}
            capacity={capacity}
            onUpdateCapacity={onUpdateCapacity}
            streamError={streamError}
          />
        </div>

        {/* Batch File Analyzer Panel */}
        <div className="side-analyzer-col">
          <div className="ctrl-card batch-upload-card">
            <div className="ctrl-card-header">
              <div className="ctrl-card-title">
                <Upload size={18} className="text-primary" />
                <span>OFFLINE VIDEO ANALYZER</span>
              </div>
            </div>

            {/* Quick Analyze Preloaded Videos */}
            <div className="preloaded-vids-section font-mono">
              <div className="preloaded-title">
                <Film size={14} className="text-accent-cyan" />
                <span>ONE-CLICK BENCHMARK TEST RUNNERS:</span>
              </div>
              <div className="preloaded-grid">
                <button
                  type="button"
                  className="preloaded-btn"
                  onClick={() => handlePreloadedAnalysis('crowd.mp4')}
                  disabled={analyzing}
                >
                  <span className="preloaded-btn-name">🎬 crowd.mp4</span>
                  <span className="preloaded-btn-sub">Entrance Flow</span>
                </button>
                <button
                  type="button"
                  className="preloaded-btn"
                  onClick={() => handlePreloadedAnalysis('crowd2.mp4')}
                  disabled={analyzing}
                >
                  <span className="preloaded-btn-name">🎬 crowd2.mp4</span>
                  <span className="preloaded-btn-sub">High Density Concourse</span>
                </button>
                <button
                  type="button"
                  className="preloaded-btn"
                  onClick={() => handlePreloadedAnalysis('crowd3.mp4')}
                  disabled={analyzing}
                >
                  <span className="preloaded-btn-name">🎬 crowd3.mp4</span>
                  <span className="preloaded-btn-sub">Fast Dynamics / Commotion</span>
                </button>
                <button
                  type="button"
                  className="preloaded-btn"
                  onClick={() => handlePreloadedAnalysis('mot20_crowd.mp4')}
                  disabled={analyzing}
                >
                  <span className="preloaded-btn-name">🎬 mot20_crowd.mp4</span>
                  <span className="preloaded-btn-sub">MOT20 Benchmark</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="upload-form" style={{ marginTop: '1.25rem' }}>
              <p className="upload-desc text-muted">
                Or upload custom recorded footage to run full YOLO crowd analysis:
              </p>

              <div className="file-dropzone font-mono">
                <FileVideo size={28} className="text-primary" />
                <input 
                  type="file" 
                  accept=".mp4,.avi,.mov,.mkv"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="file-input"
                />
                <div className="file-name">
                  {uploadFile ? uploadFile.name : "Select MP4 Video File..."}
                </div>
              </div>

              <button 
                type="submit" 
                className="ctrl-btn ctrl-btn-primary w-full"
                disabled={!uploadFile || analyzing}
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={16} className="pulse-active" />
                    <span>ANALYZING {analyzingName}...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>RUN CUSTOM FOOTAGE ANALYSIS</span>
                  </>
                )}
              </button>
            </form>

            {errorMsg && (
              <div className="batch-error font-mono bg-critical text-critical">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {batchResult && (
              <div className="batch-results-box font-mono">
                <div className="results-header text-safe">
                  <CheckCircle2 size={16} /> ANALYSIS COMPLETE ({analyzingName || 'Video'})
                </div>
                <div className="results-grid">
                  <div>Max People: <strong>{batchResult.people_count}</strong></div>
                  <div>Max Occupancy: <strong>{batchResult.occupancy}%</strong></div>
                  <div>Worst Risk Level: <strong className={batchResult.risk_level === 'CRITICAL' ? 'text-critical' : 'text-warning'}>{batchResult.risk_level}</strong></div>
                  <div>Risk Score: <strong>{batchResult.risk_score}/100</strong></div>
                  <div>Max Speed: <strong>{batchResult.average_speed} px/s</strong></div>
                  <div>Sudden Motion: <strong>{batchResult.sudden_movement ? 'YES' : 'NO'}</strong></div>
                  <div>Crowd Packs: <strong>{batchResult.max_clusters_count || 0}</strong></div>
                  <div>Effective FPS: <strong>{batchResult.fps || 0}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
