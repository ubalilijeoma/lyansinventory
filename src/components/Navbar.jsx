import React, { useState, useEffect } from 'react';
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  UserIcon,
  PlusIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon
} from './Icons';

export default function Navbar({
  activeTab,
  onOpenMovementModal,
  onSimulatePosSale,
  setMobileOpen,
  lowStockCount = 28
}) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <MenuIcon size={24} />
        </button>
        <div className="navbar-title-group">
          <h2 className="page-heading">{activeTab}</h2>
          <div className="live-clock-pill" title="Continuous Real-Time Inventory Tracking">
            <span className="live-indicator-dot pulse-indicator"></span>
            <span className="clock-label">Time <em>t</em>:</span>
            <span className="clock-value">{currentTime}</span>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        {/* Quick Action Button for Movement (Inflow / Outflow) */}
        <button
          type="button"
          className="btn-primary-action"
          onClick={onOpenMovementModal}
          title="Record Restock, Return, Replacement, POS Sale or Damage"
        >
          <PlusIcon size={16} />
          <span>Record Movement</span>
        </button>

        {/* Quick POS Trigger Simulation */}
        <button
          type="button"
          className="btn-secondary-action"
          onClick={onSimulatePosSale}
          title="Simulate automatic stock deduction from POS Website checkout"
        >
          <ArrowDownLeftIcon size={15} />
          <span className="pos-sim-text">POS Web Sale</span>
        </button>

        {/* Notifications */}
        <div className="nav-action-wrapper">
          <button
            type="button"
            className="nav-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
          >
            <BellIcon size={20} />
            {lowStockCount > 0 && (
              <span className="notification-badge">{lowStockCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="dropdown-header">
                <h3>Notifications & Alerts</h3>
                <span className="badge-alert-count">{lowStockCount} Actionable</span>
              </div>
              <ul className="dropdown-list">
                <li className="notification-item alert">
                  <div className="notif-dot red"></div>
                  <div>
                    <p className="notif-text"><strong>28 Items</strong> below safety reorder threshold.</p>
                    <span className="notif-time">Just now · Needs Restock</span>
                  </div>
                </li>
                <li className="notification-item success">
                  <div className="notif-dot green"></div>
                  <div>
                    <p className="notif-text">POS Website Sync Active. <strong>98 orders</strong> processed today.</p>
                    <span className="notif-time">Connected · 100% Synced</span>
                  </div>
                </li>
                <li className="notification-item info">
                  <div className="notif-dot blue"></div>
                  <div>
                    <p className="notif-text">Customer Return <strong>#440</strong> verified & restored to stock.</p>
                    <span className="notif-time">1 hr ago</span>
                  </div>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="user-profile-btn" title="Lyans Woman Administrator">
          <div className="avatar-circle">
            <UserIcon size={18} />
          </div>
          <span className="user-name">Manager</span>
        </div>
      </div>
    </header>
  );
}
