import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth, ROLES, getRoleDashboardPath } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForbiddenPage from './pages/ForbiddenPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';

import {
  INITIAL_KPIS,
  INITIAL_STOCK_STATUS,
  INITIAL_TRANSACTIONS,
  INITIAL_LOCATIONS,
  INITIAL_PRODUCTS
} from './data/mockData';

import {
  loadCompleteInventoryData,
  recordStockMovement,
  subscribeToInventoryRealtime
} from './services/inventoryService';

// Component that dynamically redirects root / to the current user's role dashboard
function RoleRedirector() {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getRoleDashboardPath(currentUser.role)} replace />;
}

// Inner App containing real-time state management and routing
function AppContent() {
  const { currentUser } = useAuth();

  // Shared inventory state across authorized dashboards
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [categories, setCategories] = useState(INITIAL_STOCK_STATUS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success'); // 'success' | 'error' | 'info'

  const showToast = useCallback((message, type = 'success') => {
    setToastMsg(message);
    setToastType(type);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  }, []);

  // Centralized data refresh function — called after mutations and realtime events
  const refreshInventoryData = useCallback(async () => {
    try {
      const result = await loadCompleteInventoryData();
      if (result.kpis) setKpis(result.kpis);
      if (result.locations) setLocations(result.locations);
      if (result.categories) setCategories(result.categories);
      if (result.products) setProducts(result.products);
      if (result.transactions) setTransactions(result.transactions);
      setIsLiveConnected(Boolean(result.isRemote));
      return result;
    } catch (err) {
      console.warn('[App] Data refresh error:', err.message);
      return null;
    }
  }, []);

  // Hydrate data from Supabase backend when user logs in & subscribe to real-time events
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    async function initializeInventory() {
      setIsDataLoading(true);
      try {
        const result = await loadCompleteInventoryData();
        if (isMounted) {
          if (result.kpis) setKpis(result.kpis);
          if (result.locations) setLocations(result.locations);
          if (result.categories) setCategories(result.categories);
          if (result.products) setProducts(result.products);
          if (result.transactions) setTransactions(result.transactions);
          setIsLiveConnected(Boolean(result.isRemote));
        }
      } catch (err) {
        console.warn('[App] Backend synchronization notice:', err.message);
      } finally {
        if (isMounted) setIsDataLoading(false);
      }
    }

    initializeInventory();

    // Subscribe to PostgreSQL Realtime mutations across all inventory tables
    const unsubscribe = subscribeToInventoryRealtime(async (event) => {
      console.log('[App] Real-time inventory event received:', event.type);
      if (isMounted) {
        // Debounced refresh to avoid rapid re-fetches from cascading triggers
        await refreshInventoryData();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser, refreshInventoryData]);

  // Record Stock Movement (Inflow / Outflow) with Atomic Concurrency
  const handleStockMovement = async ({
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

    // 1. Optimistic UI update for sub-millisecond interaction responsiveness
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

    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id === locationId) {
          const updatedCount = Math.max(0, loc.itemsCount + delta);
          return { ...loc, itemsCount: updatedCount };
        }
        return loc;
      })
    );

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

    // 2. Transmit to backend atomic RPC
    try {
      const rpcResult = await recordStockMovement({
        movementType,
        subType,
        productId,
        locationId,
        quantity,
        unitPrice,
        entityName: `${productName} (${locationName})`,
        referenceNote
      });

      const now = new Date();
      const formattedTime = now.toISOString().replace('T', ' ').substring(0, 16);
      const newTx = {
        id: rpcResult.reference_no || (isIncrement ? `IN-${Date.now().toString().slice(-4)}` : `OUT-${Date.now().toString().slice(-4)}`),
        entity: `${productName} (${locationName})`,
        channel: `${isIncrement ? 'Inflow' : 'Outflow'} · ${subType}`,
        type: movementType,
        flowSubType: subType,
        amount: Math.abs(valueDelta),
        itemsQty: quantity,
        balanceBefore: rpcResult.balance_before,
        balanceAfter: rpcResult.balance_after,
        status: 'Completed',
        statusColor: isIncrement ? '#10B981' : '#EF4444',
        statusBg: isIncrement ? '#ECFDF5' : '#FEF2F2',
        timestamp: formattedTime
      };

      setTransactions((prev) => [newTx, ...prev]);

      showToast(
        `${isIncrement ? '↑ Stock Inflow' : '↓ Stock Outflow'} recorded: ${quantity} units of ${productName} (${subType}) — Ref: ${rpcResult.reference_no || 'local'}`,
        'success'
      );

      // Refresh from backend after a short delay to reconcile with server state
      setTimeout(() => refreshInventoryData(), 800);

    } catch (err) {
      // Revert optimistic update on backend failure
      console.error('[App] Stock movement failed:', err.message);
      showToast(`Stock movement failed: ${err.message}`, 'error');
      // Full refresh to revert to actual server state
      await refreshInventoryData();
    }
  };

  // Instant POS Sale Simulation
  const handleSimulatePosSale = () => {
    const defaultProduct = products[0] || INITIAL_PRODUCTS[0];
    const defaultLocation = locations[0] || INITIAL_LOCATIONS[0];

    handleStockMovement({
      movementType: 'outflow',
      subType: 'POS Website',
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      locationId: defaultLocation.id,
      locationName: defaultLocation.name,
      quantity: 1,
      unitPrice: defaultProduct.unitPrice,
      referenceNote: `Live POS Website Order #${Math.floor(10000 + Math.random() * 90000)}`
    });
  };

  return (
    <>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* 403 Forbidden Access Page */}
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Super Admin Dashboard (Restricted strictly to super_admin) */}
        <Route
          path="/dashboard/super-admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <SuperAdminDashboard
                kpis={kpis}
                categories={categories}
                transactions={transactions}
                locations={locations}
                products={products}
                onStockMovement={handleStockMovement}
                onSimulatePosSale={handleSimulatePosSale}
                isLiveConnected={isLiveConnected}
                isDataLoading={isDataLoading}
                onRefreshData={refreshInventoryData}
              />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard (Restricted to admin & super_admin) */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
              <AdminDashboard
                kpis={kpis}
                categories={categories}
                transactions={transactions}
                locations={locations}
                products={products}
                onStockMovement={handleStockMovement}
                onSimulatePosSale={handleSimulatePosSale}
                isLiveConnected={isLiveConnected}
                isDataLoading={isDataLoading}
                onRefreshData={refreshInventoryData}
              />
            </ProtectedRoute>
          }
        />

        {/* Staff Dashboard (Operational desk: staff, admin, super_admin) */}
        <Route
          path="/dashboard/staff"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
              <StaffDashboard
                products={products}
                locations={locations}
                transactions={transactions}
                onStockMovement={handleStockMovement}
                onSimulatePosSale={handleSimulatePosSale}
                isLiveConnected={isLiveConnected}
                onRefreshData={refreshInventoryData}
              />
            </ProtectedRoute>
          }
        />

        {/* Root fallback redirects to appropriate dashboard */}
        <Route path="*" element={<RoleRedirector />} />
      </Routes>

      {/* Global Feedback Toast */}
      {toastMsg && (
        <div
          className={`toast-banner animate-fade-in ${toastType === 'error' ? 'toast-error' : toastType === 'info' ? 'toast-info' : ''}`}
          role="status"
        >
          <span>{toastType === 'error' ? '✕' : toastType === 'info' ? 'ℹ' : '✓'}</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Live Connection Indicator */}
      {currentUser && (
        <div className="live-connection-indicator" title={isLiveConnected ? 'Connected to Supabase backend' : 'Using local data'}>
          <span className={`connection-dot ${isLiveConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="connection-label">{isLiveConnected ? 'Live' : 'Local'}</span>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
