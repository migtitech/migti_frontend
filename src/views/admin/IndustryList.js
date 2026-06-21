import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  CAlert,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CFormSelect,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilPencil, cilTrash, cilSearch } from "@coreui/icons";
import { EyeIcon } from "../../components";
import industryService from "../../services/industryService";
import areaService from "../../services/areaService";
import {
  buildAreaNameLookup,
  formatAreaDisplayOrDash,
} from "../../utils/areaDisplay";
import {
  ConfirmDialog,
  Loader,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";

const INDUSTRY_FILTER_DEFAULTS = { areaId: "" };

const IndustryList = () => {
  const MOBILE_BREAKPOINT = 576;
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "industry_list",
    INDUSTRY_FILTER_DEFAULTS,
  );
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(initialValues.areaId);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchAreas = async () => {
      try {
        const allAreas = [];
        let pageNumber = 1;
        let hasNextPage = true;
        while (hasNextPage) {
          const res = await areaService.getAll({ pageNumber, pageSize: 100 });
          const data = res?.data || res;
          const payload = data || {};
          const pageAreas = payload?.areas || [];
          const pagePagination = payload?.pagination || {};
          allAreas.push(...pageAreas);
          hasNextPage = Boolean(pagePagination?.hasNextPage);
          pageNumber += 1;
        }
        if (cancelled) return;
        setAreas(allAreas);
      } catch {
        if (cancelled) return;
        setAreas([]);
      }
    };
    fetchAreas();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchIndustries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm || undefined,
        areaIds: selectedAreaId || undefined,
      };
      if (isSalesRole) {
        const storedUser = JSON.parse(
          localStorage.getItem("migticrm_user") || "{}",
        );
        const userZoneIds = storedUser?.zoneIds;
        if (Array.isArray(userZoneIds) && userZoneIds.length) {
          params.zoneIds = userZoneIds.join(",");
        } else if (typeof userZoneIds === "string" && userZoneIds) {
          params.zoneIds = userZoneIds;
        }
      }
      const res = await withMinimumDelay(() => industryService.getAll(params));
      const data = res?.data || res;
      setIndustries(data?.industries || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to fetch industries");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedAreaId, isSalesRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIndustries();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchIndustries]);

  useFilterLockPersist("industry_list", filtersLocked, {
    areaId: selectedAreaId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ areaId: selectedAreaId });
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (event) => setIsMobileView(event.matches);
    setIsMobileView(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }
    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await industryService.delete(id);
      toastSuccess("Client deleted successfully");
      fetchIndustries();
    } catch (err) {
      toastError(err?.message || "Failed to delete client");
    }
  };

  const areaNameLookup = buildAreaNameLookup(areas);

  const getZoneLabel = (industry) =>
    formatAreaDisplayOrDash(industry?.area, areaNameLookup);

  const getPurchaseManagerLabel = (industry) => {
    const pms = industry.purchaseManagers || [];
    if (pms.length > 0) {
      const first = pms[0];
      const name = first.name || "";
      const phone = first.phone || "";
      if (name && phone) return `${name} - ${phone}`;
      if (name) return name;
      if (phone) return phone;
      return "-";
    }
    if (industry.purchase_manager_name || industry.purchase_manager_phone) {
      const name = industry.purchase_manager_name || "";
      const phone = industry.purchase_manager_phone || "";
      if (name && phone) return `${name} - ${phone}`;
      if (name) return name;
      if (phone) return phone;
    }
    return "-";
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Clients</strong>
            {canCreate("industries") && (
              <CButton
                color="primary"
                onClick={() => navigate("/industries/new")}
              >
                <CIcon icon={cilPlus} className="me-2" />
                Add client
              </CButton>
            )}
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError("")}>
                {error}
              </CAlert>
            )}
            <CRow className="mb-3 align-items-end">
              <CCol md={6}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    type="text"
                    placeholder="Search industries..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                  />
                </CInputGroup>
              </CCol>
              {!isSalesRole && (
                <CCol md={2}>
                  <CFormLabel className="small text-muted">Zones</CFormLabel>
                  <CFormSelect
                    value={selectedAreaId}
                    onChange={(e) => {
                      setSelectedAreaId(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Zones</option>
                    {areas.map((a) => {
                      const id = String(a._id || a.id);
                      return (
                        <option key={id} value={id}>
                          {a.name}
                          {a.city ? ` - ${a.city}` : ""}
                        </option>
                      );
                    })}
                  </CFormSelect>
                </CCol>
              )}
              {!isSalesRole && (
                <CCol md={2} className="d-flex align-items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Industries"
                  />
                </CCol>
              )}
            </CRow>
            {loading ? (
              <Loader message="Loading industries..." />
            ) : (
              <>
                {isMobileView ? (
                  <>
                    {industries.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        {searchTerm
                          ? "No clients match the current search."
                          : 'No clients found. Click "Add client" to create one.'}
                      </div>
                    ) : (
                      industries.map((industry, index) => (
                        <CCard
                          key={industry._id}
                          className="mb-3 shadow-sm"
                          onClick={() =>
                            navigate(`/industries/${industry._id}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <CCardBody>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <div className="small text-muted">
                                  #{(page - 1) * 10 + index + 1}
                                </div>
                                <h6 className="mb-0">{industry.name || "-"}</h6>
                              </div>
                            </div>
                            <div className="small">
                              <div className="mb-1">
                                <strong>GST No:</strong>{" "}
                                {industry.gstNumber || "-"}
                              </div>
                              <div className="mb-1">
                                <strong>Zone:</strong> {getZoneLabel(industry)}
                              </div>
                              <div className="mb-1">
                                <strong>Purchase Manager:</strong>{" "}
                                {getPurchaseManagerLabel(industry)}
                              </div>
                            </div>
                            <div className="mt-3 d-flex gap-2">
                              <CButton
                                color="info"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/industries/${industry._id}`);
                                }}
                                title="View"
                              >
                                <EyeIcon />
                              </CButton>
                              {canUpdate("industries") && (
                                <CButton
                                  color="warning"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/industries/edit/${industry._id}`,
                                    );
                                  }}
                                  title="Edit"
                                >
                                  <CIcon icon={cilPencil} />
                                </CButton>
                              )}
                              {canDelete("industries") && (
                                <CButton
                                  color="danger"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(industry._id);
                                  }}
                                  title="Delete"
                                >
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              )}
                            </div>
                          </CCardBody>
                        </CCard>
                      ))
                    )}
                  </>
                ) : (
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Client name</CTableHeaderCell>
                        <CTableHeaderCell>GST No</CTableHeaderCell>
                        <CTableHeaderCell>Zone</CTableHeaderCell>
                        <CTableHeaderCell>Purchase Manager</CTableHeaderCell>
                        <CTableHeaderCell>Shipping address</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {industries.map((industry, index) => (
                        <CTableRow
                          key={industry._id}
                          onClick={() =>
                            navigate(`/industries/${industry._id}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <CTableDataCell>
                            {(page - 1) * 10 + index + 1}
                          </CTableDataCell>
                          <CTableDataCell>
                            <strong>{industry.name}</strong>
                          </CTableDataCell>
                          <CTableDataCell>
                            {industry.gstNumber || "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {getZoneLabel(industry)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {getPurchaseManagerLabel(industry)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {industry.shippingAddress ||
                              industry.address ||
                              "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="info"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/industries/${industry._id}`);
                              }}
                              title="View"
                            >
                              <EyeIcon />
                            </CButton>
                            {canUpdate("industries") && (
                              <CButton
                                color="warning"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/industries/edit/${industry._id}`);
                                }}
                                title="Edit"
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                            )}
                            {canDelete("industries") && (
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(industry._id);
                                }}
                                title="Delete"
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                      {industries.length === 0 && (
                        <CTableRow>
                          <CTableDataCell colSpan={8} className="text-center">
                            {searchTerm
                              ? "No clients match the current search."
                              : 'No clients found. Click "Add client" to create one.'}
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                )}
                <TablePagination
                  currentPage={pagination?.currentPage ?? 1}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  showRange
                  totalItems={pagination?.totalItems ?? 0}
                  itemsPerPage={pagination?.itemsPerPage ?? 10}
                />
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete client?"
        message="Are you sure you want to delete this client? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  );
};

export default IndustryList;
