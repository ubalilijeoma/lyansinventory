import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MenuIcon,
  BellIcon,
  UserIcon,
  PlusIcon,
  ArrowDownLeftIcon,
} from './Icons';

export default function Navbar({
  activeTab,
  onOpenMovementModal,
  onSimulatePosSale,
  setMobileOpen,
  lowStockCount = 28,
  roleBadge = 'Admin'
}) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

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
        {/* Role Badge Indicator */}
        <div className="role-navbar-pill" title="Active Role Session">
          <span className="role-pill-indicator"></span>
          <span className="role-pill-text">{roleBadge}</span>
        </div>

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
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
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

        {/* User Profile Avatar & Dropdown */}
        <div className="nav-action-wrapper">
          <div
            className="user-profile-btn"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            title="Account & Role Management"
          >
            <div className="avatar-circle">
              {currentUser?.avatarInitials || <UserIcon size={18} />}
            </div>
            <span className="user-name">{currentUser?.name?.split(' ')[0] || 'User'}</span>
          </div>

          {showProfileMenu && (
            <div className="profile-menu-dropdown animate-fade-in">
              <div className="profile-menu-header">
                <div className="profile-menu-name">{currentUser?.name}</div>
                <div className="profile-menu-email">{currentUser?.email}</div>
                <span className="profile-menu-role">
                  Role: {currentUser?.role?.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="profile-menu-divider"></div>

              <button
                type="button"
                className="profile-menu-item sign-out-item"
                onClick={handleSignOut}
              >
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
