import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import OverviewView from '../components/OverviewView';
import ProductsView from '../components/ProductsView';
import PurchasesView from '../components/PurchasesView';
import SalesView from '../components/SalesView';
import StockLedgerView from '../components/StockLedgerView';
import StockFlowModal from '../components/StockFlowModal';
import UserManagementView from '../components/admin/UserManagementView';
import { useAuth, ROLES } from '../context/AuthContext';

export default function AdminDashboard({
  kpis,
  categories,
  transactions,
  locations,
  products,
  onStockMovement,
  onSimulatePosSale
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        role={ROLES.ADMIN}
      />

      <div className="main-wrapper">
        <Navbar
          activeTab={activeTab}
          onOpenMovementModal={() => setIsModalOpen(true)}
          onSimulatePosSale={onSimulatePosSale}
          setMobileOpen={setMobileOpen}
          lowStockCount={kpis.lowStockItems}
          roleBadge="Store Admin"
        />

        {/* Role Banner */}
        <div className="role-top-banner admin-banner">
          <div className="role-banner-left">
            <span className="role-shield-icon">🛡️</span>
            <div>
              <strong>Store Admin Console</strong>
              <span className="role-banner-sub">
                Authenticated as {currentUser?.name} · Store & Staff Operations Management
              </span>
            </div>
          </div>
          <div className="role-banner-right">
            <button
              type="button"
              className={`banner-tab-btn ${activeTab === 'Staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('Staff')}
            >
              👥 Manage Staff Accounts
            </button>
          </div>
        </div>

        <main className="content-body">
          {activeTab === 'Overview' && (
            <OverviewView
              kpis={kpis}
              categories={categories}
              transactions={transactions}
              locations={locations}
              onViewAllPurchases={() => setActiveTab('Purchases')}
            />
          )}

          {activeTab === 'Products' && (
            <ProductsView
              products={products}
              onOpenMovementModal={() => setIsModalOpen(true)}
              canDeleteProducts={false} // Only Super Admin can delete catalog lines
            />
          )}

          {activeTab === 'Purchases' && (
            <PurchasesView
              transactions={transactions}
              onOpenMovementModal={() => setIsModalOpen(true)}
            />
          )}

          {activeTab === 'Sales' && (
            <SalesView
              transactions={transactions}
              onOpenMovementModal={() => setIsModalOpen(true)}
              onSimulatePosSale={onSimulatePosSale}
            />
          )}

          {activeTab === 'Stock' && (
            <StockLedgerView
              kpis={kpis}
              transactions={transactions}
              onOpenMovementModal={() => setIsModalOpen(true)}
            />
          )}

          {/* Admin can only manage Staff accounts; Super Admins are filtered out */}
          {activeTab === 'Staff' && (
            <UserManagementView currentRole={ROLES.ADMIN} />
          )}

          {['Suppliers', 'Transfers', 'Reports'].includes(activeTab) && (
            <div className="view-page-container animate-fade-in">
              <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                  {activeTab} Operations
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px' }}>
                  Store-level inventory movements, branch transfers, and sales reconciliation.
                </p>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => setActiveTab('Overview')}
                  style={{ display: 'inline-flex', margin: '0 auto' }}
                >
                  Return to Overview
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="view-page-container animate-fade-in">
              <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                  Restricted Settings
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px' }}>
                  Root enterprise configurations and database master credentials are restricted to Super Administrators.
                </p>
              </div>
            </div>
          )}
        </main>
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
