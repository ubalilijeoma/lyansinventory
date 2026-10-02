import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StockFlowModal from '../components/StockFlowModal';
import {
  SearchIcon,
  PlusIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  AlertTriangleIcon,
  UserIcon,
  CheckIcon,
  LogoIcon
} from '../components/Icons';

export default function StaffDashboard({
  products,
  locations,
  transactions,
  onStockMovement,
  onSimulatePosSale
}) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState('inflow');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('catalog');

  const handleOpenDutyModal = (type) => {
    setModalDefaultType(type);
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const staffTransactions = transactions.slice(0, 6);

  return (
    <div className="staff-layout animate-fade-in">
      {/* Top Header */}
      <header className="staff-navbar">
        <div className="staff-nav-brand">
          <div className="staff-brand-icon">
            <LogoIcon size={22} />
          </div>
          <div>
            <h1 className="staff-brand-title">Inventory Hub</h1>
            <span className="staff-brand-sub">Floor Staff Operations Desk</span>
          </div>
        </div>

        <div className="staff-nav-user">
          <span className="role-badge-pill staff-badge">🏷️ Floor Staff</span>
          <div className="staff-user-info">
            <span className="staff-user-name">{currentUser?.name}</span>
            <span className="staff-user-loc">📍 {currentUser?.assignedLocation || 'Main Store'}</span>
          </div>
          <button
            type="button"
            className="btn-staff-logout"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Security & Access Restriction Notice */}
      <div className="staff-access-banner">
        <div className="staff-banner-content">
          <span>🔒 <strong>Role Privileges: Operational Access Only.</strong> You can view active stock and record assigned inflows/outflows. User administration and system configurations are restricted.</span>
          <div className="staff-test-prohibited-links">
            <span className="test-label">Test 403 Forbidden Guard:</span>
            <button
              type="button"
              className="btn-prohibited-test"
              onClick={() => navigate('/dashboard/super-admin')}
              title="Attempt accessing Super Admin console as Staff"
            >
              Try Super Admin (403 Test)
            </button>
            <button
              type="button"
              className="btn-prohibited-test"
              onClick={() => navigate('/dashboard/admin')}
              title="Attempt accessing Store Admin console as Staff"
            >
              Try Store Admin (403 Test)
            </button>
          </div>
        </div>
      </div>

      <div className="staff-body">
        {/* Quick Action Tiles for Duty Execution */}
        <section className="staff-actions-grid" aria-label="Floor Staff Operational Actions">
          <button
            type="button"
            className="staff-action-card action-restock"
            onClick={() => handleOpenDutyModal('inflow')}
          >
            <div className="action-icon-circle green">
              <ArrowUpRightIcon size={24} />
            </div>
            <div className="action-text">
              <h3>+ Record Restock Batch</h3>
              <p>Scan and receive incoming supplier shipments into inventory</p>
            </div>
            <span className="action-tag">Inflow Intake</span>
          </button>

          <button
            type="button"
            className="staff-action-card action-return"
            onClick={() => handleOpenDutyModal('inflow')}
          >
            <div className="action-icon-circle blue">
              <CheckIcon size={24} />
            </div>
            <div className="action-text">
              <h3>↩ Process Customer Return</h3>
              <p>Re-enter verified undamaged merchandise back to active stock</p>
            </div>
            <span className="action-tag">Customer RMA</span>
          </button>

          <button
            type="button"
            className="staff-action-card action-pos"
            onClick={onSimulatePosSale}
          >
            <div className="action-icon-circle purple">
              <ArrowDownLeftIcon size={24} />
            </div>
            <div className="action-text">
              <h3>🛍 POS Web Sale Assist</h3>
              <p>Trigger and reconcile automated checkout stock deductions</p>
            </div>
            <span className="action-tag">POS Outflow</span>
          </button>

          <button
            type="button"
            className="staff-action-card action-damaged"
            onClick={() => handleOpenDutyModal('outflow')}
          >
            <div className="action-icon-circle red">
              <AlertTriangleIcon size={24} />
            </div>
            <div className="action-text">
              <h3>⚠ Report Damaged Stock</h3>
              <p>Write-off soiled, defective, or broken items from counts</p>
            </div>
            <span className="action-tag">Outflow Write-off</span>
          </button>
        </section>

        {/* Content Split: Product Stock Lookup & Recent Activity */}
        <div className="staff-content-split">
          {/* Left: Product Lookup */}
          <div className="card staff-product-card">
            <div className="card-header">
              <h3 className="card-title">Active Shelf Inventory Lookup</h3>
              <span className="card-badge-info">{filteredProducts.length} Items Listed</span>
            </div>

            <div className="search-bar-wrapper" style={{ width: '100%', marginBottom: '14px' }}>
              <SearchIcon size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search products by SKU or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Category</th>
                    <th>Available Units</th>
                    <th>Assigned Location</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell-name">{p.name}</div>
                        <span className="product-cell-sku">{p.sku}</span>
                      </td>
                      <td>
                        <span className="category-pill">{p.category}</span>
                      </td>
                      <td>
                        <span
                          className={`stock-number-pill ${
                            p.stock <= 10 ? 'critical' : p.stock <= p.reorderLevel ? 'warning' : 'good'
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </td>
                      <td className="text-muted">{p.location}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => setIsModalOpen(true)}
                        >
                          + Log Event
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Recent Staff Shift Activity */}
          <div className="card staff-recent-card">
            <div className="card-header">
              <h3 className="card-title">Recent Movement Logs</h3>
              <span className="card-badge-info">Active Shift</span>
            </div>

            <div className="staff-activity-feed">
              {staffTransactions.map((tx) => (
                <div key={tx.id} className="staff-activity-item">
                  <div
                    className={`activity-bullet ${tx.type === 'inflow' ? 'bullet-inflow' : 'bullet-outflow'}`}
                  >
                    {tx.type === 'inflow' ? '+' : '-'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">
                      <strong>{tx.entity}</strong> · <span>{tx.flowSubType}</span>
                    </div>
                    <span className="activity-meta">
                      Ref: {tx.id} · {tx.timestamp}
                    </span>
                  </div>
                  <div className="activity-qty">
                    <span className={`qty-tag ${tx.type === 'inflow' ? 'inflow' : 'outflow'}`}>
                      {tx.type === 'inflow' ? `+${tx.itemsQty || 1}` : `-${tx.itemsQty || 1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <StockFlowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        locations={locations}
        onSubmitMovement={onStockMovement}
      />
    </div>
  );
}
