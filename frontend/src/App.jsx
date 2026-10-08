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

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [capacity, setCapacity] = useState(20);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const wsRef = useRef(null);

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setMetrics(null);
    setFrameCount(0);

    const ws = new WebSocket(`ws://localhost:8000/ws/analyze?capacity=${capacity}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.message && !data.error) {
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
          />
        );

      case 'settings':
        return (
          <SettingsPage 
            capacity={capacity}
            setCapacity={setCapacity}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
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
        setCapacity={setCapacity}
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
