import React, { useState } from 'react';
import {
  ReportsIcon,
  SearchIcon,
  PlusIcon,
  CloseIcon,
  AlertTriangleIcon,
  CheckIcon
} from './Icons';
import ConfirmModal from './ConfirmModal';

export default function ReportsView({
  products = [],
  locations = [],
  transactions = [],
  kpis = {}
}) {
  const [reportType, setReportType] = useState('valuation'); // 'valuation' | 'velocity' | 'lowstock'
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Custom Saved Presets (CRUD)
  const [presets, setPresets] = useState([
    { id: 'pre-1', name: 'Executive Stock Valuation', type: 'valuation', location: 'All' },
    { id: 'pre-2', name: 'Warehouse Urgent Restock Alert', type: 'lowstock', location: 'Main Warehouse' },
    { id: 'pre-3', name: 'Weekly Retail Turnover', type: 'velocity', location: 'Boutique Central' },
  ]);
  const [editingPreset, setEditingPreset] = useState(null);
  const [deletingPreset, setDeletingPreset] = useState(null);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const showNotification = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesLoc = selectedLocation === 'All' || p.location === selectedLocation;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLoc && matchesSearch;
  });

  const lowStockItems = filteredProducts.filter(p => p.stock <= p.reorderLevel);

  // Inflow / Outflow Velocity calculations
  const inflowTransactions = transactions.filter(t => t.type === 'inflow');
  const outflowTransactions = transactions.filter(t => t.type === 'outflow');
  const totalInflowQty = inflowTransactions.reduce((acc, t) => acc + (t.itemsQty || 0), 0);
  const totalOutflowQty = outflowTransactions.reduce((acc, t) => acc + (t.itemsQty || 0), 0);
  const netDelta = totalInflowQty - totalOutflowQty;

  // Export handlers
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'valuation') {
      csvContent += 'SKU,Product Name,Category,Location,Stock Qty,Unit Price,Total Valuation\n';
      filteredProducts.forEach((p) => {
        const val = (p.stock * p.unitPrice).toFixed(2);
        csvContent += `"${p.sku}","${p.name}","${p.category}","${p.location}",${p.stock},${p.unitPrice},${val}\n`;
      });
    } else if (reportType === 'lowstock') {
      csvContent += 'SKU,Product Name,Current Stock,Reorder Level,Deficit,Supplier\n';
      lowStockItems.forEach((p) => {
        const deficit = Math.max(0, p.reorderLevel - p.stock);
        csvContent += `"${p.sku}","${p.name}",${p.stock},${p.reorderLevel},${deficit},"${p.supplier || 'N/A'}"\n`;
      });
    } else {
      csvContent += 'Transaction ID,Type,Channel,Entity,Quantity,Amount,Timestamp\n';
      transactions.forEach((t) => {
        csvContent += `"${t.id}","${t.type}","${t.flowSubType || ''}","${t.entity}",${t.itemsQty || 1},${t.amount || 0},"${t.timestamp}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lyans_${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`CSV Report exported successfully.`);
  };

  const handleExportJSON = () => {
    let dataToExport = [];
    if (reportType === 'valuation') {
      dataToExport = filteredProducts.map(p => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        location: p.location,
        stock: p.stock,
        unitPrice: p.unitPrice,
        valuation: p.stock * p.unitPrice,
      }));
    } else if (reportType === 'lowstock') {
      dataToExport = lowStockItems.map(p => ({
        sku: p.sku,
        name: p.name,
        stock: p.stock,
        reorderLevel: p.reorderLevel,
        deficit: Math.max(0, p.reorderLevel - p.stock),
        supplier: p.supplier,
      }));
    } else {
      dataToExport = transactions;
    }

    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `lyans_${reportType}_report_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`JSON Report exported successfully.`);
  };

  // Preset CRUD
  const handleOpenCreatePreset = () => {
    setEditingPreset(null);
    setPresetName('');
    setPresetModalOpen(true);
  };

  const handleOpenEditPreset = (preset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetModalOpen(true);
  };

  const handleSavePreset = (e) => {
    e.preventDefault();
    if (!presetName.trim()) return;

    if (editingPreset) {
      setPresets(prev => prev.map(p => p.id === editingPreset.id ? { ...p, name: presetName } : p));
      showNotification(`Report preset "${presetName}" updated.`);
    } else {
      const newPre = {
        id: `pre-${Date.now().toString().slice(-4)}`,
        name: presetName,
        type: reportType,
        location: selectedLocation,
      };
      setPresets(prev => [...prev, newPre]);
      showNotification(`Saved current configuration as preset "${presetName}".`);
    }
    setPresetModalOpen(false);
  };

  const handleConfirmDeletePreset = () => {
    if (!deletingPreset) return;
    setPresets(prev => prev.filter(p => p.id !== deletingPreset.id));
    showNotification(`Preset "${deletingPreset.name}" removed.`);
    setDeletingPreset(null);
  };

  const handleApplyPreset = (preset) => {
    setReportType(preset.type);
    setSelectedLocation(preset.location);
    showNotification(`Applied preset "${preset.name}".`);
  };

  return (
    <div className="view-page-container animate-fade-in">
      <div className="view-page-header">
        <div>
          <h2 className="view-title">Executive Inventory & Financial Reports</h2>
          <p className="view-subtitle">
            Generate valuation audits, flow velocity assessments, and procurement requirement logs
          </p>
        </div>
        <div className="header-action-group">
          <button type="button" className="btn-secondary-action" onClick={handleExportJSON}>
            <span>Export JSON</span>
          </button>
          <button type="button" className="btn-primary-action" onClick={handleExportCSV}>
            <span>Download CSV Report</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedbackMsg && (
        <div className="toast-banner animate-fade-in" role="status">
          <span>✓</span><span>{feedbackMsg}</span>
        </div>
      )}

      {/* Report Types Tabs */}
      <div className="category-filter-chips" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`filter-chip ${reportType === 'valuation' ? 'active' : ''}`}
          onClick={() => setReportType('valuation')}
        >
          📊 Stock Valuation & Asset Balances
        </button>
        <button
          type="button"
          className={`filter-chip ${reportType === 'velocity' ? 'active' : ''}`}
          onClick={() => setReportType('velocity')}
        >
          ⚡ Inventory Velocity (Inflow vs Outflow)
        </button>
        <button
          type="button"
          className={`filter-chip ${reportType === 'lowstock' ? 'active' : ''}`}
          onClick={() => setReportType('lowstock')}
        >
          ⚠ Low Stock & Reorder Requirements ({lowStockItems.length})
        </button>
      </div>

      {/* Report KPI Summary */}
      <div className="inflow-metrics-banner">
        <div className="metric-box">
          <span className="metric-box-label">Active Portfolio Lines</span>
          <span className="metric-box-val">{filteredProducts.length} Items</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Total Stock Valuation</span>
          <span className="metric-box-val text-green">
            ${filteredProducts.reduce((sum, p) => sum + (p.stock * p.unitPrice), 0).toLocaleString()}
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Critical / Below Reorder</span>
          <span className="metric-box-val text-red">{lowStockItems.length} Lines</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Net Movement Delta</span>
          <span className={`metric-box-val ${netDelta >= 0 ? 'text-green' : 'text-red'}`}>
            {netDelta >= 0 ? `+${netDelta}` : netDelta} Units
          </span>
        </div>
      </div>

      {/* Filter and Preset Strip */}
      <div className="data-toolbar">
        <div className="search-bar-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Filter records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="text-muted" style={{ fontSize: '0.85rem' }}>Location:</label>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px' }}
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="All">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>{loc.name}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={handleOpenCreatePreset}
            style={{ marginLeft: '12px' }}
          >
            <PlusIcon size={14} />
            <span>Save Preset</span>
          </button>
        </div>
      </div>

      {/* Saved Presets Ribbon */}
      {presets.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '0 0 16px 0', flexWrap: 'wrap' }}>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Saved Report Presets:</span>
          {presets.map((pre) => (
            <div
              key={pre.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '16px',
                backgroundColor: '#F1F5F9',
                fontSize: '0.8rem',
                border: '1px solid #E2E8F0'
              }}
            >
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, color: '#334155' }}
                onClick={() => handleApplyPreset(pre)}
              >
                {pre.name}
              </button>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem' }}
                onClick={() => handleOpenEditPreset(pre)}
                title="Rename preset"
              >
                ✏️
              </button>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '0.75rem' }}
                onClick={() => setDeletingPreset(pre)}
                title="Delete preset"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* REPORT CONTENT TABLES */}
      {reportType === 'valuation' && (
        <div className="card data-table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product & SKU</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>On-Hand Units</th>
                  <th>Retail Price</th>
                  <th>Cost Price</th>
                  <th>Total Valuation</th>
                  <th>Margin Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const val = p.stock * p.unitPrice;
                  const cost = p.stock * (p.costPrice || p.unitPrice * 0.5);
                  const margin = val > 0 ? (((val - cost) / val) * 100).toFixed(0) : 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell-name">{p.name}</div>
                        <span className="product-cell-sku">{p.sku}</span>
                      </td>
                      <td><span className="category-pill">{p.category}</span></td>
                      <td>{p.location}</td>
                      <td><span className="font-semibold">{p.stock} units</span></td>
                      <td>${p.unitPrice}</td>
                      <td className="text-muted">${(p.costPrice || p.unitPrice * 0.5).toFixed(2)}</td>
                      <td className="font-semibold text-green">${val.toLocaleString()}</td>
                      <td><span className="status-pill status-good">{margin}% Margin</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'lowstock' && (
        <div className="card data-table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Code & Description</th>
                  <th>Category</th>
                  <th>Current Balance</th>
                  <th>Reorder Point</th>
                  <th>Units Deficit</th>
                  <th>Primary Supplier</th>
                  <th>Est. PO Value</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#10B981' }}>
                      ✓ All products are currently stocked above their reorder thresholds!
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((p) => {
                    const deficit = Math.max(0, (p.reorderLevel * 2) - p.stock);
                    const poVal = deficit * (p.costPrice || p.unitPrice * 0.5);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="product-cell-name">{p.name}</div>
                          <span className="product-cell-sku">{p.sku}</span>
                        </td>
                        <td><span className="category-pill">{p.category}</span></td>
                        <td>
                          <span className="stock-number-pill critical">
                            {p.stock} units
                          </span>
                        </td>
                        <td>{p.reorderLevel} units</td>
                        <td>
                          <span className="qty-tag outflow" style={{ color: '#EF4444' }}>
                            Need +{deficit} units
                          </span>
                        </td>
                        <td className="text-muted">{p.supplier || 'Primary Vendor'}</td>
                        <td className="font-semibold">${poVal.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'velocity' && (
        <div className="card data-table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction Reference</th>
                  <th>Flow Category</th>
                  <th>Source / Partner / Customer</th>
                  <th>Velocity Impact</th>
                  <th>Recorded Value</th>
                  <th>Audit Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="tx-id-cell font-mono">{tx.id}</td>
                    <td>
                      <span className={`category-pill ${tx.type === 'inflow' ? 'good' : 'warning'}`}>
                        {tx.type === 'inflow' ? '↑ Intake Inflow' : '↓ Depletion Outflow'}
                      </span>
                    </td>
                    <td>{tx.entity}</td>
                    <td>
                      <span className={`qty-tag ${tx.type === 'inflow' ? 'inflow' : 'outflow'}`}>
                        {tx.type === 'inflow' ? `+${tx.itemsQty || 1}` : `-${tx.itemsQty || 1}`} units
                      </span>
                    </td>
                    <td className="font-semibold">${(tx.amount || 0).toLocaleString()}</td>
                    <td className="text-muted">{tx.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preset Modal */}
      {presetModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{editingPreset ? 'Rename Preset' : 'Save Report Preset'}</h3>
                <p className="modal-subtitle">Save active filters and report dimensions for fast 1-click execution</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setPresetModalOpen(false)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="preName">Preset Title</label>
                <input
                  id="preName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Q4 Regional Restock Audit"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setPresetModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm confirm-inflow"
                >
                  {editingPreset ? 'Save Changes' : 'Save Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingPreset}
        onClose={() => setDeletingPreset(null)}
        onConfirm={handleConfirmDeletePreset}
        title="Delete Saved Report Preset"
        message="Are you sure you want to delete this custom saved report configuration?"
        itemDetails={deletingPreset ? deletingPreset.name : null}
        confirmText="Delete Preset"
        cancelText="Keep Preset"
      />
    </div>
  );
}
