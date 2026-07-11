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
  CAvatar,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilPencil, cilTrash } from "@coreui/icons";
import { useNavigate } from "react-router-dom";
import subcategoryService from "../../services/subcategoryService";
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

const getSubcategoryAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const getSubcategoryImageSrc = (subcategory) =>
  subcategory?.imageDisplayUrl || subcategory?.image || undefined;

const SubcategoryList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const canToggleStatus = isHodRole(user?.role);
  const [subcategories, setSubcategories] = useState([]);
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

  const fetchSubcategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        subcategoryService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        }),
      );
      const data = res?.data || res;
      const inner = data?.data ?? data;
      setSubcategories(inner?.subcategories || []);
      setPagination(inner?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to fetch subcategories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubcategories();
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
      await subcategoryService.delete(id);
      toastSuccess("Subcategory deleted successfully");
      fetchSubcategories();
    } catch (err) {
      toastError(err?.message || "Failed to delete subcategory");
    }
  };

  const handleStatusToggle = async (subcategory, checked) => {
    if (!canToggleStatus) return;

    const newStatus = checked ? "active" : "inactive";
    if (subcategory.status === newStatus) return;

    const previousStatus = subcategory.status;
    setTogglingId(subcategory._id);
    setSubcategories((prev) =>
      prev.map((item) =>
        item._id === subcategory._id ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      await subcategoryService.update(subcategory._id, { status: newStatus });
      toastSuccess(
        `Subcategory ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      setSubcategories((prev) =>
        prev.map((item) =>
          item._id === subcategory._id
            ? { ...item, status: previousStatus }
            : item,
        ),
      );
      toastError(err?.message || "Failed to update subcategory status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Subcategories</strong>
            {canCreate("subcategories") && (
              <CButton
                color="primary"
                onClick={() => navigate("/subcategories/new")}
              >
                <CIcon icon={cilPlus} className="me-2" />
                Add Subcategory
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
              <Loader message="Loading subcategories..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Category</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">
                        Status
                      </CTableHeaderCell>
                      <CTableHeaderCell className="text-center">
                        Actions
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {subcategories.map((sub, index) => {
                      const imageSrc = getSubcategoryImageSrc(sub);
                      return (
                        <CTableRow key={sub._id}>
                          <CTableDataCell>
                            {(page - 1) * 10 + index + 1}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex align-items-center">
                              <CAvatar
                                src={imageSrc}
                                color={imageSrc ? undefined : "primary"}
                                textColor={imageSrc ? undefined : "white"}
                                size="md"
                                shape="rounded-circle"
                                className={`me-3 flex-shrink-0${imageSrc ? " bg-transparent" : ""}`}
                              >
                                {getSubcategoryAvatarLabel(sub.name)}
                              </CAvatar>
                              <StackedNameCode
                                name={sub.name}
                                code={sub.subcategoryCode}
                                bold
                              />
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <StackedNameCode
                              name={
                                typeof sub.category === "object"
                                  ? sub.category?.name
                                  : null
                              }
                              code={
                                typeof sub.category === "object"
                                  ? sub.category?.categoryCode
                                  : null
                              }
                            />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                              <CFormSwitch
                                checked={sub.status === "active"}
                                disabled={
                                  !canToggleStatus || togglingId === sub._id
                                }
                                onChange={(event) =>
                                  handleStatusToggle(sub, event.target.checked)
                                }
                                aria-label={`Toggle status for ${sub.name}`}
                              />
                              <StatusLabel status={sub.status} />
                            </div>
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <div className="d-flex justify-content-center">
                              {canUpdate("subcategories") && (
                                <CButton
                                  color="warning"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/subcategories/edit/${sub._id}`)
                                  }
                                  title="Edit"
                                >
                                  <CIcon icon={cilPencil} />
                                </CButton>
                              )}
                              {canDelete("subcategories") && (
                                <CButton
                                  color="danger"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(sub._id)}
                                  title="Delete"
                                >
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              )}
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}
                    {subcategories.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={5} className="text-center">
                          {searchTerm
                            ? `No subcategories found matching "${searchTerm}"`
                            : 'No subcategories found. Click "Add Subcategory" to create one.'}
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
        title="Delete Subcategory?"
        message="Are you sure you want to delete this subcategory? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  );
};

export default SubcategoryList;
