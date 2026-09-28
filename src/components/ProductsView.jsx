import React, { useState } from 'react';
import { SearchIcon, PlusIcon, AlertTriangleIcon } from './Icons';

export default function ProductsView({
  products,
  onOpenMovementModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || p.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">Product Catalog & Stock Depository</h2>
          <p className="view-subtitle">Manage all active product lines, SKUs, reorder thresholds, and location assignments</p>
        </div>
        <button
          type="button"
          className="btn-primary-action"
          onClick={onOpenMovementModal}
        >
          <PlusIcon size={16} />
          <span>Adjust Product Stock</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="data-toolbar">
        <div className="search-bar-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filter-chips">
          {['All', 'Apparel', 'Leather', 'Footwear', 'Jewelry'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="card data-table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Retail Price</th>
                <th>Assigned Location</th>
                <th>Supplier</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => {
                const isLow = item.stock <= item.reorderLevel;
                const isCritical = item.stock <= 10;
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="product-cell-name">{item.name}</div>
                      <span className="product-cell-sku">{item.sku}</span>
                    </td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td>
                      <span className={`stock-number-pill ${isCritical ? 'critical' : isLow ? 'warning' : 'good'}`}>
                        {item.stock} units
                      </span>
                    </td>
                    <td className="text-muted">{item.reorderLevel} units</td>
                    <td className="font-semibold">${item.unitPrice}</td>
                    <td>{item.location}</td>
                    <td className="text-muted">{item.supplier}</td>
                    <td className="text-right">
                      {isCritical ? (
                        <span className="status-pill status-critical">
                          <AlertTriangleIcon size={12} /> Critical
                        </span>
                      ) : isLow ? (
                        <span className="status-pill status-low">
                          Low Stock
                        </span>
                      ) : (
                        <span className="status-pill status-good">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
