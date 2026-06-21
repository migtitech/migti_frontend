import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCloudDownload, cilMagnifyingGlass } from "@coreui/icons";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import companyDocumentService from "../../services/companyDocumentService";
import groupService from "../../services/groupService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { buildCatalogSections } from "../../utils/companyCatalogUtils";
import { toastError } from "../../utils/toast";

const getId = (row) => row?._id || row?.id;

const getFileName = (row) =>
  row?.documentId?.originalName || row?.name || "document";

const SidebarDocs = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionKey, setActionKey] = useState(null);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catalogRes, groupRes] = await withMinimumDelay(() =>
        Promise.all([
          companyDocumentService.list({
            pageNumber: 1,
            pageSize: 100,
            doc_type: "Catalog",
            search: searchTerm || undefined,
          }),
          groupService.getAll({ pageNumber: 1, pageSize: 100 }),
        ]),
      );
      const catalogData =
        catalogRes?.data?.data || catalogRes?.data || catalogRes;
      const groupData = groupRes?.data?.data || groupRes?.data || groupRes;
      setCatalogs(catalogData?.companyDocuments || []);
      setGroups(groupData?.groups || []);
    } catch (err) {
      setError(err?.message || "Failed to load company catalogs");
      setCatalogs([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCatalogData]);

  const catalogSections = useMemo(
    () => buildCatalogSections(catalogs, groups),
    [catalogs, groups],
  );

  const fetchDocBlob = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this catalog");
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
      toastError("No file attached to this catalog");
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
      toastError("Could not open catalog");
    } finally {
      setActionKey(null);
    }
  };

  const downloadDocument = async (row) => {
    const docId = row?.documentId?._id || row?.documentId;
    if (!docId) {
      toastError("No file attached to this catalog");
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
      toastError("Could not download catalog");
    } finally {
      setActionKey(null);
    }
  };

  const renderCatalogActions = (catalog) => {
    const docFileId = catalog?.documentId?._id || catalog?.documentId;
    const viewLoading = actionKey === `view-${String(docFileId)}`;
    const downloadLoading = actionKey === `download-${String(docFileId)}`;

    return (
      <div className="d-flex gap-1">
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          title="View"
          disabled={!docFileId || viewLoading || downloadLoading}
          onClick={() => viewDocument(catalog)}
        >
          <CIcon icon={cilMagnifyingGlass} />
        </CButton>
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          title="Download"
          disabled={!docFileId || viewLoading || downloadLoading}
          onClick={() => downloadDocument(catalog)}
        >
          <CIcon icon={cilCloudDownload} />
        </CButton>
      </div>
    );
  };

  const renderCatalogTable = (sectionCatalogs) => (
    <>
      <div className="d-none d-md-block">
        <CTable hover responsive bordered className="mb-0">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>S No</CTableHeaderCell>
              <CTableHeaderCell>Name</CTableHeaderCell>
              <CTableHeaderCell>Remark</CTableHeaderCell>
              <CTableHeaderCell>Actions</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {sectionCatalogs.map((catalog, index) => (
              <CTableRow key={getId(catalog)}>
                <CTableDataCell>{index + 1}</CTableDataCell>
                <CTableDataCell>
                  <strong>{catalog.name || "-"}</strong>
                </CTableDataCell>
                <CTableDataCell>{catalog.remark || "-"}</CTableDataCell>
                <CTableDataCell>{renderCatalogActions(catalog)}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </div>

      <div className="d-md-none">
        {sectionCatalogs.map((catalog, index) => (
          <CCard key={getId(catalog)} className="mb-3 border">
            <CCardBody className="d-flex justify-content-between align-items-start gap-2">
              <div className="flex-grow-1">
                <div className="small text-medium-emphasis mb-1">
                  #{index + 1}
                </div>
                <div className="fw-semibold">{catalog.name || "-"}</div>
                <div className="small text-medium-emphasis">
                  {catalog.remark || "-"}
                </div>
              </div>
              {renderCatalogActions(catalog)}
            </CCardBody>
          </CCard>
        ))}
      </div>
    </>
  );

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Company Catalog</strong>
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
                  placeholder="Search catalog by name or remark..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CCol>
            </CRow>

            {loading ? (
              <Loader message="Loading company catalogs..." />
            ) : catalogSections.length === 0 ? (
              <div className="text-center text-medium-emphasis py-3">
                No catalogs found.
              </div>
            ) : (
              catalogSections.map((section) => (
                <CCard key={section.key} className="mb-3 border">
                  <CCardHeader className="py-2">
                    <strong>{section.title}</strong>
                  </CCardHeader>
                  <CCardBody>
                    {section.catalogs.length === 0 ? (
                      <div className="text-medium-emphasis">
                        No catalog uploaded for this group yet.
                      </div>
                    ) : (
                      renderCatalogTable(section.catalogs)
                    )}
                  </CCardBody>
                </CCard>
              ))
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default SidebarDocs;
