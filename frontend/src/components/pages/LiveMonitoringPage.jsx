import React, { useState } from 'react';
import LiveCameraFeed from '../dashboard/LiveCameraFeed';
import { Upload, FileVideo, CheckCircle2, AlertCircle, Play, RefreshCw } from 'lucide-react';

export default function LiveMonitoringPage({ metrics, isConnected, frameCount, onConnect, capacity }) {
  const [uploadFile, setUploadFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setAnalyzing(true);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">LIVE CAMERA MONITORING & VIDEO ANALYZER</h2>
        <div className="page-subtitle text-muted font-mono">
          Real-time WebSocket AI stream & batch video file inspection platform
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
          />
        </div>

        {/* Batch File Analyzer Panel (Connecting to POST /analyze) */}
        <div className="side-analyzer-col">
          <div className="ctrl-card batch-upload-card">
            <div className="ctrl-card-header">
              <div className="ctrl-card-title">
                <Upload size={18} className="text-primary" />
                <span>OFFLINE VIDEO ANALYZER</span>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="upload-form">
              <p className="upload-desc text-muted">
                Upload an MP4 recorded footage file to run complete backend YOLO risk analysis.
              </p>

              <div className="file-dropzone font-mono">
                <FileVideo size={32} className="text-primary" />
                <input 
                  type="file" 
                  accept=".mp4"
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
                    <span>ANALYZING FOOTAGE...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>RUN POST-ANALYSIS</span>
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
                  <CheckCircle2 size={16} /> ANALYSIS COMPLETE
                </div>
                <div className="results-grid">
                  <div>Max People: <strong>{batchResult.people_count}</strong></div>
                  <div>Max Occupancy: <strong>{batchResult.occupancy}%</strong></div>
                  <div>Worst Risk Level: <strong className={batchResult.risk_level === 'CRITICAL' ? 'text-critical' : 'text-warning'}>{batchResult.risk_level}</strong></div>
                  <div>Risk Score: <strong>{batchResult.risk_score}/100</strong></div>
                  <div>Max Speed: <strong>{batchResult.average_speed} px/s</strong></div>
                  <div>Sudden Motion: <strong>{batchResult.sudden_movement ? 'YES' : 'NO'}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
