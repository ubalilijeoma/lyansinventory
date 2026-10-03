import React, { useState } from 'react';
import {
  SettingsIcon,
  PlusIcon,
  CloseIcon,
  CheckIcon,
  AlertTriangleIcon,
  SearchIcon
} from './Icons';
import {
  createLocation,
  updateLocation,
  deleteLocation,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/inventoryService';
import ConfirmModal from './ConfirmModal';

export default function SettingsView({
  locations = [],
  categories = [],
  onRefreshData
}) {
  const [activeTab, setActiveTab] = useState('locations'); // 'locations' | 'categories' | 'preferences'
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingLoc, setDeletingLoc] = useState(null);
  const [deletingCat, setDeletingCat] = useState(null);

  // Location Modal State
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState('boutique');
  const [locAddress, setLocAddress] = useState('');
  const [locCapacity, setLocCapacity] = useState(1000);
  const [locColor, setLocColor] = useState('#10B981');

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [catSubtitle, setCatSubtitle] = useState('');
  const [catCapacity, setCatCapacity] = useState(500);
  const [catColor, setCatColor] = useState('#10B981');

  // Preferences State
  const [storeName, setStoreName] = useState('Lyans Woman Luxury Inventory Hub');
  const [currency, setCurrency] = useState('USD ($)');
  const [defaultThreshold, setDefaultThreshold] = useState(15);
  const [autoSyncInterval, setAutoSyncInterval] = useState('Real-Time (PostgreSQL CDC)');

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setFeedbackMsg(msg);
      setTimeout(() => setFeedbackMsg(''), 3500);
    }
  };

  // Location Handlers
  const handleOpenCreateLoc = () => {
    setEditingLoc(null);
    setLocName('');
    setLocCode(`LOC-${Math.floor(100 + Math.random() * 900)}`);
    setLocType('boutique');
    setLocAddress('');
    setLocCapacity(1000);
    setLocColor('#10B981');
    setLocModalOpen(true);
  };

  const handleOpenEditLoc = (loc) => {
    setEditingLoc(loc);
    setLocName(loc.name);
    setLocCode(loc.code || `LOC-${loc.id.slice(0, 4)}`);
    setLocType(loc.type || 'boutique');
    setLocAddress(loc.address || '');
    setLocCapacity(loc.capacityLimit || loc.capacity_limit || 1000);
    setLocColor(loc.colorHex || loc.color_hex || '#10B981');
    setLocModalOpen(true);
  };

  const handleSaveLoc = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingLoc) {
        await updateLocation(editingLoc.id, {
          name: locName,
          code: locCode,
          type: locType,
          address: locAddress,
          capacityLimit: locCapacity,
          colorHex: locColor,
        });
        showNotification(`Location "${locName}" updated successfully.`);
      } else {
        await createLocation({
          name: locName,
          code: locCode,
          type: locType,
          address: locAddress,
          capacityLimit: locCapacity,
          colorHex: locColor,
        });
        showNotification(`Location "${locName}" created successfully.`);
      }
      setLocModalOpen(false);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to save location: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteLoc = async () => {
    if (!deletingLoc) return;
    setIsSubmitting(true);
    try {
      await deleteLocation(deletingLoc.id);
      showNotification(`Location "${deletingLoc.name}" deactivated.`);
      setDeletingLoc(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to remove location: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category Handlers
  const handleOpenCreateCat = () => {
    setEditingCat(null);
    setCatName('');
    setCatSubtitle('');
    setCatCapacity(500);
    setCatColor('#10B981');
    setCatModalOpen(true);
  };

  const handleOpenEditCat = (cat) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatSubtitle(cat.subtitle || '');
    setCatCapacity(cat.capacityTarget || cat.capacity_target || 500);
    setCatColor(cat.color || '#10B981');
    setCatModalOpen(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, {
          name: catName,
          subtitle: catSubtitle,
          capacityTarget: catCapacity,
          color: catColor,
        });
        showNotification(`Category "${catName}" updated successfully.`);
      } else {
        await createCategory({
          name: catName,
          subtitle: catSubtitle,
          capacityTarget: catCapacity,
          color: catColor,
        });
        showNotification(`Category "${catName}" created successfully.`);
      }
      setCatModalOpen(false);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to save category: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteCat = async () => {
    if (!deletingCat) return;
    setIsSubmitting(true);
    try {
      await deleteCategory(deletingCat.id);
      showNotification(`Category "${deletingCat.name}" deleted.`);
      setDeletingCat(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to delete category: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    showNotification('System preferences and operational thresholds updated successfully.');
  };

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">System Settings & Governance Master</h2>
          <p className="view-subtitle">
            Configure enterprise physical locations, taxonomy categories, thresholds, and operational sync policies
          </p>
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

      {/* Settings Navigation Tabs */}
      <div className="category-filter-chips" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          📍 Store & Warehouse Locations ({locations.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          🏷 Product Taxonomies ({categories.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          ⚙️ Operational Parameters
        </button>
      </div>

      {/* TAB 1: LOCATIONS MANAGEMENT */}
      {activeTab === 'locations' && (
        <div className="card data-table-card animate-fade-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">Physical Multi-Location Directory</h3>
              <p className="card-subtitle" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Storage nodes, retail boutiques, and distribution hubs
              </p>
            </div>
            <button
              type="button"
              className="btn-primary-action"
              onClick={handleOpenCreateLoc}
            >
              <PlusIcon size={16} />
              <span>Add Location</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Location Name & Code</th>
                  <th>Facility Type</th>
                  <th>Capacity Limit</th>
                  <th>Current Stock</th>
                  <th>Address / Geo</th>
                  <th>Color Indicator</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>
                      <div className="font-semibold">{loc.name}</div>
                      <span className="text-muted font-mono" style={{ fontSize: '0.78rem' }}>
                        {loc.code || loc.id.slice(0, 8)}
                      </span>
                    </td>
                    <td>
                      <span className="category-pill" style={{ textTransform: 'capitalize' }}>
                        {loc.type || 'Boutique'}
                      </span>
                    </td>
                    <td>{(loc.capacityLimit || loc.capacity_limit || 1000).toLocaleString()} units</td>
                    <td>
                      <span className="stock-number-pill good">
                        {loc.itemsCount || 0} units
                      </span>
                    </td>
                    <td className="text-muted">{loc.address || 'Central Headquarters'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: loc.colorHex || loc.color_hex || '#10B981',
                            display: 'inline-block'
                          }}
                        />
                        <span className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>
                          {loc.colorHex || loc.color_hex || '#10B981'}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-table-action edit"
                          onClick={() => handleOpenEditLoc(loc)}
                          title="Edit location"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-table-action delete"
                          onClick={() => setDeletingLoc(loc)}
                          title="Deactivate location"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="card data-table-card animate-fade-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">Product Category Taxonomies</h3>
              <p className="card-subtitle" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Inventory classification lines and department storage limits
              </p>
            </div>
            <button
              type="button"
              className="btn-primary-action"
              onClick={handleOpenCreateCat}
            >
              <PlusIcon size={16} />
              <span>Add Category</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Collection Subtitle</th>
                  <th>Capacity Target</th>
                  <th>Stock Depository</th>
                  <th>Visual Badge</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="font-semibold">{cat.name}</td>
                    <td className="text-muted">{cat.subtitle || 'Active Line'}</td>
                    <td>{(cat.capacityTarget || cat.capacity_target || 500).toLocaleString()} units</td>
                    <td>
                      <span className="stock-number-pill good">
                        {cat.itemsCount || 0} units
                      </span>
                    </td>
                    <td>
                      <span
                        className="category-pill"
                        style={{
                          color: cat.color || '#10B981',
                          backgroundColor: cat.badgeColor || '#ECFDF5'
                        }}
                      >
                        {cat.name}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-table-action edit"
                          onClick={() => handleOpenEditCat(cat)}
                          title="Edit category"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-table-action delete"
                          onClick={() => setDeletingCat(cat)}
                          title="Delete category"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATIONAL PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="card animate-fade-in" style={{ padding: '28px', maxWidth: '720px' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Enterprise Operating Parameters</h3>
          <form onSubmit={handleSavePreferences} className="modal-form">
            <div className="form-group">
              <label className="form-label" htmlFor="prefStoreName">Store Name</label>
              <input
                id="prefStoreName"
                type="text"
                className="form-input"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="prefCurrency">Base Currency</label>
                <select
                  id="prefCurrency"
                  className="form-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD ($)">USD ($)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="GBP (£)">GBP (£)</option>
                  <option value="NGN (₦)">NGN (₦)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="prefThreshold">Global Low Stock Threshold</label>
                <input
                  id="prefThreshold"
                  type="number"
                  min="1"
                  className="form-input"
                  value={defaultThreshold}
                  onChange={(e) => setDefaultThreshold(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prefSync">Database Synchronization Mode</label>
              <input
                id="prefSync"
                type="text"
                className="form-input"
                value={autoSyncInterval}
                disabled
              />
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                Real-time Change Data Capture (CDC) via PostgreSQL Replication Slots & Supabase Realtime Channels
              </span>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button type="submit" className="btn-primary-action">
                <span>Save Operational Preferences</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Location Modal */}
      {locModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingLoc ? `Edit Location: ${editingLoc.name}` : 'Add New Physical Location'}
                </h3>
                <p className="modal-subtitle">Configure warehouse node or retail point attributes</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setLocModalOpen(false)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLoc} className="modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="locNameInput">Location Name</label>
                  <input
                    id="locNameInput"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Boutique Central"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="locCodeInput">Location Code</label>
                  <input
                    id="locCodeInput"
                    type="text"
                    className="form-input"
                    placeholder="e.g. LOC-001"
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="locTypeInput">Facility Type</label>
                  <select
                    id="locTypeInput"
                    className="form-select"
                    value={locType}
                    onChange={(e) => setLocType(e.target.value)}
                  >
                    <option value="boutique">Retail Boutique</option>
                    <option value="warehouse">Main Warehouse / Hub</option>
                    <option value="outlet">Pop-up Outlet</option>
                    <option value="mall">Mall Storefront</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="locCapInput">Max Capacity (Units)</label>
                  <input
                    id="locCapInput"
                    type="number"
                    min="10"
                    className="form-input"
                    value={locCapacity}
                    onChange={(e) => setLocCapacity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="locAddressInput">Physical Address</label>
                  <input
                    id="locAddressInput"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 45 Victoria Island Blvd"
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="locColorInput">Theme Color</label>
                  <input
                    id="locColorInput"
                    type="color"
                    className="form-input"
                    style={{ height: '42px', padding: '2px 6px' }}
                    value={locColor}
                    onChange={(e) => setLocColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setLocModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm confirm-inflow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingLoc ? 'Save Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingCat ? `Edit Category: ${editingCat.name}` : 'Add New Category Taxonomy'}
                </h3>
                <p className="modal-subtitle">Define catalog classification and target capacity</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setCatModalOpen(false)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCat} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="catNameInput">Category Name</label>
                <input
                  id="catNameInput"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Footwear & Shoes"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="catSubInput">Collection Subtitle</label>
                <input
                  id="catSubInput"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Luxury Italian Leather Stilettos & Flats"
                  value={catSubtitle}
                  onChange={(e) => setCatSubtitle(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="catCapInput">Target Capacity (Units)</label>
                  <input
                    id="catCapInput"
                    type="number"
                    min="10"
                    className="form-input"
                    value={catCapacity}
                    onChange={(e) => setCatCapacity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="catColorInput">Color Hex</label>
                  <input
                    id="catColorInput"
                    type="color"
                    className="form-input"
                    style={{ height: '42px', padding: '2px 6px' }}
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setCatModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm confirm-inflow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingCat ? 'Save Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Location Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingLoc}
        onClose={() => setDeletingLoc(null)}
        onConfirm={handleConfirmDeleteLoc}
        title="Deactivate Location"
        message="Are you sure you want to deactivate this physical location? Products mapped to this node will remain in the database but the facility will be marked as inactive."
        itemDetails={deletingLoc ? `${deletingLoc.name} (${deletingLoc.code || deletingLoc.id.slice(0, 8)})` : null}
        confirmText="Deactivate Location"
        cancelText="Keep Location"
        isLoading={isSubmitting}
      />

      {/* Delete Category Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        onConfirm={handleConfirmDeleteCat}
        title="Delete Product Category"
        message="Are you sure you want to delete this taxonomy category? Products assigned to this category will have their category unlinked."
        itemDetails={deletingCat ? `${deletingCat.name} (${deletingCat.subtitle || 'Line'})` : null}
        confirmText="Delete Category"
        cancelText="Keep Category"
        isLoading={isSubmitting}
      />
    </div>
  );
}
