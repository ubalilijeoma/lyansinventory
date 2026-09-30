import React from 'react';
import {
  LogoIcon,
  OverviewIcon,
  ProductsIcon,
  SalesIcon,
  StockIcon,
  ReportsIcon,
  SettingsIcon,
  CloseIcon
} from './Icons';

export default function Sidebar({
  activeTab = 'Overview',
  setActiveTab,
  mobileOpen = false,
  setMobileOpen
}) {
  const navItems = [
    { id: 'Overview', label: 'Overview', icon: OverviewIcon },
    { id: 'Products', label: 'Products', icon: ProductsIcon },
    { id: 'Sales', label: 'Sales', icon: SalesIcon },
    { id: 'Stock', label: 'Stock', icon: StockIcon, badge: 'Live S(t)' },
    { id: 'Reports', label: 'Reports', icon: ReportsIcon },
    { id: 'Settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar-container ${mobileOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-lockup">
            <div className="brand-icon-box">
              <LogoIcon size={22} />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Inventory Hub</h1>
              <span className="brand-subtitle">Lyans Woman</span>
            </div>
          </div>
          {setMobileOpen && (
            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <CloseIcon size={20} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav" aria-label="Main Navigation">
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="nav-icon">
                      <Icon size={19} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className={`nav-badge ${isActive ? 'badge-active' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer with POS Status */}
        <div className="sidebar-footer">
          <div className="pos-status-card">
            <div className="pos-status-header">
              <span className="status-dot online pulse-indicator"></span>
              <span className="pos-status-title">POS Live Sync</span>
            </div>
            <p className="pos-status-desc">Inflows & Outflows tracking at time <em>t</em></p>
          </div>
        </div>
      </aside>
    </>
  );
}
