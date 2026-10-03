import React, { useEffect } from 'react';
import { CloseIcon, AlertTriangleIcon } from './Icons';

export default function ConfirmModal({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Confirm Removal',
  message = 'Are you sure you want to proceed with this action? This cannot be undone.',
  itemDetails = null,
  confirmText = 'Remove',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false
}) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop confirm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="modal-card confirm-modal-card animate-fade-in">
        <div className="confirm-modal-top">
          <div className="confirm-icon-box">
            <AlertTriangleIcon size={24} />
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="confirm-modal-body">
          <h3 className="confirm-modal-title">{title}</h3>
          <p className="confirm-modal-message">{message}</p>

          {itemDetails && (
            <div className="confirm-item-box">
              <span className="confirm-item-name">{itemDetails}</span>
            </div>
          )}
        </div>

        <div className="modal-actions confirm-modal-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-confirm ${isDestructive ? 'confirm-outflow' : 'confirm-inflow'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
