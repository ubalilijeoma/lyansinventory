import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import OverviewView from './components/OverviewView';
import ProductsView from './components/ProductsView';
import PurchasesView from './components/PurchasesView';
import SalesView from './components/SalesView';
import StockLedgerView from './components/StockLedgerView';
import StockFlowModal from './components/StockFlowModal';

import {
  INITIAL_KPIS,
  INITIAL_STOCK_STATUS,
  INITIAL_TRANSACTIONS,
  INITIAL_LOCATIONS,
  INITIAL_PRODUCTS
} from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Core state for real-time inventory tracking
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [categories, setCategories] = useState(INITIAL_STOCK_STATUS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);

  // Modal and feedback toast
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // Record Stock Movement (Inflow: Restock, Return, Replace | Outflow: POS, Damaged, Return to Supplier)
  const handleStockMovement = ({
    movementType,
    subType,
    productId,
    productName,
    locationId,
    locationName,
    quantity,
    unitPrice,
    referenceNote
  }) => {
    const isIncrement = movementType === 'inflow';
    const delta = isIncrement ? quantity : -quantity;
    const valueDelta = delta * unitPrice;

    // 1. Update KPI totals
    setKpis((prev) => {
      const newTotal = Math.max(0, prev.totalProducts + delta);
      const newValue = Math.max(0, prev.stockValue + valueDelta);
      const newInflow = isIncrement ? prev.inflowToday + quantity : prev.inflowToday;
      const newOutflow = !isIncrement ? prev.outflowToday + quantity : prev.outflowToday;

      return {
        ...prev,
        totalProducts: newTotal,
        stockValue: newValue,
        inflowToday: newInflow,
        outflowToday: newOutflow
      };
    });

    // 2. Update Location breakdown
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id === locationId) {
          const updatedCount = Math.max(0, loc.itemsCount + delta);
          return { ...loc, itemsCount: updatedCount };
        }
        return loc;
      })
    );

    // 3. Update Product stock & category status
    let targetCategory = '';
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id === productId) {
          targetCategory = prod.category;
          const updatedStock = Math.max(0, prod.stock + delta);
          return { ...prod, stock: updatedStock };
        }
        return prod;
      })
    );

    // Update category meter if matched
    if (targetCategory) {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.name === targetCategory || targetCategory.includes(cat.name.split('/')[0].trim())) {
            const newCount = Math.max(0, cat.itemsCount + delta);
            const newCap = Math.min(100, Math.max(5, Math.round((newCount / 400) * 100)));
            return {
              ...cat,
              itemsCount: newCount,
              capacityPercentage: newCap
            };
          }
          return cat;
        })
      );
    }

    // 4. Create new transaction log
    const now = new Date();
    const formattedTime = now.toISOString().replace('T', ' ').substring(0, 16);
    const newTxId = isIncrement ? `IN-${Math.floor(1000 + Math.random() * 9000)}` : `OUT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTx = {
      id: newTxId,
      entity: `${productName} (${locationName})`,
      channel: `${isIncrement ? 'Inflow' : 'Outflow'} · ${subType}`,
      type: movementType,
      flowSubType: subType,
      amount: Math.abs(valueDelta),
      itemsQty: quantity,
      status: 'Completed',
      statusColor: isIncrement ? '#10B981' : '#EF4444',
      statusBg: isIncrement ? '#ECFDF5' : '#FEF2F2',
      timestamp: formattedTime
    };

    setTransactions((prev) => [newTx, ...prev]);

    showToast(
      `${isIncrement ? 'Inflow' : 'Outflow'} logged: ${quantity} units (${subType}) successfully recorded at time t.`
    );
  };

  // Instant POS Sale Simulation
  const handleSimulatePosSale = () => {
    const defaultProduct = products[0]; // Silk Evening Gown
    handleStockMovement({
      movementType: 'outflow',
      subType: 'POS Website',
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      locationId: 'loc-1',
      locationName: 'Main Store',
      quantity: 1,
      unitPrice: defaultProduct.unitPrice,
      referenceNote: `POS E-Commerce Webhook #${Math.floor(10000 + Math.random() * 90000)}`
    });
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar
          activeTab={activeTab}
          onOpenMovementModal={() => setIsModalOpen(true)}
          onSimulatePosSale={handleSimulatePosSale}
          setMobileOpen={setMobileOpen}
          lowStockCount={kpis.lowStockItems}
        />

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
              onSimulatePosSale={handleSimulatePosSale}
            />
          )}

          {activeTab === 'Stock' && (
            <StockLedgerView
              kpis={kpis}
              transactions={transactions}
              onOpenMovementModal={() => setIsModalOpen(true)}
            />
          )}

          {/* Fallback for other sidebar items */}
          {['Suppliers', 'Transfers', 'Reports', 'Settings'].includes(activeTab) && (
            <div className="view-page-container animate-fade-in">
              <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                  {activeTab} Module
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px' }}>
                  Dedicated {activeTab.toLowerCase()} administration console for Lyans Woman. Full telemetry connected to POS & warehouse network.
                </p>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => setActiveTab('Overview')}
                  style={{ display: 'inline-flex', margin: '0 auto' }}
                >
                  Return to Overview Hub
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Movement Modal */}
      <StockFlowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        locations={locations}
        onSubmitMovement={handleStockMovement}
      />

      {/* Real-time Feedback Toast */}
      {toastMsg && (
        <div className="toast-banner animate-fade-in" role="status">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
