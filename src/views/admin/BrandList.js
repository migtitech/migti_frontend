import React, { useState, useEffect } from "react";
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
  CAvatar,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilPencil, cilTrash } from "@coreui/icons";
import brandService from "../../services/brandService";
import Filtered from "../../filtered/Filtered";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, Loader, TablePagination } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const getBrandAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const getBrandIconSrc = (brand) =>
  brand?.iconDisplayUrl || brand?.iconUrl || undefined;

const BrandList = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  const fetchBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        brandService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        }),
      );
      const data = res?.data || res;
      setBrands(data?.brands || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchBrands, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await brandService.delete(id);
      toastSuccess("Brand deleted successfully");
      fetchBrands();
    } catch (err) {
      toastError(err?.message || "Failed to delete brand");
    }
  };

  const getStatusBadge = (status) =>
    status === "active" ? (
      <CBadge color="success">Active</CBadge>
    ) : (
      <CBadge color="secondary">Inactive</CBadge>
    );

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Brands</strong>
            {canCreate("brands") && (
              <CButton color="primary" onClick={() => navigate("/brands/new")}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Brand
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
              <CCol xs={12} sm={6} md={4}>
                <Filtered
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
              </CCol>
            </CRow>

            {loading ? (
              <Loader message="Loading brands..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>

                  <CTableBody>
                    {brands.map((brand, index) => {
                      const iconSrc = getBrandIconSrc(brand);
                      return (
                        <CTableRow
                          key={brand._id}
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/brands/edit/${brand._id}`)}
                        >
                          <CTableDataCell>
                            {(page - 1) * 10 + index + 1}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex align-items-center">
                              <CAvatar
                                src={iconSrc}
                                color={iconSrc ? undefined : "primary"}
                                textColor={iconSrc ? undefined : "white"}
                                size="md"
                                shape="rounded-circle"
                                className={`me-3 flex-shrink-0${iconSrc ? " bg-transparent" : ""}`}
                              >
                                {getBrandAvatarLabel(brand.name)}
                              </CAvatar>
                              <strong>{brand.name}</strong>
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            {getStatusBadge(brand.status)}
                          </CTableDataCell>

                          <CTableDataCell onClick={(e) => e.stopPropagation()}>
                            {canUpdate("brands") && (
                              <CButton
                                size="sm"
                                color="warning"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/brands/edit/${brand._id}`);
                                }}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                            )}

                            {canDelete("brands") && (
                              <CButton
                                size="sm"
                                color="danger"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(brand._id);
                                }}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}

                    {brands.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={4} className="text-center">
                          No brands found
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>

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
        title="Delete Brand?"
        message="Are you sure you want to delete this brand? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  );
};

export default BrandList;
