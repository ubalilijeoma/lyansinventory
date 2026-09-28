import React from 'react';

export default function StockStatusCard({ categories }) {
  return (
    <div className="card stock-status-card">
      <div className="card-header">
        <h3 className="card-title">Stock Status</h3>
        <span className="card-badge-info">Category Health</span>
      </div>

      <div className="stock-status-list">
        {categories.map((cat) => (
          <div key={cat.id} className="stock-status-row">
            <div className="category-meta">
              <span className="category-name">{cat.name}</span>
              <span className="category-items">{cat.itemsCount} items</span>
            </div>

            <div className="progress-group">
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={cat.capacityPercentage}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`${cat.name} stock level`}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${cat.capacityPercentage}%`,
                    backgroundColor: cat.color
                  }}
                />
              </div>
              <span className="progress-percentage">{cat.capacityPercentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
