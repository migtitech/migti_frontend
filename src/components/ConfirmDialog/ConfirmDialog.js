import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilWarning } from '@coreui/icons'
import './ConfirmDialog.scss'

/**
 * Reusable confirmation dialog (replaces window.confirm).
 * @param {boolean} visible - Whether the modal is open
 * @param {function} onClose - Called when modal is closed (backdrop or Cancel)
 * @param {function} onConfirm - Called when user clicks Confirm
 * @param {string} title - Modal title (e.g. "Delete Brand?")
 * @param {string} message - Body message (e.g. "This action cannot be undone.")
 * @param {string} [confirmText='Delete'] - Confirm button label
 * @param {string} [cancelText='Cancel'] - Cancel button label
 * @param {string} [confirmColor='danger'] - CoreUI color for confirm button (danger, primary, etc.)
 * @param {string} [icon='trash'] - 'trash' | 'warning' for the header icon
 */
const ConfirmDialog = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmColor = 'danger',
  icon = 'trash',
}) => {
  const handleConfirm = () => {
    onConfirm?.()
    onClose?.()
  }

  const IconComponent = icon === 'warning' ? cilWarning : cilTrash

  return (
    <CModal
      alignment="center"
      visible={visible}
      onClose={onClose}
      className="confirm-dialog-modal"
      backdrop="static"
    >
      <CModalHeader className="confirm-dialog-header">
        <div className="confirm-dialog-icon-wrapper">
          <CIcon icon={IconComponent} className="confirm-dialog-icon" />
        </div>
        <CModalTitle className="confirm-dialog-title">{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className="confirm-dialog-body">
        <p className="confirm-dialog-message">{message}</p>
      </CModalBody>
      <CModalFooter className="confirm-dialog-footer">
        <CButton color="secondary" variant="outline" onClick={onClose}>
          {cancelText}
        </CButton>
        <CButton color={confirmColor} onClick={handleConfirm}>
          {confirmText}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ConfirmDialog
