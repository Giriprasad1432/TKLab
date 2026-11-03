import React, { useState, useRef } from 'react';
import { Video, Radio, Maximize2, Camera, ShieldAlert, Cpu, AlertTriangle, Play, RefreshCw } from 'lucide-react';

export default function LiveCameraFeed({ 
  metrics, 
  isConnected, 
  frameCount, 
  onConnect, 
  selectedSource = 'crowd.mp4',
  onSelectSource,
  availableSources = [],
  capacity,
  onUpdateCapacity,
  streamError 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const captureSnapshot = () => {
    if (!metrics?.frame_base64) return;
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${metrics.frame_base64}`;
    link.download = `stampade_snapshot_frame_${frameCount}.jpg`;
    link.click();
  };

  const isLiveCam = selectedSource === 'webcam' || metrics?.is_live;

  const defaultSourcesList = [
    { id: 'webcam', name: '📹 Live Webcam', type: 'live' },
    { id: 'crowd.mp4', name: '🎬 Video 1 (Entrance)', type: 'video' },
    { id: 'crowd2.mp4', name: '🎬 Video 2 (Dense)', type: 'video' },
    { id: 'crowd3.mp4', name: '🎬 Video 3 (Motion)', type: 'video' },
    { id: 'mot20_crowd.mp4', name: '🎬 Video 4 (MOT20)', type: 'video' },
  ];

  const sourceItems = availableSources.length > 0 ? availableSources : defaultSourcesList;

  return (
    <div className="ctrl-card video-feed-card" ref={containerRef}>
      <div className="ctrl-card-header">
        <div className="ctrl-card-title">
          <Video size={18} className={isLiveCam ? "text-critical" : "text-primary"} />
          <span>
            {isLiveCam ? "LIVE WEBCAM FEED — COMPUTER CAMERA 0" : `BENCHMARK FOOTAGE — ${selectedSource.toUpperCase()}`}
          </span>
          {isConnected && (
            <span className={isLiveCam ? "live-pill status-pill-critical" : "live-pill"}>
              <span className="live-dot pulse-active"></span> {isLiveCam ? "LIVE CAMERA" : "LIVE AI DETECTOR"}
            </span>
          )}
        </div>

        <div className="feed-header-actions">
          <div className="feed-badge font-mono text-muted">
            <Cpu size={13} />
            <span>YOLOv11 Detector</span>
          </div>

          <div className="feed-badge font-mono text-primary">
            <span>Updates: {frameCount}</span>
          </div>

          {isConnected && metrics?.frame_base64 && (
            <button 
              className="ctrl-btn ctrl-btn-outline feed-action-btn"
              onClick={captureSnapshot}
              title="Capture Frame Snapshot"
            >
              <Camera size={15} />
            </button>
          )}

          <button 
            className="ctrl-btn ctrl-btn-outline feed-action-btn"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen Mode"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Quick Video Source Switcher Toolbar */}
      <div className="feed-source-bar font-mono">
        <span className="source-bar-title">
          <Camera size={13} />
          <span>FEED SOURCE:</span>
        </span>
        <div className="source-pills">
          {sourceItems.map((s) => {
            const isItemLive = s.id === 'webcam' || s.type === 'live';
            const isActive = selectedSource === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`source-pill ${isActive ? (isItemLive ? 'active-live' : 'active') : ''}`}
                onClick={() => onSelectSource && onSelectSource(s.id)}
                title={s.description || s.name}
              >
                <span>{s.name}</span>
                {isActive && isConnected && (
                  <span className="live-dot pulse-active" style={{ width: 6, height: 6 }}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stream Error Notice if active */}
      {streamError && (
        <div className="stream-error-notice font-mono">
          <AlertTriangle size={24} className="text-critical" />
          <div className="error-title">
            <strong>CAMERA ERROR:</strong> {streamError}
          </div>
          <div className="placeholder-btn-group">
            <button 
              className="ctrl-btn ctrl-btn-primary" 
              onClick={() => onSelectSource && onSelectSource('crowd.mp4')}
            >
              <RefreshCw size={14} />
              <span>Switch to Test Video 1 (crowd.mp4)</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Stream Container */}
      <div className="video-stream-box">
        {isConnected && metrics?.frame_base64 ? (
          <div className="stream-wrapper">
            <img 
              src={`data:image/jpeg;base64,${metrics.frame_base64}`} 
              alt="Live Crowd Processing Feed" 
              className="live-video-frame"
            />

            {/* Video Overlay Info Bar */}
            <div className="stream-overlay-top">
              <div className="stream-location font-mono">
                <Radio size={12} className={isLiveCam ? "text-critical pulse-active" : "text-primary pulse-active"} />
                <span>{isLiveCam ? "LOCAL CAMERA [DEVICE 0] — LIVE MONITOR" : `PRELOADED REPLAY: ${selectedSource}`}</span>
              </div>
              <div className="stream-stats font-mono">
                <span>FPS: {metrics.fps || 30}</span> | <span>RES: 1280x720</span>
              </div>
            </div>

            {/* Bottom Stream Status */}
            <div className="stream-overlay-bottom font-mono">
              <div className="overlay-stat">
                <span className="stat-lbl">DETECTED:</span>
                <span className="stat-val text-primary">{metrics.people_count}</span>
              </div>
              <div className="overlay-stat">
                <span className="stat-lbl">SEPARATED:</span>
                <span className="stat-val text-safe">{metrics.separated_people_count ?? 0}</span>
              </div>
              <div className="overlay-stat">
                <span className="stat-lbl">CROWD PACKS:</span>
                <span className="stat-val text-warning">{metrics.clusters?.length ?? 0} ({metrics.clustered_people_count ?? 0} ppl)</span>
              </div>
              <div className="overlay-stat">
                <span className="stat-lbl">AVG VEL:</span>
                <span className="stat-val">{metrics.average_speed} px/s</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="video-placeholder">
            <ShieldAlert size={48} className="text-muted placeholder-icon" />
            <div className="placeholder-title">
              {isLiveCam ? "WEBCAM STREAM DISCONNECTED" : "TEST VIDEO STREAM DISCONNECTED"}
            </div>
            <div className="placeholder-desc">
              Select any of the 4 benchmark videos or switch to Live Webcam using the toolbar above, then start the stream.
            </div>
            {!isConnected && (
              <div className="placeholder-btn-group">
                <button 
                  className="ctrl-btn ctrl-btn-primary" 
                  onClick={() => {
                    if (onSelectSource && selectedSource !== 'webcam') {
                      onSelectSource('webcam');
                    } else if (onConnect) {
                      onConnect('webcam');
                    }
                  }}
                >
                  <Camera size={16} />
                  <span>START LIVE WEBCAM</span>
                </button>
                <button 
                  className="ctrl-btn ctrl-btn-outline" 
                  onClick={() => {
                    if (onConnect) onConnect('crowd.mp4');
                  }}
                >
                  <Play size={16} />
                  <span>PLAY TEST VIDEO (crowd.mp4)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
