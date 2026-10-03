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
import TransfersView from '../components/TransfersView';
import ReportsView from '../components/ReportsView';
import SettingsView from '../components/SettingsView';
import { useAuth, ROLES } from '../context/AuthContext';

export default function SuperAdminDashboard({
  kpis,
  categories,
  transactions,
  locations,
  products,
  onStockMovement,
  onSimulatePosSale,
  onRefreshData
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
              onProductChanged={onRefreshData}
            />
          )}

          {activeTab === 'Purchases' && (
            <PurchasesView
              transactions={transactions}
              onOpenMovementModal={() => setIsModalOpen(true)}
              onRefreshData={onRefreshData}
            />
          )}

          {activeTab === 'Sales' && (
            <SalesView
              transactions={transactions}
              onOpenMovementModal={() => setIsModalOpen(true)}
              onSimulatePosSale={onSimulatePosSale}
              onRefreshData={onRefreshData}
            />
          )}

          {activeTab === 'Stock' && (
            <StockLedgerView
              kpis={kpis}
              transactions={transactions}
              onOpenMovementModal={() => setIsModalOpen(true)}
              onStockMovement={onStockMovement}
            />
          )}

          {activeTab === 'Transfers' && (
            <TransfersView
              products={products}
              locations={locations}
              onRefreshData={onRefreshData}
            />
          )}

          {activeTab === 'Reports' && (
            <ReportsView
              products={products}
              locations={locations}
              transactions={transactions}
              kpis={kpis}
            />
          )}

          {activeTab === 'Users' && (
            <UserManagementView currentRole={ROLES.SUPER_ADMIN} />
          )}

          {activeTab === 'Settings' && (
            <SettingsView
              locations={locations}
              categories={categories}
              onRefreshData={onRefreshData}
            />
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
