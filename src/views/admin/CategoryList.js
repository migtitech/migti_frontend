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
  CAlert,
  CFormSwitch,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilPencil, cilTrash } from "@coreui/icons";
import { EyeIcon } from "../../components";
import { useNavigate } from "react-router-dom";
import categoryService from "../../services/categoryService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  Loader,
  TablePagination,
  StatusLabel,
} from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions, { isHodRole } from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";

const StackedNameCode = ({ name, code, bold = false }) => (
  <div>
    {bold ? <strong>{name || "—"}</strong> : <span>{name || "—"}</span>}
    <div>
      <code className="text-primary">{code || "—"}</code>
    </div>
  </div>
);

const CategoryList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const canToggleStatus = isHodRole(user?.role);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        categoryService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
          parent: "null",
        }),
      );
      const data = res?.data || res;
      const inner = data?.data ?? data;
      setCategories(inner?.categories || []);
      setPagination(inner?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await categoryService.delete(id);
      toastSuccess("Category deleted successfully");
      fetchCategories();
    } catch (err) {
      toastError(err?.message || "Failed to delete category");
    }
  };

  const handleStatusToggle = async (category, checked) => {
    if (!canToggleStatus) return;

    const newStatus = checked ? "active" : "inactive";
    if (category.status === newStatus) return;

    const previousStatus = category.status;
    setTogglingId(category._id);
    setCategories((prev) =>
      prev.map((item) =>
        item._id === category._id ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      await categoryService.update(category._id, { status: newStatus });
      toastSuccess(
        `Category ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      setCategories((prev) =>
        prev.map((item) =>
          item._id === category._id
            ? { ...item, status: previousStatus }
            : item,
        ),
      );
      toastError(err?.message || "Failed to update category status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Categories</strong>
            {canCreate("categories") && (
              <CButton
                color="primary"
                onClick={() => navigate("/categories/new")}
              >
                <CIcon icon={cilPlus} className="me-2" />
                Add Category
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
              <Loader message="Loading categories..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Group</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">
                        Status
                      </CTableHeaderCell>
                      <CTableHeaderCell className="text-center">
                        Actions
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {categories.map((cat, index) => (
                      <CTableRow
                        key={cat._id}
                        onClick={() => navigate(`/categories/${cat._id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <CTableDataCell>
                          {(page - 1) * 10 + index + 1}
                        </CTableDataCell>
                        <CTableDataCell>
                          <StackedNameCode
                            name={cat.name}
                            code={cat.categoryCode}
                            bold
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <StackedNameCode
                            name={
                              typeof cat.group === "object"
                                ? cat.group?.name
                                : null
                            }
                            code={
                              typeof cat.group === "object"
                                ? cat.group?.code
                                : null
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <CFormSwitch
                              checked={cat.status === "active"}
                              disabled={
                                !canToggleStatus || togglingId === cat._id
                              }
                              onChange={(event) =>
                                handleStatusToggle(cat, event.target.checked)
                              }
                              aria-label={`Toggle status for ${cat.name}`}
                            />
                            <StatusLabel status={cat.status} />
                          </div>
                        </CTableDataCell>
                        <CTableDataCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="d-flex justify-content-center">
                            <CButton
                              color="info"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/categories/${cat._id}`);
                              }}
                              title="View"
                            >
                              <EyeIcon />
                            </CButton>
                            {canUpdate("categories") && (
                              <CButton
                                color="warning"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/categories/edit/${cat._id}`);
                                }}
                                title="Edit"
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                            )}
                            {canDelete("categories") && (
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(cat._id);
                                }}
                                title="Delete"
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            )}
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {categories.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={5} className="text-center">
                          {searchTerm
                            ? `No categories found matching "${searchTerm}"`
                            : 'No categories found. Click "Add Category" to create one.'}
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
        title="Delete Category?"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  );
};

export default CategoryList;
