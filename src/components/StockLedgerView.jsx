import React, { useState } from 'react';
import { ArrowUpRightIcon, ArrowDownLeftIcon, CheckIcon, SearchIcon, PlusIcon } from './Icons';

export default function StockLedgerView({
  kpis = {},
  transactions = [],
  onOpenMovementModal,
  onStockMovement
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const inflowItems = transactions
    .filter((t) => t.type === 'inflow')
    .reduce((acc, c) => acc + (c.itemsQty || 0), 0);

  const outflowItems = transactions
    .filter((t) => t.type === 'outflow')
    .reduce((acc, c) => acc + (c.itemsQty || 0), 0);

  const initialStockEstimate = (kpis.totalProducts || 0) - (inflowItems - outflowItems);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = typeFilter === 'All' || tx.type === typeFilter;
    const matchesSearch =
      (tx.id && tx.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.entity && tx.entity.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.flowSubType && tx.flowSubType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">Real-Time Stock Engine: S(t)</h2>
          <p className="view-subtitle">
            Continuous inventory balance reconciliation at every timestamp <em>t</em>
          </p>
        </div>
        <button
          type="button"
          className="btn-primary-action"
          onClick={onOpenMovementModal}
        >
          <PlusIcon size={16} />
          <span>Record New Movement</span>
        </button>
      </div>

      {/* Mathematical Model Card */}
      <div className="card math-model-card">
        <div className="math-header">
          <span className="formula-tag">Continuous Inventory Equation</span>
          <div className="live-pulse-badge">
            <span className="live-indicator-dot pulse-indicator"></span>
            <span>Real-time Active Ledger</span>
          </div>
        </div>

        <div className="formula-display">
          <span className="formula-main">
            S(t) = S(t₀) + ∑ Inflow(τ) - ∑ Outflow(τ)
          </span>
        </div>

        <div className="formula-breakdown-grid">
          <div className="formula-col">
            <div className="formula-col-title text-green">
              <ArrowUpRightIcon size={16} /> Inflow Components
            </div>
            <p className="formula-sub">Inflow = R_restock + R_return + R_replace</p>
            <ul className="formula-list">
              <li><strong>Restocking:</strong> Batch shipments from suppliers</li>
              <li><strong>Returning:</strong> Restored customer returns</li>
              <li><strong>Replacing:</strong> Vendor replacement items</li>
            </ul>
          </div>

          <div className="formula-col">
            <div className="formula-col-title text-red">
              <ArrowDownLeftIcon size={16} /> Outflow Components
            </div>
            <p className="formula-sub">Outflow = S_POS + D_damage + R_supplier</p>
            <ul className="formula-list">
              <li><strong>POS Website:</strong> Online checkout deductions</li>
              <li><strong>Damaged:</strong> Physical write-offs</li>
              <li><strong>Returned to Supplier:</strong> RTV shipments</li>
            </ul>
          </div>
        </div>

        {/* Live Calculation Strip */}
        <div className="equation-strip">
          <div className="eq-element">
            <span className="eq-label">Baseline S(t₀)</span>
            <span className="eq-val">{Math.max(0, initialStockEstimate).toLocaleString()}</span>
          </div>
          <span className="eq-operator">+</span>
          <div className="eq-element">
            <span className="eq-label">Total Inflow</span>
            <span className="eq-val text-green">+{inflowItems}</span>
          </div>
          <span className="eq-operator">-</span>
          <div className="eq-element">
            <span className="eq-label">Total Outflow</span>
            <span className="eq-val text-red">-{outflowItems}</span>
          </div>
          <span className="eq-operator">=</span>
          <div className="eq-element active-total">
            <span className="eq-label">Current Stock S(t)</span>
            <span className="eq-val text-blue">{(kpis.totalProducts || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="data-toolbar">
        <div className="search-bar-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search ledger entries by ref, product, channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filter-chips">
          {['All', 'inflow', 'outflow'].map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-chip ${typeFilter === f ? 'active' : ''}`}
              onClick={() => setTypeFilter(f)}
            >
              {f === 'All' ? 'All Movements' : f === 'inflow' ? '↑ Inflows (+)' : '↓ Outflows (-)'}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Audit Trail */}
      <div className="card data-table-card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Continuous Time-Stamp Ledger (t)</h3>
            <span className="card-subtitle" style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Immutable sequence of stock state transitions
            </span>
          </div>
          <span className="card-badge-info">{filteredTransactions.length} Verified Entries</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp (t)</th>
                <th>Transaction Ref</th>
                <th>Type & Flow Source</th>
                <th>Delta Impact</th>
                <th>Balance Effect</th>
                <th>Ledger Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No ledger entries found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="text-muted font-mono">{tx.timestamp}</td>
                    <td className="font-semibold font-mono">{tx.id}</td>
                    <td>
                      <span className="channel-text">
                        {tx.entity} · <em>{tx.flowSubType}</em>
                      </span>
                    </td>
                    <td>
                      {tx.type === 'inflow' ? (
                        <span className="qty-tag inflow">
                          +{tx.itemsQty || 1} units
                        </span>
                      ) : (
                        <span className="qty-tag outflow">
                          -{tx.itemsQty || 1} units
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-muted" style={{ fontSize: '0.85rem' }}>
                      {tx.balanceBefore !== undefined && tx.balanceAfter !== undefined
                        ? `${tx.balanceBefore} ➔ ${tx.balanceAfter}`
                        : `${tx.itemsQty || 1} units`}
                    </td>
                    <td>
                      <span
                        className="status-pill"
                        style={{ color: tx.statusColor || '#10B981', backgroundColor: tx.statusBg || '#ECFDF5' }}
                      >
                        <CheckIcon size={12} /> Reconciled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
