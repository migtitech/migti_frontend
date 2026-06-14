import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCloudUpload, cilPlus, cilTrash } from "@coreui/icons";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import companyDocumentService from "../../services/companyDocumentService";
import { Loader, ConfirmDialog } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const DOC_TYPE_OPTIONS = ["Catalog", "Policy", "Certificate", "Other"];

const getId = (row) => row?._id || row?.id;

const getFileName = (row) =>
  row?.documentId?.originalName || row?.documentId?.path || "-";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const CompanyDocumentList = () => {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [pagination, setPagination] = useState({});
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    doc_type: "Catalog",
    remark: "",
    file: null,
  });
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        companyDocumentService.list({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm || undefined,
          doc_type: docTypeFilter || undefined,
        }),
      );
      const data = res?.data?.data || res?.data || res;
      setDocuments(data?.companyDocuments || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to load company documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, docTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const resetForm = () => {
    setForm({ name: "", doc_type: "Catalog", remark: "", file: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openUploadModal = () => {
    resetForm();
    setUploadModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));
  };

  const handleUpload = async () => {
    const name = (form.name || "").trim();
    const doc_type = (form.doc_type || "").trim();
    const remark = (form.remark || "").trim();
    if (!name) {
      toastError("Name is required");
      return;
    }
    if (!doc_type) {
      toastError("Document type is required");
      return;
    }
    if (!form.file) {
      toastError("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      await companyDocumentService.create({
        name,
        doc_type,
        remark,
        file: form.file,
      });
      toastSuccess("Company document uploaded");
      setUploadModal(false);
      resetForm();
      fetchDocuments();
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload document",
      );
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this document");
      return;
    }
    setOpeningDocId(String(docId));
    try {
      const response = await axiosClient.get(DOCUMENTS.SERVE(docId), {
        responseType: "blob",
      });
      const blob = response.data ?? response;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toastError("Could not open document");
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await companyDocumentService.delete(id);
      toastSuccess("Company document deleted");
      fetchDocuments();
    } catch (err) {
      toastError(err?.message || "Delete failed");
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Company documents</strong>
            <CButton color="primary" onClick={openUploadModal}>
              <CIcon icon={cilPlus} className="me-2" />
              Upload document
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError("")}>
                {error}
              </CAlert>
            )}

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormInput
                  type="text"
                  placeholder="Search by name or remark..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </CCol>
              <CCol md={3}>
                <CFormSelect
                  value={docTypeFilter}
                  onChange={(e) => {
                    setDocTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Document type filter"
                >
                  <option value="">All types</option>
                  {DOC_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            {loading ? (
              <Loader message="Loading company documents..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Doc type</CTableHeaderCell>
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                      <CTableHeaderCell>File</CTableHeaderCell>
                      <CTableHeaderCell>Uploaded</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {documents.map((doc, index) => {
                      const docFileId = doc?.documentId?._id || doc?.documentId;
                      return (
                        <CTableRow key={getId(doc)}>
                          <CTableDataCell>
                            {(page - 1) * 10 + index + 1}
                          </CTableDataCell>
                          <CTableDataCell>
                            <strong>{doc.name || "-"}</strong>
                          </CTableDataCell>
                          <CTableDataCell>{doc.doc_type || "-"}</CTableDataCell>
                          <CTableDataCell>{doc.remark || "-"}</CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="link"
                              className="p-0 text-decoration-none"
                              disabled={
                                !docFileId || openingDocId === String(docFileId)
                              }
                              onClick={() => openDocument(doc)}
                            >
                              {getFileName(doc)}
                            </CButton>
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatDate(doc.createdAt)}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() =>
                                setConfirmDelete({
                                  visible: true,
                                  id: getId(doc),
                                })
                              }
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}
                    {documents.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center">
                          No company documents found. Upload a catalog or other
                          document to get started.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>

                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="small text-medium-emphasis">
                      Showing{" "}
                      {((pagination?.currentPage ?? 1) - 1) *
                        (pagination?.itemsPerPage ?? 10) +
                        1}
                      -
                      {Math.min(
                        (pagination?.currentPage ?? 1) *
                          (pagination?.itemsPerPage ?? 10),
                        pagination?.totalItems ?? 0,
                      )}{" "}
                      of {pagination?.totalItems ?? 0}
                    </div>
                    <CPagination className="mb-0">
                      <CPaginationItem
                        disabled={!pagination.hasPrevPage}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </CPaginationItem>
                      {Array.from({ length: pagination.totalPages }, (_, i) => (
                        <CPaginationItem
                          key={i + 1}
                          active={page === i + 1}
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </CPaginationItem>
                      ))}
                      <CPaginationItem
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </CPaginationItem>
                    </CPagination>
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={uploadModal} onClose={() => setUploadModal(false)}>
        <CModalHeader>
          <CModalTitle>Upload company document</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel htmlFor="company-doc-name">Name</CFormLabel>
            <CFormInput
              id="company-doc-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Document name"
            />
          </div>
          <div className="mb-3">
            <CFormLabel htmlFor="company-doc-type">Doc type</CFormLabel>
            <CFormSelect
              id="company-doc-type"
              value={form.doc_type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, doc_type: e.target.value }))
              }
            >
              {DOC_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="mb-3">
            <CFormLabel htmlFor="company-doc-remark">Remark</CFormLabel>
            <CFormTextarea
              id="company-doc-remark"
              rows={3}
              value={form.remark}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, remark: e.target.value }))
              }
              placeholder="Optional notes"
            />
          </div>
          <div className="mb-2">
            <CFormLabel htmlFor="company-doc-file">File</CFormLabel>
            <CFormInput
              id="company-doc-file"
              type="file"
              accept=".pdf,.xls,.xlsx,image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <small className="text-muted">
              PDF, Excel, or image files up to 15MB
            </small>
          </div>
          {form.file && (
            <div className="small text-muted">Selected: {form.file.name}</div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setUploadModal(false)}
            disabled={uploading}
          >
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleUpload} disabled={uploading}>
            <CIcon icon={cilCloudUpload} className="me-2" />
            {uploading ? "Uploading..." : "Upload"}
          </CButton>
        </CModalFooter>
      </CModal>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete company document?"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  );
};

export default CompanyDocumentList;
