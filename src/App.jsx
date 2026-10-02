import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate
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

// Component that dynamically redirects root / to the current user's role dashboard
function RoleRedirector() {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getRoleDashboardPath(currentUser.role)} replace />;
}

// Inner App containing state management and routing
function AppContent() {
  // Shared inventory state across authorized dashboards
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [categories, setCategories] = useState(INITIAL_STOCK_STATUS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // Record Stock Movement (Inflow / Outflow)
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

    // Update category meter
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
    const newTxId = isIncrement
      ? `IN-${Math.floor(1000 + Math.random() * 9000)}`
      : `OUT-${Math.floor(1000 + Math.random() * 9000)}`;

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
      `${isIncrement ? 'Inflow' : 'Outflow'} logged: ${quantity} units (${subType}) recorded at time t.`
    );
  };

  // Instant POS Sale Simulation
  const handleSimulatePosSale = () => {
    const defaultProduct = products[0];
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
              />
            </ProtectedRoute>
          }
        />

        {/* Root fallback redirects to appropriate dashboard */}
        <Route path="*" element={<RoleRedirector />} />
      </Routes>

      {/* Global Feedback Toast */}
      {toastMsg && (
        <div className="toast-banner animate-fade-in" role="status">
          <span>✓</span>
          <span>{toastMsg}</span>
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
