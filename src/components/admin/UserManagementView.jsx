import React, { useState } from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { PlusIcon, CloseIcon, AlertTriangleIcon, CheckIcon } from '../Icons';

export default function UserManagementView({ currentRole }) {
  const {
    userDirectory,
    currentUser,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState(
    currentRole === ROLES.SUPER_ADMIN ? ROLES.ADMIN : ROLES.STAFF
  );
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('Main Store');

  const isSuperAdmin = currentRole === ROLES.SUPER_ADMIN;
  const isAdmin = currentRole === ROLES.ADMIN;

  // Filter users visible according to permissions
  const visibleUsers = userDirectory.filter((user) => {
    // Admin only sees Staff accounts and their own account (Super Admins hidden or read-only)
    if (isAdmin && user.role === ROLES.SUPER_ADMIN) {
      return false; // Hide Super Admin from Admin view
    }
    if (filterRole === 'ALL') return true;
    return user.role === filterRole;
  });

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setFeedbackMsg(msg);
      setTimeout(() => setFeedbackMsg(''), 3500);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole(isSuperAdmin ? ROLES.ADMIN : ROLES.STAFF);
    setFormTitle(isSuperAdmin ? 'Store Operations Admin' : 'Floor Inventory Specialist');
    setFormLocation('Main Store');
    setModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    // Guard: Admin cannot edit Super Admin
    if (isAdmin && user.role === ROLES.SUPER_ADMIN) {
      showNotification('Unauthorized: Admins have no authority to modify a Super Admin.', true);
      return;
    }
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormTitle(user.title || '');
    setFormLocation(user.assignedLocation || 'Main Store');
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        updateUser(
          editingUser.id,
          {
            name: formName,
            email: formEmail,
            role: formRole,
            title: formTitle,
            assignedLocation: formLocation,
          },
          currentRole
        );
        showNotification(`User account for ${formName} updated successfully.`);
      } else {
        createUser(
          {
            name: formName,
            email: formEmail,
            role: formRole,
            title: formTitle,
            assignedLocation: formLocation,
          },
          currentRole
        );
        showNotification(`New ${formRole.replace('_', ' ')} account created for ${formName}.`);
      }
      setModalOpen(false);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDelete = (userId, userName) => {
    if (window.confirm(`Are you sure you want to permanently delete the account for ${userName}?`)) {
      try {
        deleteUser(userId, currentRole);
        showNotification(`Account for ${userName} deleted.`);
      } catch (err) {
        showNotification(err.message, true);
      }
    }
  };

  const handleToggleStatus = (user) => {
    try {
      toggleUserStatus(user.id, currentRole);
      const nextStatus = user.status === 'Active' ? 'Deactivated' : 'Active';
      showNotification(`Account for ${user.name} is now ${nextStatus}.`);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">
            {isSuperAdmin ? 'Role-Based User & Access Governance' : 'Staff Account Management'}
          </h2>
          <p className="view-subtitle">
            {isSuperAdmin
              ? 'Super Admin Authority: Full governance over Admins, Staff, privileges, and account activations'
              : 'Admin Authority: Manage floor staff accounts, credentials, and location duties'}
          </p>
        </div>

        <button
          type="button"
          className="btn-primary-action"
          onClick={handleOpenCreateModal}
        >
          <PlusIcon size={16} />
          <span>{isSuperAdmin ? 'Create Admin / Staff' : 'Create Staff Account'}</span>
        </button>
      </div>

      {/* Notifications */}
      {feedbackMsg && (
        <div className="toast-banner animate-fade-in" role="status">
          <span>✓</span>
          <span>{feedbackMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="form-error-banner" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Role Filter Chips */}
      <div className="data-toolbar">
        <div className="category-filter-chips">
          <button
            type="button"
            className={`filter-chip ${filterRole === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterRole('ALL')}
          >
            All Accounts ({visibleUsers.length})
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              className={`filter-chip ${filterRole === ROLES.SUPER_ADMIN ? 'active' : ''}`}
              onClick={() => setFilterRole(ROLES.SUPER_ADMIN)}
            >
              Super Admins
            </button>
          )}
          {isSuperAdmin && (
            <button
              type="button"
              className={`filter-chip ${filterRole === ROLES.ADMIN ? 'active' : ''}`}
              onClick={() => setFilterRole(ROLES.ADMIN)}
            >
              Admins
            </button>
          )}
          <button
            type="button"
            className={`filter-chip ${filterRole === ROLES.STAFF ? 'active' : ''}`}
            onClick={() => setFilterRole(ROLES.STAFF)}
          >
            Staff
          </button>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="card data-table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Identity</th>
                <th>Assigned Role</th>
                <th>Designation</th>
                <th>Assigned Location</th>
                <th>Account Status</th>
                <th className="text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => {
                const isRootSuperAdmin = user.id === 'usr-001';
                const isCurrentUser = user.id === currentUser?.id;
                const isTargetSuperAdmin = user.role === ROLES.SUPER_ADMIN;

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-table-cell">
                        <div
                          className="user-table-avatar"
                          style={{
                            backgroundColor:
                              user.role === ROLES.SUPER_ADMIN
                                ? '#8B5CF6'
                                : user.role === ROLES.ADMIN
                                ? '#1E5BF8'
                                : '#10B981',
                          }}
                        >
                          {user.avatarInitials || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-primary">
                            {user.name} {isCurrentUser && <span className="text-muted">(You)</span>}
                          </div>
                          <div className="text-muted text-xs font-mono">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className="role-badge-pill"
                        style={{
                          backgroundColor:
                            user.role === ROLES.SUPER_ADMIN
                              ? '#F5F3FF'
                              : user.role === ROLES.ADMIN
                              ? '#EEF4FF'
                              : '#ECFDF5',
                          color:
                            user.role === ROLES.SUPER_ADMIN
                              ? '#7C3AED'
                              : user.role === ROLES.ADMIN
                              ? '#1E5BF8'
                              : '#059669',
                          borderColor:
                            user.role === ROLES.SUPER_ADMIN
                              ? '#DDD6FE'
                              : user.role === ROLES.ADMIN
                              ? '#BFDBFE'
                              : '#A7F3D0',
                        }}
                      >
                        {user.role === ROLES.SUPER_ADMIN
                          ? '👑 Super Admin'
                          : user.role === ROLES.ADMIN
                          ? '🛡️ Store Admin'
                          : '🏷️ Floor Staff'}
                      </span>
                    </td>

                    <td className="text-secondary">{user.title}</td>
                    <td className="text-secondary">{user.assignedLocation}</td>

                    <td>
                      <span
                        className={`status-pill ${
                          user.status === 'Active' ? 'status-good' : 'status-critical'
                        }`}
                      >
                        {user.status === 'Active' ? '● Active' : '○ Deactivated'}
                      </span>
                    </td>

                    <td className="text-right">
                      {isRootSuperAdmin ? (
                        <span className="badge-protected" title="Root system administrator cannot be modified">
                          🔒 Root Protected
                        </span>
                      ) : (
                        <div className="table-actions-group">
                          {/* Edit Button */}
                          <button
                            type="button"
                            className="btn-table-action edit"
                            onClick={() => handleOpenEditModal(user)}
                            title="Edit user details"
                          >
                            Edit
                          </button>

                          {/* Deactivate/Activate Toggle */}
                          <button
                            type="button"
                            className={`btn-table-action ${
                              user.status === 'Active' ? 'deactivate' : 'activate'
                            }`}
                            onClick={() => handleToggleStatus(user)}
                            title={user.status === 'Active' ? 'Deactivate account' : 'Reactivate account'}
                          >
                            {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="btn-table-action delete"
                            onClick={() => handleDelete(user.id, user.name)}
                            title="Permanently remove user"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingUser ? `Edit Account: ${editingUser.name}` : 'Create New Account'}
                </h3>
                <p className="modal-subtitle">
                  Enforces strict role permissions and assigned boutique access
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="userName">Full Name</label>
                <input
                  id="userName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Clara Dupont"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="userEmail">Work Email</label>
                <input
                  id="userEmail"
                  type="email"
                  className="form-input"
                  placeholder="e.g. clara@lyanswoman.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="userRole">Assigned Role</label>
                  <select
                    id="userRole"
                    className="form-select"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    disabled={isAdmin} // Admin can only create/manage Staff
                  >
                    {isSuperAdmin && (
                      <option value={ROLES.ADMIN}>🛡️ Store Admin</option>
                    )}
                    <option value={ROLES.STAFF}>🏷️ Floor Staff</option>
                    {isSuperAdmin && (
                      <option value={ROLES.SUPER_ADMIN}>👑 Super Admin</option>
                    )}
                  </select>
                  {isAdmin && (
                    <span className="text-xs text-muted">
                      Admins are restricted to managing Staff accounts only.
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="userLocation">Assigned Location</label>
                  <select
                    id="userLocation"
                    className="form-select"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  >
                    <option value="Main Store">Main Store (Flagship)</option>
                    <option value="Branch - North">Branch - North</option>
                    <option value="Branch - South">Branch - South</option>
                    <option value="Central Warehouse">Central Warehouse</option>
                    {isSuperAdmin && <option value="All Locations">All Locations</option>}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="userTitle">Job Title / Designation</label>
                <input
                  id="userTitle"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Inventory Associate"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-confirm confirm-inflow">
                  {editingUser ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
