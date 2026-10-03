import React, { useState, useEffect } from 'react';
import {
  TransfersIcon,
  PlusIcon,
  SearchIcon,
  CloseIcon,
  CheckIcon,
  AlertTriangleIcon
} from './Icons';
import {
  fetchStockTransfers,
  createStockTransfer,
  updateStockTransfer,
  deleteStockTransfer,
  fetchLocationOptions,
} from '../services/inventoryService';
import ConfirmModal from './ConfirmModal';

export default function TransfersView({
  products = [],
  locations = [],
  onRefreshData
}) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [deletingTransfer, setDeletingTransfer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [formProductId, setFormProductId] = useState('');
  const [formSourceLocId, setFormSourceLocId] = useState('');
  const [formDestLocId, setFormDestLocId] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formStatus, setFormStatus] = useState('In Transit');
  const [formNotes, setFormNotes] = useState('');

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetchStockTransfers();
      setTransfers(res.data || []);
    } catch (err) {
      console.warn('[TransfersView] Load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

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
    setEditingTransfer(null);
    setFormProductId(products[0]?.id || '');
    setFormSourceLocId(locations[0]?.id || '');
    setFormDestLocId(locations[1]?.id || locations[0]?.id || '');
    setFormQuantity(5);
    setFormStatus('In Transit');
    setFormNotes('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (transfer) => {
    setEditingTransfer(transfer);
    // Match product and locations
    const prodMatch = products.find(p => p.name === transfer.productName || p.id === transfer.productId);
    const srcMatch = locations.find(l => l.name === transfer.sourceLocation || l.id === transfer.sourceLocationId);
    const destMatch = locations.find(l => l.name === transfer.destinationLocation || l.id === transfer.destinationLocationId);

    setFormProductId(prodMatch?.id || products[0]?.id || '');
    setFormSourceLocId(srcMatch?.id || locations[0]?.id || '');
    setFormDestLocId(destMatch?.id || locations[1]?.id || '');
    setFormQuantity(transfer.quantity || 1);
    setFormStatus(transfer.status || 'In Transit');
    setFormNotes(transfer.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formSourceLocId === formDestLocId) {
      showNotification('Source and Destination locations must be different.', true);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTransfer) {
        await updateStockTransfer(editingTransfer.id, {
          sourceLocationId: formSourceLocId,
          destinationLocationId: formDestLocId,
          quantity: parseInt(formQuantity, 10),
          status: formStatus,
          notes: formNotes,
        });
        showNotification(`Transfer ${editingTransfer.transferCode || editingTransfer.id} updated successfully.`);
      } else {
        const prod = products.find(p => p.id === formProductId);
        const src = locations.find(l => l.id === formSourceLocId);
        const dest = locations.find(l => l.id === formDestLocId);

        await createStockTransfer({
          productId: formProductId,
          productName: prod?.name || 'Transferred Item',
          productSku: prod?.sku || '',
          sourceLocationId: formSourceLocId,
          sourceLocation: src?.name || 'Source',
          destinationLocationId: formDestLocId,
          destinationLocation: dest?.name || 'Destination',
          quantity: parseInt(formQuantity, 10),
          status: formStatus,
          notes: formNotes,
        });
        showNotification('New stock transfer dispatched successfully.');
      }

      setModalOpen(false);
      await loadTransfers();
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Transfer operation failed: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransfer) return;
    setIsSubmitting(true);

    try {
      await deleteStockTransfer(deletingTransfer.id);
      showNotification(`Transfer ${deletingTransfer.transferCode || deletingTransfer.id} removed.`);
      setDeletingTransfer(null);
      await loadTransfers();
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to delete transfer: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch =
      (t.transferCode && t.transferCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.productName && t.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.sourceLocation && t.sourceLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.destinationLocation && t.destinationLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const inTransitCount = transfers.filter(t => t.status === 'In Transit').length;
  const pendingCount = transfers.filter(t => t.status === 'Pending').length;
  const completedCount = transfers.filter(t => t.status === 'Completed').length;
  const totalUnitsInTransit = transfers
    .filter(t => t.status === 'In Transit')
    .reduce((sum, t) => sum + (t.quantity || 0), 0);

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">Multi-Location Stock Transfers</h2>
          <p className="view-subtitle">
            Transfer inventory between warehouses, retail boutiques, and pop-up locations with chain of custody tracking
          </p>
        </div>
        <button
          type="button"
          className="btn-primary-action"
          onClick={handleOpenCreateModal}
        >
          <PlusIcon size={16} />
          <span>New Stock Transfer</span>
        </button>
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

      {/* Transfer Metrics Summary */}
      <div className="inflow-metrics-banner">
        <div className="metric-box">
          <span className="metric-box-label">Active Dispatches</span>
          <span className="metric-box-val text-blue">{inTransitCount} In Transit</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Units in Transit</span>
          <span className="metric-box-val">{totalUnitsInTransit} Units</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Pending Approval</span>
          <span className="metric-box-val text-yellow">{pendingCount} Pending</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Delivered & Reconciled</span>
          <span className="metric-box-val text-green">{completedCount} Received</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="data-toolbar">
        <div className="search-bar-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search transfers by ID, item, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filter-chips">
          {['All', 'In Transit', 'Pending', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'All' ? 'All Transfers' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Transfers Table */}
      <div className="card data-table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transfer Ref</th>
                <th>Product & SKU</th>
                <th>Route (Source ➔ Destination)</th>
                <th>Transfer Qty</th>
                <th>Dispatched</th>
                <th>Status</th>
                <th>Notes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    {loading ? 'Loading transfer records...' : 'No stock transfers found.'}
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((item) => (
                  <tr key={item.id}>
                    <td className="tx-id-cell">
                      <span className="tx-id">{item.transferCode || item.id}</span>
                    </td>
                    <td>
                      <div className="product-cell-name">{item.productName}</div>
                      <span className="product-cell-sku">{item.productSku}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="location-pill-badge">{item.sourceLocation}</span>
                        <span style={{ color: '#94a3b8' }}>➔</span>
                        <span className="location-pill-badge highlight">{item.destinationLocation}</span>
                      </div>
                    </td>
                    <td>
                      <span className="qty-tag font-semibold">{item.quantity} units</span>
                    </td>
                    <td className="text-muted">{item.createdAt}</td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          color: item.status === 'Completed' ? '#10B981' : item.status === 'In Transit' ? '#3B82F6' : item.status === 'Pending' ? '#F59E0B' : '#94a3b8',
                          backgroundColor: item.status === 'Completed' ? '#ECFDF5' : item.status === 'In Transit' ? '#EFF6FF' : item.status === 'Pending' ? '#FFFBEB' : '#F1F5F9'
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.notes || '—'}
                    </td>
                    <td className="text-right">
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-table-action edit"
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit transfer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-table-action delete"
                          onClick={() => setDeletingTransfer(item)}
                          title="Cancel/Void transfer"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Transfer Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingTransfer ? `Edit Transfer: ${editingTransfer.transferCode || editingTransfer.id}` : 'Dispatch New Stock Transfer'}
                </h3>
                <p className="modal-subtitle">
                  {editingTransfer ? 'Update route, quantity, status, or transfer notes' : 'Move inventory between storage nodes and retail points'}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setModalOpen(false)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="trfProduct">Product to Transfer</label>
                <select
                  id="trfProduct"
                  className="form-select"
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  disabled={!!editingTransfer}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Available: {p.stock} units
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="trfSource">Source Origin Location</label>
                  <select
                    id="trfSource"
                    className="form-select"
                    value={formSourceLocId}
                    onChange={(e) => setFormSourceLocId(e.target.value)}
                    required
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="trfDest">Destination Location</label>
                  <select
                    id="trfDest"
                    className="form-select"
                    value={formDestLocId}
                    onChange={(e) => setFormDestLocId(e.target.value)}
                    required
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="trfQty">Transfer Quantity</label>
                  <input
                    id="trfQty"
                    type="number"
                    min="1"
                    className="form-input"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="trfStatus">Transfer Status</label>
                  <select
                    id="trfStatus"
                    className="form-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="In Transit">In Transit</option>
                    <option value="Pending">Pending Approval</option>
                    <option value="Completed">Completed / Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trfNotes">Transfer Notes / Reason</label>
                <input
                  id="trfNotes"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Urgent weekend replenishment, store display restock"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm confirm-inflow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingTransfer ? 'Save Transfer Changes' : 'Dispatch Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Transfer Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingTransfer}
        onClose={() => setDeletingTransfer(null)}
        onConfirm={handleConfirmDelete}
        title="Cancel Stock Transfer"
        message="Are you sure you want to cancel and void this inter-location transfer dispatch? The transfer record will be permanently removed from active transit records."
        itemDetails={deletingTransfer ? `${deletingTransfer.transferCode || deletingTransfer.id}: ${deletingTransfer.productName} (${deletingTransfer.quantity} units from ${deletingTransfer.sourceLocation} to ${deletingTransfer.destinationLocation})` : null}
        confirmText="Cancel Transfer"
        cancelText="Keep Dispatch"
        isLoading={isSubmitting}
      />
    </div>
  );
}
