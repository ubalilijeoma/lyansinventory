import React, { useState } from 'react';
import { ArrowDownLeftIcon, PlusIcon, CloseIcon, SearchIcon, CheckIcon, AlertTriangleIcon } from './Icons';
import { updateOutflowRecord, deleteOutflowRecord } from '../services/inventoryService';
import ConfirmModal from './ConfirmModal';

export default function SalesView({
  transactions = [],
  onOpenMovementModal,
  onSimulatePosSale,
  onRefreshData
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state for editing
  const [formEntity, setFormEntity] = useState('');
  const [formSubType, setFormSubType] = useState('POS Website');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formAmount, setFormAmount] = useState(0);
  const [formStatus, setFormStatus] = useState('Completed');
  const [formNotes, setFormNotes] = useState('');

  // Filter to outflow transactions
  const outflowList = transactions.filter((t) => t.type === 'outflow');

  const filteredOutflows = outflowList.filter((item) => {
    const matchesFilter =
      activeFilter === 'All' ||
      (item.flowSubType && item.flowSubType.toLowerCase().includes(activeFilter.toLowerCase()));
    const matchesSearch =
      (item.id && item.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.entity && item.entity.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalOutflowItems = outflowList.reduce((acc, curr) => acc + (curr.itemsQty || 0), 0);
  const totalOutflowValue = outflowList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setFeedbackMsg(msg);
      setTimeout(() => setFeedbackMsg(''), 3500);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormEntity(item.entity || item.destination || '');
    setFormSubType(item.flowSubType || 'POS Website');
    setFormQuantity(item.itemsQty || 1);
    setFormAmount(item.amount || 0);
    setFormStatus(item.status || 'Completed');
    setFormNotes(item.notes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);

    try {
      await updateOutflowRecord(editingItem.id, {
        entity: formEntity,
        flowSubType: formSubType,
        quantity: parseInt(formQuantity, 10),
        amount: parseFloat(formAmount),
        status: formStatus,
        notes: formNotes,
      });

      showNotification(`Sales/Outflow record ${editingItem.id} updated successfully.`);
      setEditingItem(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to update sales record: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);

    try {
      await deleteOutflowRecord(deletingItem.id);
      showNotification(`Sales record ${deletingItem.id} has been voided.`);
      setDeletingItem(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to delete sales record: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Notifications */}
      {feedbackMsg && (
        <div className="toast-banner animate-fade-in" role="status">
          <span>✓</span><span>{feedbackMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="form-error-banner" role="alert">{errorMsg}</div>
      )}

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

      {/* Filter and Search Bar */}
      <div className="data-toolbar">
        <div className="search-bar-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by order ref, destination, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutflows.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No sales or outflow records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOutflows.map((item) => (
                  <tr key={item.id}>
                    <td className="tx-id-cell">
                      <span className="tx-id">{item.id}</span>
                    </td>
                    <td>
                      <div className="entity-name">{item.entity}</div>
                      {item.notes && <span className="entity-notes text-muted" style={{ fontSize: '0.78rem' }}>{item.notes}</span>}
                    </td>
                    <td>
                      <span className="outflow-type-badge">
                        <ArrowDownLeftIcon size={13} /> {item.flowSubType}
                      </span>
                    </td>
                    <td>
                      <span className="qty-tag outflow">-{item.itemsQty || 1} units</span>
                    </td>
                    <td className="font-semibold">${(item.amount || 0).toLocaleString()}</td>
                    <td className="text-muted">{item.timestamp}</td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          color: item.status === 'Completed' ? '#10B981' : item.status === 'Written-Off' ? '#F59E0B' : '#EF4444',
                          backgroundColor: item.status === 'Completed' ? '#ECFDF5' : item.status === 'Written-Off' ? '#FFFBEB' : '#FEF2F2'
                        }}
                      >
                        {item.status || 'Completed'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-table-action edit"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit sales record"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-table-action delete"
                          onClick={() => setDeletingItem(item)}
                          title="Void sales record"
                        >
                          Void
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

      {/* Edit Outflow Modal */}
      {editingItem && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Edit Sales / Outflow: {editingItem.id}</h3>
                <p className="modal-subtitle">Modify destination channel, quantity, total value, and status</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setEditingItem(null)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="editOutEntity">Destination / Customer Entity</label>
                <input
                  id="editOutEntity"
                  type="text"
                  className="form-input"
                  value={formEntity}
                  onChange={(e) => setFormEntity(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="editOutSubType">Outflow Classification</label>
                  <select
                    id="editOutSubType"
                    className="form-select"
                    value={formSubType}
                    onChange={(e) => setFormSubType(e.target.value)}
                  >
                    <option value="POS Website">POS Website</option>
                    <option value="Damaged">Damaged / Defect</option>
                    <option value="Returned to Supplier">Returned to Supplier (RTV)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editOutStatus">Status</label>
                  <select
                    id="editOutStatus"
                    className="form-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Written-Off">Written-Off</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="editOutQty">Quantity Deducted</label>
                  <input
                    id="editOutQty"
                    type="number"
                    min="1"
                    className="form-input"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editOutAmount">Total Value ($)</label>
                  <input
                    id="editOutAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="editOutNotes">Order / Event Notes</label>
                <input
                  id="editOutNotes"
                  type="text"
                  className="form-input"
                  placeholder="Additional order or reconciliation note"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingItem(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm confirm-outflow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Update Sales Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Void Sales / Outflow Record"
        message="Are you sure you want to void and remove this sales/outflow transaction record? This will permanently delete the transaction entry from the active outflow records."
        itemDetails={deletingItem ? `Order Ref: ${deletingItem.id} · ${deletingItem.entity} (${deletingItem.flowSubType})` : null}
        confirmText="Void Record"
        cancelText="Keep Record"
        isLoading={isSubmitting}
      />
    </div>
  );
}
