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

export default function SuperAdminDashboard({
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
      {/* Sidebar with Super Admin badge and User Governance menu */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        role={ROLES.SUPER_ADMIN}
      />

      <div className="main-wrapper">
        <Navbar
          activeTab={activeTab}
          onOpenMovementModal={() => setIsModalOpen(true)}
          onSimulatePosSale={onSimulatePosSale}
          setMobileOpen={setMobileOpen}
          lowStockCount={kpis.lowStockItems}
          roleBadge="Super Admin"
        />

        {/* Role Banner */}
        <div className="role-top-banner super-admin-banner">
          <div className="role-banner-left">
            <span className="role-crown-icon">👑</span>
            <div>
              <strong>Super Administrator Console</strong>
              <span className="role-banner-sub">
                Authenticated as {currentUser?.name} ({currentUser?.email}) · Full System Governance
              </span>
            </div>
          </div>
          <div className="role-banner-right">
            <button
              type="button"
              className={`banner-tab-btn ${activeTab === 'Users' ? 'active' : ''}`}
              onClick={() => setActiveTab('Users')}
            >
              👥 Manage Admins & Staff
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
              canDeleteProducts={true}
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

          {activeTab === 'Users' && (
            <UserManagementView currentRole={ROLES.SUPER_ADMIN} />
          )}

          {['Suppliers', 'Transfers', 'Reports', 'Settings'].includes(activeTab) && (
            <div className="view-page-container animate-fade-in">
              <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                  {activeTab} Module (Super Admin Access)
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px' }}>
                  Full executive control over {activeTab.toLowerCase()}, security credentials, and multi-node warehouse policies.
                </p>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => setActiveTab('Overview')}
                  style={{ display: 'inline-flex', margin: '0 auto' }}
                >
                  Return to Executive Overview
                </button>
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
