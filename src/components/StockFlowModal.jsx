import React, { useState } from 'react';
import { CloseIcon, PlusIcon, ArrowDownLeftIcon } from './Icons';
import { MOVEMENT_TYPES } from '../data/mockData';

export default function StockFlowModal({
  isOpen,
  onClose,
  products,
  locations,
  onSubmitMovement
}) {
  const [movementType, setMovementType] = useState('inflow'); // 'inflow' | 'outflow'
  const [subType, setSubType] = useState('Restocking');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || '');
  const [quantity, setQuantity] = useState(5);
  const [referenceNote, setReferenceNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const currentOptions = MOVEMENT_TYPES[movementType];

  const handleTypeChange = (type) => {
    setMovementType(type);
    setSubType(type === 'inflow' ? 'Restocking' : 'POS Website');
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setErrorMsg('Please enter a valid positive quantity.');
      return;
    }

    const targetProduct = products.find((p) => p.id === selectedProductId);
    const targetLocation = locations.find((l) => l.id === selectedLocationId);

    if (movementType === 'outflow' && targetProduct && targetProduct.stock < qty) {
      setErrorMsg(`Insufficient stock for ${targetProduct.name}. Available on-hand: ${targetProduct.stock} units.`);
      return;
    }

    onSubmitMovement({
      movementType,
      subType,
      productId: selectedProductId,
      productName: targetProduct?.name || 'Item',
      locationId: selectedLocationId,
      locationName: targetLocation?.name || 'Main Store',
      quantity: qty,
      unitPrice: targetProduct?.unitPrice || 150,
      referenceNote: referenceNote.trim() || `${subType} Log - ${new Date().toLocaleTimeString()}`
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card animate-fade-in">
        <div className="modal-header">
          <div>
            <h3 id="modal-title" className="modal-title">Record Stock Movement</h3>
            <p className="modal-subtitle">Track real-time inventory inflow and outflow at time <em>t</em></p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errorMsg && (
            <div className="form-error-banner" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Movement Direction Toggle */}
          <div className="form-group">
            <label className="form-label">Flow Direction</label>
            <div className="flow-type-segmented-control">
              <button
                type="button"
                className={`segment-btn ${movementType === 'inflow' ? 'active-inflow' : ''}`}
                onClick={() => handleTypeChange('inflow')}
              >
                <PlusIcon size={16} />
                <span>Stock Inflow (+ In)</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${movementType === 'outflow' ? 'active-outflow' : ''}`}
                onClick={() => handleTypeChange('outflow')}
              >
                <ArrowDownLeftIcon size={16} />
                <span>Stock Outflow (- Out)</span>
              </button>
            </div>
          </div>

          {/* Sub-type Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="subTypeSelect">
              Transaction Channel / Reason
            </label>
            <select
              id="subTypeSelect"
              className="form-select"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
            >
              {currentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="productSelect">
              Select Product SKU
            </label>
            <select
              id="productSelect"
              className="form-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Available: {p.stock} units
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Location Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="quantityInput">
                Units Quantity
              </label>
              <input
                id="quantityInput"
                type="number"
                min="1"
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="locationSelect">
                Target Location
              </label>
              <select
                id="locationSelect"
                className="form-select"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference / Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="referenceInput">
              Reference Note / Tracking ID (Optional)
            </label>
            <input
              id="referenceInput"
              type="text"
              className="form-input"
              placeholder="e.g. PO-7712, POS Order #902, RMA #33"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-confirm ${movementType === 'inflow' ? 'confirm-inflow' : 'confirm-outflow'}`}
            >
              {movementType === 'inflow' ? '+ Commit Inflow' : '- Commit Outflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
