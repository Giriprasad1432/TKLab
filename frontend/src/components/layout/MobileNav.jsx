import React from 'react';
import { LayoutDashboard, Video, Map, Bell, Settings } from 'lucide-react';

export default function MobileNav({ activePage, setActivePage, isConnected, alertCount = 0 }) {
  const navItems = [
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
    { id: 'live-monitoring', label: 'Camera', icon: Video },
    { id: 'map-zones', label: 'GIS Map', icon: Map },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <nav className="mobile-bottom-nav font-mono">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <div className="mobile-nav-icon-box">
              <Icon size={20} />
              {item.badge > 0 && <span className="mobile-nav-badge">{item.badge}</span>}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

