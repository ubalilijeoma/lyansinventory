import React, { useState } from 'react';
import { PlusIcon, ArrowUpRightIcon, CheckIcon } from './Icons';

export default function PurchasesView({
  transactions,
  onOpenMovementModal
}) {
  const [activeFilter, setActiveFilter] = useState('All');

  // Filter to inflow transactions
  const inflowList = transactions.filter((t) => t.type === 'inflow');

  const filteredInflows = inflowList.filter((item) => {
    if (activeFilter === 'All') return true;
    return item.flowSubType.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const totalInflowItems = inflowList.reduce((acc, curr) => acc + (curr.itemsQty || 0), 0);
  const totalInflowValue = inflowList.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">Inflow & Purchases Monitor</h2>
          <p className="view-subtitle">
            Stock intake channels: <strong>Restocking</strong> (Supplier POs), <strong>Returning</strong> (Customer RMA), and <strong>Replacing</strong> (Vendor Exchanges)
          </p>
        </div>
        <button
          type="button"
          className="btn-primary-action"
          onClick={onOpenMovementModal}
        >
          <PlusIcon size={16} />
          <span>Record New Inflow (+Stock)</span>
        </button>
      </div>

      {/* Inflow Summary Banner */}
      <div className="inflow-metrics-banner">
        <div className="metric-box">
          <span className="metric-box-label">Inflow Channels</span>
          <span className="metric-box-val">Restock · Return · Replace</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Total Inflow Units Today</span>
          <span className="metric-box-val text-green">+{totalInflowItems} Units</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Total Value Received</span>
          <span className="metric-box-val">${totalInflowValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="category-filter-chips">
        {['All', 'Restocking', 'Returning', 'Replacing'].map((type) => (
          <button
            key={type}
            type="button"
            className={`filter-chip ${activeFilter === type ? 'active' : ''}`}
            onClick={() => setActiveFilter(type)}
          >
            {type === 'All' ? 'All Inflow Types' : type}
          </button>
        ))}
      </div>

      {/* Inflow Table */}
      <div className="card data-table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch / Ref ID</th>
                <th>Source / Partner</th>
                <th>Inflow Classification</th>
                <th>Quantity Received</th>
                <th>Invoice Amount</th>
                <th>Timestamp</th>
                <th className="text-right">Ledger Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInflows.map((item) => (
                <tr key={item.id}>
                  <td className="tx-id-cell">
                    <span className="tx-id">{item.id}</span>
                  </td>
                  <td>
                    <div className="entity-name">{item.entity}</div>
                  </td>
                  <td>
                    <span className="inflow-type-badge">
                      <ArrowUpRightIcon size={13} /> {item.flowSubType}
                    </span>
                  </td>
                  <td>
                    <span className="qty-tag inflow">+{item.itemsQty || 1} units</span>
                  </td>
                  <td className="font-semibold">${item.amount.toLocaleString()}</td>
                  <td className="text-muted">{item.timestamp}</td>
                  <td className="text-right">
                    <span
                      className="status-pill"
                      style={{ color: item.statusColor, backgroundColor: item.statusBg }}
                    >
                      <CheckIcon size={12} /> {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
