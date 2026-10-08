import React, { useState, useRef } from 'react';
import { Video, Radio, Maximize2, Camera, ShieldAlert, Cpu, Layers } from 'lucide-react';

export default function LiveCameraFeed({ metrics, isConnected, frameCount, onConnect }) {
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

  return (
    <div className="ctrl-card video-feed-card" ref={containerRef}>
      <div className="ctrl-card-header">
        <div className="ctrl-card-title">
          <Video size={18} className="text-primary" />
          <span>LIVE CAMERA FEED — CAM 01 (NORTH ENTRY)</span>
          {isConnected && (
            <span className="live-pill">
              <span className="live-dot pulse-active"></span> LIVE AI DETECTOR
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
                <Radio size={12} className="text-critical pulse-active" />
                <span>ZONE A - MAIN ENTRANCE SECTOR</span>
              </div>
              <div className="stream-stats font-mono">
                <span>FPS: 30</span> | <span>RES: 1280x720</span>
              </div>
            </div>

            {/* Bottom Stream Status */}
            <div className="stream-overlay-bottom font-mono">
              <div className="overlay-stat">
                <span className="stat-lbl">DETECTED PEOPLE:</span>
                <span className="stat-val text-primary">{metrics.people_count}</span>
              </div>
              <div className="overlay-stat">
                <span className="stat-lbl">AVG VELOCITY:</span>
                <span className="stat-val">{metrics.average_speed} px/s</span>
              </div>
              <div className="overlay-stat">
                <span className="stat-lbl">MAX ZONE:</span>
                <span className="stat-val text-warning">{metrics.max_zone_people} PPL</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="video-placeholder">
            <ShieldAlert size={48} className="text-muted placeholder-icon" />
            <div className="placeholder-title">CAMERA STREAM DISCONNECTED</div>
            <div className="placeholder-desc">
              Connect to the live backend WebSocket stream to display AI crowd analysis video feed.
            </div>
            {!isConnected && (
              <button className="ctrl-btn ctrl-btn-primary placeholder-btn" onClick={onConnect}>
                <Radio size={16} />
                <span>INITIALIZE LIVE CAMERA STREAM</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
