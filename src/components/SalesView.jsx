import React, { useState } from 'react';
import { ArrowDownLeftIcon, PlusIcon } from './Icons';

export default function SalesView({
  transactions,
  onOpenMovementModal,
  onSimulatePosSale
}) {
  const [activeFilter, setActiveFilter] = useState('All');

  // Filter to outflow transactions
  const outflowList = transactions.filter((t) => t.type === 'outflow');

  const filteredOutflows = outflowList.filter((item) => {
    if (activeFilter === 'All') return true;
    return item.flowSubType.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const totalOutflowItems = outflowList.reduce((acc, curr) => acc + (curr.itemsQty || 0), 0);
  const totalOutflowValue = outflowList.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">Outflow & Sales Depletion Monitor</h2>
          <p className="view-subtitle">
            Stock outflow channels: <strong>POS Website</strong> Orders, <strong>Damaged</strong> / Write-Offs, and <strong>Returned to Supplier</strong> (RTV)
          </p>
        </div>
        <div className="header-action-group">
          <button
            type="button"
            className="btn-secondary-action"
            onClick={onSimulatePosSale}
          >
            <ArrowDownLeftIcon size={15} />
            <span>Simulate POS Web Order</span>
          </button>
          <button
            type="button"
            className="btn-primary-action"
            onClick={onOpenMovementModal}
          >
            <PlusIcon size={16} />
            <span>Record Outflow</span>
          </button>
        </div>
      </div>

      {/* Outflow Metrics Banner */}
      <div className="outflow-metrics-banner">
        <div className="metric-box">
          <span className="metric-box-label">Outflow Channels</span>
          <span className="metric-box-val">POS Web · Damaged · RTV</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Total Outflow Units Today</span>
          <span className="metric-box-val text-red">-{totalOutflowItems} Units</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Outflow Value Realized/Written-off</span>
          <span className="metric-box-val">${totalOutflowValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="category-filter-chips">
        {['All', 'POS Website', 'Damaged', 'Returned to Supplier'].map((type) => (
          <button
            key={type}
            type="button"
            className={`filter-chip ${activeFilter === type ? 'active' : ''}`}
            onClick={() => setActiveFilter(type)}
          >
            {type === 'All' ? 'All Outflow Types' : type}
          </button>
        ))}
      </div>

      {/* Outflow Table */}
      <div className="card data-table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order / Event Ref</th>
                <th>Destination / Entity</th>
                <th>Outflow Type</th>
                <th>Quantity Deducted</th>
                <th>Value</th>
                <th>Timestamp</th>
                <th className="text-right">Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutflows.map((item) => (
                <tr key={item.id}>
                  <td className="tx-id-cell">
                    <span className="tx-id">{item.id}</span>
                  </td>
                  <td>
                    <div className="entity-name">{item.entity}</div>
                  </td>
                  <td>
                    <span className="outflow-type-badge">
                      <ArrowDownLeftIcon size={13} /> {item.flowSubType}
                    </span>
                  </td>
                  <td>
                    <span className="qty-tag outflow">-{item.itemsQty || 1} units</span>
                  </td>
                  <td className="font-semibold">${item.amount.toLocaleString()}</td>
                  <td className="text-muted">{item.timestamp}</td>
                  <td className="text-right">
                    <span
                      className="status-pill"
                      style={{ color: item.statusColor, backgroundColor: item.statusBg }}
                    >
                      {item.status}
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
