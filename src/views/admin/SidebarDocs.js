import React, { useCallback, useEffect, useState } from "react";
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
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
import { cilCloudDownload, cilMagnifyingGlass } from "@coreui/icons";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import companyDocumentService from "../../services/companyDocumentService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

const DOC_TYPE_OPTIONS = ["Catalog", "Policy", "Certificate", "Other"];

const getId = (row) => row?._id || row?.id;

const getFileName = (row) =>
  row?.documentId?.originalName || row?.name || "document";

const SidebarDocs = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [pagination, setPagination] = useState({});
  const [actionKey, setActionKey] = useState(null);

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
      setError(err?.message || "Failed to load documents");
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

  const fetchDocBlob = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this document");
      return null;
    }
    const response = await axiosClient.get(DOCUMENTS.SERVE(docId), {
      responseType: "blob",
    });
    return response.data ?? response;
  };

  const viewDocument = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this document");
      return;
    }
    setActionKey(`view-${docId}`);
    try {
      const blob = await fetchDocBlob(row);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toastError("Could not open document");
    } finally {
      setActionKey(null);
    }
  };

  const downloadDocument = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this document");
      return;
    }
    setActionKey(`download-${docId}`);
    try {
      const blob = await fetchDocBlob(row);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getFileName(row);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toastError("Could not download document");
    } finally {
      setActionKey(null);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Docs</strong>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError("")}>
                {error}
              </CAlert>
            )}

            <CRow className="mb-3">
              <CCol md={6} className="mb-2 mb-md-0">
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
              <Loader message="Loading documents..." />
            ) : (
              <>
                <div className="d-none d-md-block">
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Name</CTableHeaderCell>
                        <CTableHeaderCell>Type</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {documents.map((doc, index) => {
                        const docFileId =
                          doc?.documentId?._id || doc?.documentId;
                        const viewLoading =
                          actionKey === `view-${String(docFileId)}`;
                        const downloadLoading =
                          actionKey === `download-${String(docFileId)}`;
                        return (
                          <CTableRow key={getId(doc)}>
                            <CTableDataCell>
                              {(page - 1) * 10 + index + 1}
                            </CTableDataCell>
                            <CTableDataCell>
                              <strong>{doc.name || "-"}</strong>
                            </CTableDataCell>
                            <CTableDataCell>
                              {doc.doc_type || "-"}
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="d-flex gap-1">
                                <CButton
                                  color="primary"
                                  variant="ghost"
                                  size="sm"
                                  title="View"
                                  disabled={
                                    !docFileId || viewLoading || downloadLoading
                                  }
                                  onClick={() => viewDocument(doc)}
                                >
                                  <CIcon icon={cilMagnifyingGlass} />
                                </CButton>
                                <CButton
                                  color="primary"
                                  variant="ghost"
                                  size="sm"
                                  title="Download"
                                  disabled={
                                    !docFileId || viewLoading || downloadLoading
                                  }
                                  onClick={() => downloadDocument(doc)}
                                >
                                  <CIcon icon={cilCloudDownload} />
                                </CButton>
                              </div>
                            </CTableDataCell>
                          </CTableRow>
                        );
                      })}
                      {documents.length === 0 && (
                        <CTableRow>
                          <CTableDataCell colSpan={4} className="text-center">
                            No documents found.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                </div>

                <div className="d-md-none">
                  {documents.map((doc, index) => {
                    const docFileId = doc?.documentId?._id || doc?.documentId;
                    const viewLoading =
                      actionKey === `view-${String(docFileId)}`;
                    const downloadLoading =
                      actionKey === `download-${String(docFileId)}`;
                    return (
                      <CCard key={getId(doc)} className="mb-3 border">
                        <CCardBody className="d-flex justify-content-between align-items-start gap-2">
                          <div className="flex-grow-1">
                            <div className="small text-medium-emphasis mb-1">
                              #{(page - 1) * 10 + index + 1}
                            </div>
                            <div className="fw-semibold">{doc.name || "-"}</div>
                            <div className="small text-medium-emphasis">
                              {doc.doc_type || "-"}
                            </div>
                          </div>
                          <div className="d-flex gap-1">
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              title="View"
                              disabled={
                                !docFileId || viewLoading || downloadLoading
                              }
                              onClick={() => viewDocument(doc)}
                            >
                              <CIcon icon={cilMagnifyingGlass} />
                            </CButton>
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              title="Download"
                              disabled={
                                !docFileId || viewLoading || downloadLoading
                              }
                              onClick={() => downloadDocument(doc)}
                            >
                              <CIcon icon={cilCloudDownload} />
                            </CButton>
                          </div>
                        </CCardBody>
                      </CCard>
                    );
                  })}
                  {documents.length === 0 && (
                    <div className="text-center text-medium-emphasis py-3">
                      No documents found.
                    </div>
                  )}
                </div>

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
    </CRow>
  );
};

export default SidebarDocs;
