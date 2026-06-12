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
  CPagination,
  CPaginationItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilChevronBottom,
  cilChevronRight,
} from "@coreui/icons";
import { EyeIcon } from "../../components";
import { useNavigate } from "react-router-dom";
import categoryService from "../../services/categoryService";
import Filtered from "../../filtered/Filtered";
import { Loader, ConfirmDialog } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const CategoryList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [subcategories, setSubcategories] = useState({});
  const [rootCategories, setRootCategories] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
    parentId: null,
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

  const toggleExpand = async (categoryId) => {
    if (expandedCategories[categoryId]) {
      setExpandedCategories((prev) => ({ ...prev, [categoryId]: false }));
      return;
    }
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
        parent: categoryId,
      });
      const data = res?.data || res;
      const list = data?.data?.categories ?? data?.categories ?? [];
      setSubcategories((prev) => ({ ...prev, [categoryId]: list }));
      setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
    } catch (err) {
      console.error("Failed to fetch subcategories", err);
    }
  };

  const handleDeleteClick = (id, parentId = null) => {
    setConfirmDelete({ visible: true, id, parentId });
  };

  const handleDeleteConfirm = async () => {
    const { id, parentId } = confirmDelete;
    setConfirmDelete({ visible: false, id: null, parentId: null });
    if (!id) return;
    try {
      await categoryService.delete(id);
      toastSuccess("Category deleted successfully");
      fetchCategories();
      if (parentId) {
        const res = await categoryService.getAll({
          pageNumber: 1,
          pageSize: 100,
          parent: parentId,
        });
        const data = res?.data || res;
        const list = data?.data?.categories ?? data?.categories ?? [];
        setSubcategories((prev) => ({ ...prev, [parentId]: list }));
      }
    } catch (err) {
      toastError(err?.message || "Failed to delete category");
    }
  };

  const getStatusBadge = (status) => {
    return status === "active" ? (
      <CBadge color="success">Active</CBadge>
    ) : (
      <CBadge color="secondary">Inactive</CBadge>
    );
  };

  const renderPageNumbers = () => {
    const totalPages = pagination.totalPages || 0;
    const currentPage = page;

    if (!totalPages) return null;

    const items = [];

    const createPageItem = (pageNumber, label) => (
      <CPaginationItem
        key={label}
        active={pageNumber === currentPage}
        disabled={!pageNumber}
        onClick={
          pageNumber
            ? () => {
                if (pageNumber !== currentPage) {
                  setPage(pageNumber);
                }
              }
            : undefined
        }
      >
        {label}
      </CPaginationItem>
    );

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) {
        items.push(createPageItem(i, i));
      }
      return items;
    }

    items.push(createPageItem(1, 1));

    const showLeftEllipsis = currentPage > 3;
    const showRightEllipsis = currentPage < totalPages - 2;

    if (showLeftEllipsis) {
      items.push(createPageItem(null, "..."));
    }

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i += 1) {
      items.push(createPageItem(i, i));
    }

    if (showRightEllipsis) {
      items.push(createPageItem(null, "..."));
    }

    items.push(createPageItem(totalPages, totalPages));

    return items;
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
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            {loading ? (
              <Loader message="Loading categories..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell
                        style={{ width: 40 }}
                      ></CTableHeaderCell>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Code</CTableHeaderCell>
                      <CTableHeaderCell>Group</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Description</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {categories.map((cat, index) => (
                      <React.Fragment key={cat._id}>
                        <CTableRow
                          onClick={() => navigate(`/categories/${cat._id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <CTableDataCell onClick={(e) => e.stopPropagation()}>
                            <CButton
                              color="light"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(cat._id);
                              }}
                            >
                              <CIcon
                                icon={
                                  expandedCategories[cat._id]
                                    ? cilChevronBottom
                                    : cilChevronRight
                                }
                                size="sm"
                              />
                            </CButton>
                          </CTableDataCell>
                          <CTableDataCell>
                            {(page - 1) * 10 + index + 1}
                          </CTableDataCell>
                          <CTableDataCell>
                            <code>{cat.categoryCode || "—"}</code>
                          </CTableDataCell>
                          <CTableDataCell>
                            {typeof cat.group === "object"
                              ? cat.group?.name || "—"
                              : "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            <strong>{cat.name}</strong>
                          </CTableDataCell>
                          <CTableDataCell>
                            {cat.description?.substring(0, 50) || "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {getStatusBadge(cat.status)}
                          </CTableDataCell>
                          <CTableDataCell onClick={(e) => e.stopPropagation()}>
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
                            {canCreate("categories") && (
                              <CButton
                                color="success"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/categories/new?parent=${cat._id}`);
                                }}
                                title="Add Subcategory"
                              >
                                <CIcon icon={cilPlus} />
                              </CButton>
                            )}
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
                          </CTableDataCell>
                        </CTableRow>
                        {expandedCategories[cat._id] &&
                          subcategories[cat._id]?.map((sub) => (
                            <CTableRow
                              key={sub._id}
                              className="table-light"
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate(`/categories/${sub._id}`)}
                            >
                              <CTableDataCell></CTableDataCell>
                              <CTableDataCell></CTableDataCell>
                              <CTableDataCell>
                                <code>{sub.categoryCode || "—"}</code>
                              </CTableDataCell>
                              <CTableDataCell>
                                {typeof sub.group === "object"
                                  ? sub.group?.name || "—"
                                  : "—"}
                              </CTableDataCell>
                              <CTableDataCell className="ps-4">
                                &#8627; {sub.name ?? sub.categoryName ?? "—"}
                              </CTableDataCell>
                              <CTableDataCell>
                                {sub.description?.substring(0, 50) || "-"}
                              </CTableDataCell>
                              <CTableDataCell>
                                {getStatusBadge(sub.status)}
                              </CTableDataCell>
                              <CTableDataCell
                                onClick={(e) => e.stopPropagation()}
                              >
                                <CButton
                                  color="info"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/categories/${sub._id}`);
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
                                      navigate(`/categories/edit/${sub._id}`);
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
                                      handleDeleteClick(sub._id, cat._id);
                                    }}
                                    title="Delete"
                                  >
                                    <CIcon icon={cilTrash} />
                                  </CButton>
                                )}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                      </React.Fragment>
                    ))}
                    {categories.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center">
                          {searchTerm
                            ? `No categories found matching "${searchTerm}"`
                            : 'No categories found. Click "Add Category" to create one.'}
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
                        onClick={() => {
                          if (pagination.hasPrevPage) {
                            setPage(page - 1);
                          }
                        }}
                      >
                        Previous
                      </CPaginationItem>
                      {renderPageNumbers()}
                      <CPaginationItem
                        disabled={!pagination.hasNextPage}
                        onClick={() => {
                          if (pagination.hasNextPage) {
                            setPage(page + 1);
                          }
                        }}
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

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() =>
          setConfirmDelete({ visible: false, id: null, parentId: null })
        }
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
