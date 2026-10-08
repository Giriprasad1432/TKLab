import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  ShieldAlert, 
  Map, 
  Bell, 
  ClipboardList, 
  BarChart3, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, collapsed, setCollapsed, alertCount = 0 }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: Video },
    { id: 'crowd-density', label: 'Crowd Density', icon: Users },
    { id: 'risk-analysis', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'map-zones', label: 'Map / Zones', icon: Map },
    { 
      id: 'alerts', 
      label: 'Alerts', 
      icon: Bell, 
      badge: alertCount > 0 ? alertCount : null,
      badgeColor: 'bg-critical'
    },
    { id: 'incidents', label: 'Incidents', icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`ctrl-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Navigation List */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <div className="nav-icon">
                <Icon size={19} />
              </div>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className={`nav-badge ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="sidebar-footer">
        <button 
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="collapse-text">COLLAPSE SIDEBAR</span>}
        </button>
      </div>
    </aside>
  );
}
