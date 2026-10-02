import React from 'react';
import {
  LogoIcon,
  OverviewIcon,
  ProductsIcon,
  PurchasesIcon,
  SuppliersIcon,
  SalesIcon,
  StockIcon,
  TransfersIcon,
  ReportsIcon,
  SettingsIcon,
  CloseIcon,
  UserIcon
} from './Icons';
import { useAuth, ROLES } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({
  activeTab = 'Overview',
  setActiveTab,
  mobileOpen = false,
  setMobileOpen,
  role = ROLES.SUPER_ADMIN
}) {
  const { currentUser, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  // Role-customized navigation list
  const navItems = [
    { id: 'Overview', label: 'Overview', icon: OverviewIcon },
    { id: 'Products', label: 'Products', icon: ProductsIcon },
    { id: 'Purchases', label: 'Purchases', icon: PurchasesIcon },
    { id: 'Sales', label: 'Sales', icon: SalesIcon },
    { id: 'Stock', label: 'Stock', icon: StockIcon, badge: 'Live S(t)' },
    { id: 'Transfers', label: 'Transfers', icon: TransfersIcon },
    { id: 'Reports', label: 'Reports', icon: ReportsIcon },
    // Role-specific Governance Item
    ...(role === ROLES.SUPER_ADMIN
      ? [{ id: 'Users', label: 'User Governance', icon: SuppliersIcon, badge: 'Admins & Staff' }]
      : role === ROLES.ADMIN
      ? [{ id: 'Staff', label: 'Staff Accounts', icon: SuppliersIcon, badge: 'Staff Only' }]
      : []),
    { id: 'Settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
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

        {/* Sidebar Footer with Active Role Profile */}
        <div className="sidebar-footer">
          <div className="pos-status-card" style={{ marginBottom: '10px' }}>
            <div className="pos-status-header">
              <span className="status-dot online pulse-indicator"></span>
              <span className="pos-status-title">POS Live Sync</span>
            </div>
            <p className="pos-status-desc">Inflows & Outflows tracking at time <em>t</em></p>
          </div>

          <div className="sidebar-user-pill">
            <div className="sidebar-user-avatar">
              {currentUser?.avatarInitials || 'U'}
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{currentUser?.name}</span>
              <span className="sidebar-user-role">
                {role === ROLES.SUPER_ADMIN ? '👑 Super Admin' : '🛡️ Store Admin'}
              </span>
            </div>
            <button
              type="button"
              className="btn-sidebar-logout"
              onClick={handleSignOut}
              title="Sign Out"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
