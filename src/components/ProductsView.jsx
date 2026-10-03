import React, { useState, useEffect } from 'react';
import { SearchIcon, PlusIcon, AlertTriangleIcon, CloseIcon } from './Icons';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategoryOptions,
  fetchLocationOptions,
} from '../services/inventoryService';

import ConfirmModal from './ConfirmModal';

export default function ProductsView({
  products,
  onOpenMovementModal,
  onProductChanged,
  canDeleteProducts = true,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dropdown options from Supabase
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUnitPrice, setFormUnitPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formReorderLevel, setFormReorderLevel] = useState('15');
  const [formSupplier, setFormSupplier] = useState('');
  const [formLocationId, setFormLocationId] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Load dropdown options on mount
  useEffect(() => {
    async function loadOptions() {
      const [cats, locs] = await Promise.all([fetchCategoryOptions(), fetchLocationOptions()]);
      setCategoryOptions(cats);
      setLocationOptions(locs);
    }
    loadOptions();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || p.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setFeedbackMsg(msg);
      setTimeout(() => setFeedbackMsg(''), 3500);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('LYAN-');
    setFormCategoryId(categoryOptions[0]?.id || '');
    setFormUnitPrice('');
    setFormCostPrice('');
    setFormReorderLevel('15');
    setFormSupplier('');
    setFormLocationId(locationOptions[0]?.id || '');
    setFormDescription('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    // Find category/location IDs from names
    const catMatch = categoryOptions.find(c => product.category?.includes(c.name.split('/')[0].trim()) || c.name === product.category);
    const locMatch = locationOptions.find(l => l.name === product.location);
    setFormCategoryId(catMatch?.id || '');
    setFormUnitPrice(String(product.unitPrice || ''));
    setFormCostPrice(String(product.costPrice || ''));
    setFormReorderLevel(String(product.reorderLevel || '15'));
    setFormSupplier(product.supplier || '');
    setFormLocationId(locMatch?.id || '');
    setFormDescription('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formName,
        sku: formSku,
        categoryId: formCategoryId || null,
        unitPrice: parseFloat(formUnitPrice) || 0,
        costPrice: parseFloat(formCostPrice) || 0,
        reorderLevel: parseInt(formReorderLevel, 10) || 15,
        supplier: formSupplier,
        locationId: formLocationId || null,
        description: formDescription,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        showNotification(`Product "${formName}" updated successfully.`);
      } else {
        await createProduct(payload);
        showNotification(`Product "${formName}" created successfully.`);
      }

      setModalOpen(false);
      if (onProductChanged) onProductChanged();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsSubmitting(true);

    try {
      await deleteProduct(deletingProduct.id);
      showNotification(`Product "${deletingProduct.name}" removed from catalog.`);
      setDeletingProduct(null);
      if (onProductChanged) onProductChanged();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">Product Catalog & Stock Depository</h2>
          <p className="view-subtitle">Manage all active product lines, SKUs, reorder thresholds, and location assignments</p>
        </div>
        <div className="header-action-group">
          <button type="button" className="btn-secondary-action" onClick={onOpenMovementModal}>
            <PlusIcon size={16} />
            <span>Adjust Stock</span>
          </button>
          <button type="button" className="btn-primary-action" onClick={handleOpenCreateModal}>
            <PlusIcon size={16} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedbackMsg && (
        <div className="toast-banner animate-fade-in" role="status">
          <span>✓</span><span>{feedbackMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="form-error-banner" role="alert">{errorMsg}</div>
      )}

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
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
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
                      <td>
                        {isCritical ? (
                          <span className="status-pill status-critical">
                            <AlertTriangleIcon size={12} /> Critical
                          </span>
                        ) : isLow ? (
                          <span className="status-pill status-low">Low Stock</span>
                        ) : (
                          <span className="status-pill status-good">In Stock</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="table-actions-group">
                          <button
                            type="button"
                            className="btn-table-action edit"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit product"
                          >
                            Edit
                          </button>
                          {canDeleteProducts && (
                            <button
                              type="button"
                              className="btn-table-action delete"
                              onClick={() => setDeletingProduct(item)}
                              title="Remove product"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Product Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product to Catalog'}
                </h3>
                <p className="modal-subtitle">
                  {editingProduct ? 'Update product details, pricing, and location' : 'Enter product information and assign to a location'}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setModalOpen(false)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="prodName">Product Name</label>
                  <input id="prodName" type="text" className="form-input" placeholder="e.g. Silk Evening Gown"
                    value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="prodSku">SKU Code</label>
                  <input id="prodSku" type="text" className="form-input" placeholder="e.g. LYAN-DR-901"
                    value={formSku} onChange={(e) => setFormSku(e.target.value)} required
                    disabled={!!editingProduct} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="prodCategory">Category</label>
                  <select id="prodCategory" className="form-select" value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}>
                    <option value="">— Select Category —</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="prodLocation">Primary Location</label>
                  <select id="prodLocation" className="form-select" value={formLocationId}
                    onChange={(e) => setFormLocationId(e.target.value)}>
                    <option value="">— Select Location —</option>
                    {locationOptions.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="prodPrice">Retail Price ($)</label>
                  <input id="prodPrice" type="number" step="0.01" min="0" className="form-input"
                    placeholder="280.00" value={formUnitPrice} onChange={(e) => setFormUnitPrice(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="prodCost">Cost Price ($)</label>
                  <input id="prodCost" type="number" step="0.01" min="0" className="form-input"
                    placeholder="140.00" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="prodReorder">Reorder Level</label>
                  <input id="prodReorder" type="number" min="0" className="form-input"
                    value={formReorderLevel} onChange={(e) => setFormReorderLevel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="prodSupplier">Primary Supplier</label>
                  <input id="prodSupplier" type="text" className="form-input" placeholder="e.g. Metro Supplies"
                    value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="prodDesc">Description (Optional)</label>
                <input id="prodDesc" type="text" className="form-input" placeholder="Brief product description"
                  value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn-confirm confirm-inflow" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Product from Catalog"
        message="Are you sure you want to deactivate and remove this product from the active catalog? This product will no longer appear on floor shelves or POS checkout."
        itemDetails={deletingProduct ? `${deletingProduct.name} (${deletingProduct.sku})` : null}
        confirmText="Remove Product"
        cancelText="Keep Product"
        isLoading={isSubmitting}
      />
    </div>
  );
}
