import React from 'react';
import StatCards from './StatCards';
import StockStatusCard from './StockStatusCard';
import RecentPurchasesCard from './RecentPurchasesCard';
import StockByLocationCard from './StockByLocationCard';

export default function OverviewView({
  kpis,
  categories,
  transactions,
  locations,
  onViewAllPurchases
}) {
  return (
    <div className="overview-view-container animate-fade-in">
      {/* 4 Top KPI Cards */}
      <StatCards kpis={kpis} />

      {/* Middle Row: Stock Status (Categories) & Recent Purchases */}
      <section className="middle-grid" aria-label="Inventory Analytics & Recent Purchases">
        <StockStatusCard categories={categories} />
        <RecentPurchasesCard
          transactions={transactions}
          onViewAllPurchases={onViewAllPurchases}
        />
      </section>

      {/* Bottom Section: Stock by Location & Interactive Donut Chart */}
      <section className="bottom-grid" aria-label="Stock Distribution by Location">
        <StockByLocationCard
          locations={locations}
          totalStock={kpis.totalProducts}
        />
      </section>
    </div>
  );
}
