import React, { useState } from 'react';
import { PlusIcon, ArrowUpRightIcon, CheckIcon, CloseIcon, SearchIcon, AlertTriangleIcon } from './Icons';
import { updateInflowRecord, deleteInflowRecord } from '../services/inventoryService';
import ConfirmModal from './ConfirmModal';

export default function PurchasesView({
  transactions = [],
  onOpenMovementModal,
  onRefreshData
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for editing
  const [formEntity, setFormEntity] = useState('');
  const [formSubType, setFormSubType] = useState('Restocking');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formAmount, setFormAmount] = useState(0);
  const [formStatus, setFormStatus] = useState('Completed');
  const [formNotes, setFormNotes] = useState('');

  // Filter to inflow transactions
  const inflowList = transactions.filter((t) => t.type === 'inflow');

  const filteredInflows = inflowList.filter((item) => {
    const matchesFilter =
      activeFilter === 'All' ||
      (item.flowSubType && item.flowSubType.toLowerCase().includes(activeFilter.toLowerCase()));
    const matchesSearch =
      (item.id && item.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.entity && item.entity.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalInflowItems = inflowList.reduce((acc, curr) => acc + (curr.itemsQty || 0), 0);
  const totalInflowValue = inflowList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

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
    setFormEntity(item.entity || item.supplier || '');
    setFormSubType(item.flowSubType || 'Restocking');
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
      await updateInflowRecord(editingItem.id, {
        entity: formEntity,
        flowSubType: formSubType,
        quantity: parseInt(formQuantity, 10),
        amount: parseFloat(formAmount),
        status: formStatus,
        notes: formNotes,
      });

      showNotification(`Purchase ${editingItem.id} updated successfully.`);
      setEditingItem(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to update purchase: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);

    try {
      await deleteInflowRecord(deletingItem.id);
      showNotification(`Purchase record ${deletingItem.id} has been voided.`);
      setDeletingItem(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      showNotification(`Failed to delete purchase: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Notifications */}
      {feedbackMsg && (
        <div className="toast-banner animate-fade-in" role="status">
          <span>✓</span><span>{feedbackMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="form-error-banner" role="alert">{errorMsg}</div>
      )}

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

      {/* Filter & Search Toolbar */}
      <div className="data-toolbar">
        <div className="search-bar-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ref ID, partner, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInflows.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No purchase records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInflows.map((item) => (
                  <tr key={item.id}>
                    <td className="tx-id-cell">
                      <span className="tx-id">{item.id}</span>
                    </td>
                    <td>
                      <div className="entity-name">{item.entity}</div>
                      {item.notes && <span className="entity-notes text-muted" style={{ fontSize: '0.78rem' }}>{item.notes}</span>}
                    </td>
                    <td>
                      <span className="inflow-type-badge">
                        <ArrowUpRightIcon size={13} /> {item.flowSubType}
                      </span>
                    </td>
                    <td>
                      <span className="qty-tag inflow">+{item.itemsQty || 1} units</span>
                    </td>
                    <td className="font-semibold">${(item.amount || 0).toLocaleString()}</td>
                    <td className="text-muted">{item.timestamp}</td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          color: item.status === 'Completed' ? '#10B981' : item.status === 'Pending' ? '#F59E0B' : '#EF4444',
                          backgroundColor: item.status === 'Completed' ? '#ECFDF5' : item.status === 'Pending' ? '#FFFBEB' : '#FEF2F2'
                        }}
                      >
                        <CheckIcon size={12} /> {item.status || 'Completed'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-table-action edit"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit purchase record"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-table-action delete"
                          onClick={() => setDeletingItem(item)}
                          title="Void purchase record"
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

      {/* Edit Inflow Modal */}
      {editingItem && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Edit Purchase / Inflow: {editingItem.id}</h3>
                <p className="modal-subtitle">Modify transaction partner, classification, quantity, and status</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setEditingItem(null)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="editEntity">Supplier / Source Entity</label>
                <input
                  id="editEntity"
                  type="text"
                  className="form-input"
                  value={formEntity}
                  onChange={(e) => setFormEntity(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="editSubType">Inflow Classification</label>
                  <select
                    id="editSubType"
                    className="form-select"
                    value={formSubType}
                    onChange={(e) => setFormSubType(e.target.value)}
                  >
                    <option value="Restocking">Restocking (Supplier PO)</option>
                    <option value="Returning">Returning (Customer RMA)</option>
                    <option value="Replacing">Replacing (Vendor Exchange)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editStatus">Transaction Status</label>
                  <select
                    id="editStatus"
                    className="form-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="editQty">Quantity Received</label>
                  <input
                    id="editQty"
                    type="number"
                    min="1"
                    className="form-input"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editAmount">Total Invoice Value ($)</label>
                  <input
                    id="editAmount"
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
                <label className="form-label" htmlFor="editNotes">Reference Notes</label>
                <input
                  id="editNotes"
                  type="text"
                  className="form-input"
                  placeholder="Additional order or shipping note"
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
                  className="btn-confirm confirm-inflow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Update Purchase'}
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
        title="Void Purchase Record"
        message="Are you sure you want to void and remove this purchase/inflow transaction record? This record will be permanently purged from the active inflow ledger."
        itemDetails={deletingItem ? `Batch Ref: ${deletingItem.id} · ${deletingItem.entity} (${deletingItem.flowSubType})` : null}
        confirmText="Void Record"
        cancelText="Keep Record"
        isLoading={isSubmitting}
      />
    </div>
  );
}
