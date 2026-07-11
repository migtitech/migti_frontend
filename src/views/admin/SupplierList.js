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
  CFormSelect,
  CInputGroup,
  CInputGroupText,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilPencil, cilTrash, cilSearch } from "@coreui/icons";
import { EyeIcon } from "../../components";
import supplierService from "../../services/supplierService";
import categoryService from "../../services/categoryService";
import subcategoryService from "../../services/subcategoryService";
import areaService from "../../services/areaService";
import {
  ConfirmDialog,
  Loader,
  SearchableDropdown,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const SUPPLIER_FILTER_DEFAULTS = { category: "", subcategory: "", area: "" };

const SupplierList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "supplier_list",
    SUPPLIER_FILTER_DEFAULTS,
  );
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const [filterCategory, setFilterCategory] = useState(initialValues.category);
  const [filterSubcategory, setFilterSubcategory] = useState(
    initialValues.subcategory,
  );
  const [filterArea, setFilterArea] = useState(initialValues.area);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [areas, setAreas] = useState([]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm || undefined,
      };
      if (filterSubcategory) {
        params.subcategory = filterSubcategory;
      } else if (filterCategory) {
        params.category = filterCategory;
      }
      if (filterArea) {
        const areaObj = areas.find((a) => (a._id || a.id) === filterArea);
        if (areaObj?.name) params.area = areaObj.name;
      }
      const res = await withMinimumDelay(() => supplierService.getAll(params));
      const data = res?.data || res;
      setSuppliers(data?.suppliers || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterCategory, filterSubcategory, filterArea, areas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  useFilterLockPersist("supplier_list", filtersLocked, {
    category: filterCategory,
    subcategory: filterSubcategory,
    area: filterArea,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      category: filterCategory,
      subcategory: filterSubcategory,
      area: filterArea,
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await categoryService.getAll({ parent: "", pageSize: 100 });
        const data = res?.data || res;
        if (!cancelled) setCategories(data?.categories || []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 });
        const data = res?.data || res;
        if (!cancelled) setAreas(data?.areas || []);
      } catch {
        if (!cancelled) setAreas([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filterCategory) {
      setSubcategories([]);
      setFilterSubcategory("");
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await subcategoryService.getAllSubcategories({
          category: filterCategory,
        });
        const data = res?.data || res;
        const inner = data?.data ?? data;
        if (!cancelled) setSubcategories(inner?.subcategories || []);
        if (!cancelled) setFilterSubcategory("");
      } catch {
        if (!cancelled) setSubcategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filterCategory]);

  const handleFilterCategoryChange = (val) => {
    setFilterCategory(val || "");
    setPage(1);
  };

  const handleFilterSubcategoryChange = (val) => {
    setFilterSubcategory(val || "");
    setPage(1);
  };

  const handleFilterAreaChange = (val) => {
    setFilterArea(val || "");
    setPage(1);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await supplierService.delete(id);
      toastSuccess("Supplier deleted successfully");
      fetchSuppliers();
    } catch (err) {
      toastError(err?.message || "Failed to delete supplier");
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Suppliers</strong>
            {canCreate("suppliers") && (
              <CButton
                color="primary"
                onClick={() => navigate("/suppliers/new")}
              >
                <CIcon icon={cilPlus} className="me-2" />
                Add Supplier
              </CButton>
            )}
          </CCardHeader>
          <CCardBody style={{ overflow: "visible" }}>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError("")}>
                {error}
              </CAlert>
            )}
            <CRow
              className="mb-3 g-2 align-items-end suppliers-filter-row"
              style={{ position: "relative", zIndex: 10, overflow: "visible" }}
            >
              <CCol
                xs={12}
                sm={6}
                md={4}
                lg={4}
                style={{ overflow: "visible", minWidth: 0 }}
              >
                <label className="form-label small text-body-secondary mb-1">
                  Search
                </label>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    type="text"
                    placeholder="Search ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CInputGroup>
              </CCol>
              <CCol
                xs={12}
                sm={6}
                md={2}
                lg={2}
                style={{ overflow: "visible" }}
              >
                <SearchableDropdown
                  label="Category"
                  options={categories}
                  value={filterCategory}
                  onChange={handleFilterCategoryChange}
                  placeholder="Select category"
                  maxDisplayCount={5}
                  getOptionLabel={(opt) => opt?.name ?? ""}
                  getOptionValue={(opt) => opt?._id ?? opt?.id ?? ""}
                />
              </CCol>
              <CCol
                xs={12}
                sm={6}
                md={2}
                lg={2}
                style={{ overflow: "visible" }}
              >
                <SearchableDropdown
                  label="Subcategory"
                  options={subcategories}
                  value={filterSubcategory}
                  onChange={handleFilterSubcategoryChange}
                  placeholder="Select subcategory"
                  maxDisplayCount={5}
                  getOptionLabel={(opt) => opt?.name ?? ""}
                  getOptionValue={(opt) => opt?._id ?? opt?.id ?? ""}
                  disabled={!filterCategory}
                />
              </CCol>
              <CCol
                xs={12}
                sm={6}
                md={2}
                lg={2}
                style={{ overflow: "visible" }}
              >
                <SearchableDropdown
                  label="Zone"
                  options={areas}
                  value={filterArea}
                  onChange={handleFilterAreaChange}
                  placeholder="Select zone"
                  maxDisplayCount={5}
                  getOptionLabel={(opt) => opt?.name ?? ""}
                  getOptionValue={(opt) => opt?._id ?? opt?.id ?? ""}
                />
              </CCol>
              <CCol
                xs={12}
                sm={6}
                md={2}
                lg={2}
                className="d-flex align-items-end"
              >
                <FilterLockButton
                  filtersLocked={filtersLocked}
                  onToggle={handleToggleFiltersLock}
                  pageLabel="Suppliers"
                />
              </CCol>
            </CRow>
            {loading ? (
              <Loader message="Loading suppliers..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>SNo</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Shop Name</CTableHeaderCell>
                      <CTableHeaderCell>Phone 1</CTableHeaderCell>
                      <CTableHeaderCell>Email</CTableHeaderCell>
                      <CTableHeaderCell>Other Contact</CTableHeaderCell>
                      <CTableHeaderCell>Label</CTableHeaderCell>
                      <CTableHeaderCell>GST</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {suppliers.map((supplier, index) => (
                      <CTableRow
                        key={supplier._id}
                        onClick={() => navigate(`/suppliers/${supplier._id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <CTableDataCell>
                          {(page - 1) * 10 + index + 1}
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>{supplier.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {supplier.shopname || "-"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {supplier.phone_1 || "-"}
                        </CTableDataCell>
                        <CTableDataCell>{supplier.email || "-"}</CTableDataCell>
                        <CTableDataCell>
                          {supplier.other_contact || "-"}
                        </CTableDataCell>
                        <CTableDataCell>{supplier.label || "-"}</CTableDataCell>
                        <CTableDataCell>{supplier.gst || "-"}</CTableDataCell>
                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/suppliers/${supplier._id}`);
                            }}
                            title="View"
                          >
                            <EyeIcon />
                          </CButton>
                          {canUpdate("suppliers") && (
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/suppliers/edit/${supplier._id}`);
                              }}
                              title="Edit"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          )}
                          {canDelete("suppliers") && (
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(supplier._id);
                              }}
                              title="Delete"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {suppliers.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center">
                          {searchTerm ||
                          filterCategory ||
                          filterSubcategory ||
                          filterArea
                            ? "No suppliers match the current search or filters."
                            : 'No suppliers found. Click "Add Supplier" to create one.'}
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
        title="Delete Supplier?"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  );
};

export default SupplierList;
