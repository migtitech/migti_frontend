import React, { useState, useEffect, useMemo } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CSpinner,
  CInputGroup,
  CInputGroupText,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilSearch,
  cilArrowLeft,
} from "@coreui/icons";
import { useNavigate, useParams } from "react-router-dom";
import rateCardService from "../../services/rateCardService";
import { Loader, ConfirmDialog } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const RateCardView = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [rateCard, setRateCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    supplierId: null,
  });

  // Supplier modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    supplierName: "",
    rate: "",
    contact: "",
    notes: "",
  });

  const fetchRateCard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() => rateCardService.getById(id));
      const data = res?.data || res;
      setRateCard(data);
    } catch (err) {
      toastError(err?.message || "Failed to fetch rate card details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRateCard();
  }, [id]);

  // Filter suppliers by search term
  const filteredSuppliers = useMemo(() => {
    if (!rateCard?.suppliers) return [];
    if (!searchTerm) return rateCard.suppliers;
    const term = searchTerm.toLowerCase();
    return rateCard.suppliers.filter(
      (s) =>
        s.supplierName?.toLowerCase().includes(term) ||
        s.contact?.includes(term) ||
        String(s.rate).includes(term),
    );
  }, [rateCard?.suppliers, searchTerm]);

  // Sort suppliers by rate ascending for comparison
  const sortedSuppliers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => a.rate - b.rate);
  }, [filteredSuppliers]);

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierForm({ supplierName: "", rate: "", contact: "", notes: "" });
    setModalVisible(true);
  };

  const openEditSupplierModal = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      supplierName: supplier.supplierName || "",
      rate: supplier.rate ?? "",
      contact: supplier.contact || "",
      notes: supplier.notes || "",
    });
    setModalVisible(true);
  };

  const handleSupplierFormChange = (e) => {
    const { name, value } = e.target;
    setSupplierForm((prev) => ({
      ...prev,
      [name]: name === "rate" ? (value === "" ? "" : value) : value,
    }));
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setError("");
    try {
      const payload = {
        ...supplierForm,
        rate: parseFloat(supplierForm.rate) || 0,
      };
      if (editingSupplier) {
        await rateCardService.updateSupplier(id, editingSupplier._id, payload);
        toastSuccess("Supplier updated successfully");
      } else {
        await rateCardService.addSupplier(id, payload);
        toastSuccess("Supplier added successfully");
      }
      setModalVisible(false);
      fetchRateCard();
    } catch (err) {
      toastError(err?.message || "Failed to save supplier");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteSupplierClick = (supplierId) => {
    setConfirmDelete({ visible: true, supplierId });
  };

  const handleDeleteSupplierConfirm = async () => {
    const { supplierId } = confirmDelete;
    setConfirmDelete({ visible: false, supplierId: null });
    if (!supplierId) return;
    try {
      await rateCardService.deleteSupplier(id, supplierId);
      toastSuccess("Supplier removed successfully");
      fetchRateCard();
    } catch (err) {
      toastError(err?.message || "Failed to delete supplier");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading rate card details..." />
      </div>
    );
  }

  if (!rateCard && !loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CAlert color="warning">Rate card not found.</CAlert>
          <CButton color="primary" onClick={() => navigate("/rate-cards")}>
            Back to Rate Cards
          </CButton>
        </CCol>
      </CRow>
    );
  }

  return (
    <CRow>
      <CCol xs={12}>
        {/* Product Info Card */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <CButton
                color="light"
                size="sm"
                onClick={() => navigate("/rate-cards")}
                title="Back"
              >
                <CIcon icon={cilArrowLeft} />
              </CButton>
              <strong>{rateCard?.name || rateCard?.productName}</strong>
              {rateCard?.status && (
                <CBadge
                  color={rateCard.status === "active" ? "success" : "secondary"}
                >
                  {rateCard.status}
                </CBadge>
              )}
            </div>
            <CButton color="primary" onClick={openAddSupplierModal}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Supplier
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError("")}>
                {error}
              </CAlert>
            )}

            {rateCard?.description && (
              <p className="text-muted mb-3">{rateCard.description}</p>
            )}

            {/* Supplier Search */}
            <CInputGroup className="mb-3" style={{ maxWidth: 400 }}>
              <CInputGroupText>
                <CIcon icon={cilSearch} />
              </CInputGroupText>
              <CFormInput
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CInputGroup>

            {/* Supplier Comparison Table */}
            <CTable hover responsive bordered>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>Supplier Name</CTableHeaderCell>
                  <CTableHeaderCell>Rate</CTableHeaderCell>
                  <CTableHeaderCell>Contact</CTableHeaderCell>
                  <CTableHeaderCell>Notes</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {sortedSuppliers.map((supplier, index) => (
                  <CTableRow
                    key={supplier._id}
                    color={
                      index === 0 && sortedSuppliers.length > 1
                        ? "success"
                        : undefined
                    }
                  >
                    <CTableDataCell>{index + 1}</CTableDataCell>
                    <CTableDataCell>
                      <strong>{supplier.supplierName}</strong>
                      {index === 0 && sortedSuppliers.length > 1 && (
                        <CBadge color="success" className="ms-2">
                          Lowest
                        </CBadge>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <strong>
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(supplier.rate)}
                      </strong>
                    </CTableDataCell>
                    <CTableDataCell>{supplier.contact}</CTableDataCell>
                    <CTableDataCell>{supplier.notes || "-"}</CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        color="warning"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditSupplierModal(supplier)}
                        title="Edit"
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSupplierClick(supplier._id)}
                        title="Delete"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {sortedSuppliers.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center">
                      {searchTerm
                        ? `No suppliers found matching "${searchTerm}"`
                        : 'No suppliers added yet. Click "Add Supplier" to add one.'}
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>

            {sortedSuppliers.length > 1 && (
              <div className="text-muted small">
                Showing {sortedSuppliers.length} supplier
                {sortedSuppliers.length !== 1 ? "s" : ""} sorted by rate (lowest
                first).{" "}
                {searchTerm &&
                  `Filtered from ${rateCard?.suppliers?.length || 0} total.`}
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Add/Edit Supplier Modal */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <CModalHeader>
          <CModalTitle>
            {editingSupplier ? "Edit Supplier" : "Add Supplier"}
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSupplierSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Supplier Name *</CFormLabel>
              <CFormInput
                name="supplierName"
                value={supplierForm.supplierName}
                onChange={handleSupplierFormChange}
                required
                placeholder="e.g. Govind Enterprises"
              />
            </div>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Rate *</CFormLabel>
                <CFormInput
                  type="number"
                  name="rate"
                  value={supplierForm.rate}
                  onChange={handleSupplierFormChange}
                  required
                  min={0}
                  placeholder="e.g. 30000"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Contact *</CFormLabel>
                <CFormInput
                  name="contact"
                  value={supplierForm.contact}
                  onChange={handleSupplierFormChange}
                  required
                  placeholder="e.g. 9876543210"
                />
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                name="notes"
                rows={2}
                value={supplierForm.notes}
                onChange={handleSupplierFormChange}
                placeholder="Any additional notes..."
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setModalVisible(false)}
            >
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={modalSubmitting}>
              {modalSubmitting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : editingSupplier ? (
                "Update Supplier"
              ) : (
                "Add Supplier"
              )}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, supplierId: null })}
        onConfirm={handleDeleteSupplierConfirm}
        title="Delete Supplier?"
        message="Are you sure you want to remove this supplier? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  );
};

export default RateCardView;
