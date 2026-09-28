import React, { useState } from 'react';
import { ArrowRightIcon } from './Icons';

export default function RecentPurchasesCard({
  transactions,
  onViewAllPurchases
}) {
  const [filter, setFilter] = useState('all');

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'inflow') return tx.type === 'inflow';
    if (filter === 'outflow') return tx.type === 'outflow';
    return true;
  }).slice(0, 5); // display top 5 for sleek height

  return (
    <div className="card recent-purchases-card">
      <div className="card-header">
        <h3 className="card-title">Recent Purchases</h3>
        <div className="filter-pill-group">
          <button
            type="button"
            className={`pill-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'inflow' ? 'active' : ''}`}
            onClick={() => setFilter('inflow')}
          >
            Inflow
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'outflow' ? 'active' : ''}`}
            onClick={() => setFilter('outflow')}
          >
            Outflow
          </button>
        </div>
      </div>

      <div className="purchases-table-wrapper">
        <table className="purchases-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier / Source</th>
              <th>Amount</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="purchase-row">
                <td className="tx-id-cell">
                  <span className="tx-id">{tx.id}</span>
                </td>
                <td className="tx-entity-cell">
                  <div className="entity-name">{tx.entity}</div>
                  <span className="entity-flow-sub">{tx.flowSubType}</span>
                </td>
                <td className="tx-amount-cell">
                  ${tx.amount.toLocaleString()}
                </td>
                <td className="tx-status-cell text-right">
                  <span
                    className="status-pill"
                    style={{
                      color: tx.statusColor,
                      backgroundColor: tx.statusBg
                    }}
                  >
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-footer">
        <button
          type="button"
          className="link-view-all"
          onClick={onViewAllPurchases}
        >
          <span>View all purchases</span>
          <ArrowRightIcon size={14} />
        </button>
      </div>
    </div>
  );
}
