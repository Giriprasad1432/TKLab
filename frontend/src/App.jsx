import React, { useState, useEffect, useRef } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

import TopMetrics from './components/dashboard/TopMetrics';
import LiveCameraFeed from './components/dashboard/LiveCameraFeed';
import ZoneGridMap from './components/dashboard/ZoneGridMap';
import RiskOverview from './components/dashboard/RiskOverview';
import AlertPanel from './components/dashboard/AlertPanel';
import ActivityFeed from './components/dashboard/ActivityFeed';

import LiveMonitoringPage from './components/pages/LiveMonitoringPage';
import CrowdDensityPage from './components/pages/CrowdDensityPage';
import RiskAnalysisPage from './components/pages/RiskAnalysisPage';
import MapZonesPage from './components/pages/MapZonesPage';
import AlertsPage from './components/pages/AlertsPage';
import IncidentsPage from './components/pages/IncidentsPage';
import AnalyticsPage from './components/pages/AnalyticsPage';
import ReportsPage from './components/pages/ReportsPage';
import SettingsPage from './components/pages/SettingsPage';

import './App.css';

const DEFAULT_SOURCES = [
  { id: 'webcam', name: 'Live Webcam / Camera (Device 0)', type: 'live', description: 'Real-time webcam feed with live YOLO crowd detection' },
  { id: 'crowd.mp4', name: 'Main Entrance Flow (crowd.mp4)', type: 'video', size_mb: 8.3, description: 'Pre-recorded test footage (8.3 MB)' },
  { id: 'crowd2.mp4', name: 'High Density Concourse (crowd2.mp4)', type: 'video', size_mb: 47.4, description: 'Pre-recorded test footage (47.4 MB)' },
  { id: 'crowd3.mp4', name: 'Rapid Movement & Commotion (crowd3.mp4)', type: 'video', size_mb: 4.0, description: 'Pre-recorded test footage (4.0 MB)' },
  { id: 'mot20_crowd.mp4', name: 'MOT20 Benchmark Extreme Crowd (mot20_crowd.mp4)', type: 'video', size_mb: 30.9, description: 'Pre-recorded test footage (30.9 MB)' }
];

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [capacity, setCapacity] = useState(20);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [selectedSource, setSelectedSource] = useState('crowd.mp4');
  const [availableSources, setAvailableSources] = useState(DEFAULT_SOURCES);
  const [streamError, setStreamError] = useState(null);

  const wsRef = useRef(null);

  // Fetch available sources from backend on mount
  useEffect(() => {
    fetch('http://localhost:8000/sources')
      .then(res => res.json())
      .then(data => {
        if (data?.sources?.length > 0) {
          setAvailableSources(data.sources);
        }
      })
      .catch(err => {
        console.log("Using default fallback video sources:", err);
      });
  }, []);

  const connectWebSocket = (sourceOverride) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const src = sourceOverride || selectedSource;
    if (sourceOverride && sourceOverride !== selectedSource) {
      setSelectedSource(sourceOverride);
    }

    setMetrics(null);
    setFrameCount(0);
    setStreamError(null);

    const wsUrl = `ws://localhost:8000/ws/analyze?capacity=${capacity}&source=${encodeURIComponent(src)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStreamError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error("Backend error received:", data.error);
          setStreamError(data.error);
          return;
        }
        if (!data.message) {
          setMetrics(data);
          setFrameCount(f => f + 1);
        }
      } catch (err) {
        console.error("Failed to parse WS data:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setIsConnected(false);
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  // Immediate dynamic capacity update (both in local state & live over WebSocket)
  const handleUpdateCapacity = (newCap) => {
    const val = Math.max(1, Number(newCap) || 1);
    setCapacity(val);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ capacity: val }));
      } catch (err) {
        console.error("Failed to transmit dynamic capacity:", err);
      }
    }
  };

  // Video source switching (seamlessly reconnects if already running)
  const handleSelectSource = (newSource) => {
    setSelectedSource(newSource);
    setStreamError(null);
    if (isConnected) {
      disconnectWebSocket();
      setTimeout(() => {
        connectWebSocket(newSource);
      }, 150);
    }
  };

  useEffect(() => {
    return () => disconnectWebSocket();
  }, []);

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="dashboard-page-layout">
            {/* Top Operational Metrics Banner */}
            <TopMetrics
              metrics={metrics}
              capacity={capacity}
              isConnected={isConnected}
            />

            {/* Grid 1: Live Video Feed & Risk Assessment */}
            <div className="dashboard-grid-main">
              <div className="grid-col-left">
                <LiveCameraFeed
                  metrics={metrics}
                  isConnected={isConnected}
                  frameCount={frameCount}
                  onConnect={connectWebSocket}
                  selectedSource={selectedSource}
                  onSelectSource={handleSelectSource}
                  availableSources={availableSources}
                  capacity={capacity}
                  onUpdateCapacity={handleUpdateCapacity}
                  streamError={streamError}
                />

                <RiskOverview
                  metrics={metrics}
                  isConnected={isConnected}
                />
              </div>

              {/* Grid 2: 3x3 Heatmap Grid & Alert Panel */}
              <div className="grid-col-right">
                <ZoneGridMap
                  metrics={metrics}
                  isConnected={isConnected}
                />

                <AlertPanel
                  metrics={metrics}
                  isConnected={isConnected}
                  soundEnabled={soundEnabled}
                />

                <ActivityFeed
                  metrics={metrics}
                  isConnected={isConnected}
                />
              </div>
            </div>
          </div>
        );

      case 'live-monitoring':
        return (
          <LiveMonitoringPage
            metrics={metrics}
            isConnected={isConnected}
            frameCount={frameCount}
            onConnect={connectWebSocket}
            capacity={capacity}
            onUpdateCapacity={handleUpdateCapacity}
            selectedSource={selectedSource}
            onSelectSource={handleSelectSource}
            availableSources={availableSources}
            streamError={streamError}
          />
        );

      case 'crowd-density':
        return (
          <CrowdDensityPage
            metrics={metrics}
            isConnected={isConnected}
            capacity={capacity}
          />
        );

      case 'risk-analysis':
        return (
          <RiskAnalysisPage
            metrics={metrics}
            isConnected={isConnected}
          />
        );

      case 'map-zones':
        return (
          <MapZonesPage
            metrics={metrics}
            isConnected={isConnected}
          />
        );

      case 'alerts':
        return (
          <AlertsPage
            metrics={metrics}
            isConnected={isConnected}
            soundEnabled={soundEnabled}
          />
        );

      case 'incidents':
        return <IncidentsPage />;

      case 'analytics':
        return (
          <AnalyticsPage
            metrics={metrics}
            isConnected={isConnected}
          />
        );

      case 'reports':
        return (
          <ReportsPage
            metrics={metrics}
            capacity={capacity}
            selectedSource={selectedSource}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            capacity={capacity}
            setCapacity={setCapacity}
            onUpdateCapacity={handleUpdateCapacity}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            selectedSource={selectedSource}
            onSelectSource={handleSelectSource}
            availableSources={availableSources}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="ctrl-app-wrapper">
      {/* Top Operations Header */}
      <Header
        isConnected={isConnected}
        onConnect={connectWebSocket}
        onDisconnect={disconnectWebSocket}
        capacity={capacity}
        onUpdateCapacity={handleUpdateCapacity}
        selectedSource={selectedSource}
        onSelectSource={handleSelectSource}
        availableSources={availableSources}
        metrics={metrics}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />

      {/* Main Layout Body */}
      <div className="ctrl-app-body">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          alertCount={metrics?.risk_level === 'CRITICAL' ? 1 : 0}
        />

        {/* Main Content Area */}
        <main className={`ctrl-main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default App;
