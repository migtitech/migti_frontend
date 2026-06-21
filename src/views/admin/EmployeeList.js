import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CCol,
  CRow,
  CFormSelect,
  CFormInput,
  CInputGroup,
  CInputGroupText,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSearch } from "@coreui/icons";
import employeeService from "../../services/employeeService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { ConfirmDialog, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import EmployeeHeader from "./employees/EmployeeHeader";
import EmployeeTable from "./employees/EmployeeTable";
import usePermissions from "../../hooks/usePermissions";
import { ROLE_LABELS } from "../../context/AuthContext";

const EMPLOYEE_FILTER_DEFAULTS = { role: "" };

const EMPLOYEE_ROLE_OPTIONS = [
  "head_of_department",
  "sales_manager",
  "sales_exicutive",
  "purchase_exicutive",
  "procurement",
  "localprocurement",
  "localpurchase",
  "back_office_exicutive",
  "administrator",
  "finance",
  "inventry_manager",
  "dispatch_manager",
];

const EmployeeList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "employee_list",
    EMPLOYEE_FILTER_DEFAULTS,
  );
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialValues.role);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  });

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchTerm.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useFilterLockPersist("employee_list", filtersLocked, { role: roleFilter });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ role: roleFilter });
  };

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber: page,
        pageSize,
      };
      if (searchDebounced) params.search = searchDebounced;
      if (roleFilter) params.role = roleFilter;

      const response = await withMinimumDelay(() =>
        employeeService.getAll(params),
      );
      const payload = response?.data ?? response;
      const list =
        payload?.employees || (Array.isArray(payload) ? payload : []);
      const pag = payload?.pagination || {};
      setPagination(pag);
      setEmployees(list.map(normalizeId));

      const totalPages = pag?.totalPages ?? 1;
      const totalItems = pag?.totalItems ?? 0;
      if (list.length === 0 && totalItems > 0 && page > totalPages) {
        setPage(totalPages);
      } else if (list.length === 0 && totalItems === 0 && page !== 1) {
        setPage(1);
      }
    } catch (err) {
      toastError(err?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, roleFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const hasActiveFilters = useMemo(
    () => Boolean(searchDebounced || roleFilter),
    [searchDebounced, roleFilter],
  );

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    setSubmitting(true);
    setError("");
    try {
      await employeeService.delete(id);
      toastSuccess("Employee deleted successfully");
      const wasLastOnPage = employees.length === 1;
      if (wasLastOnPage && page > 1) {
        setPage((p) => p - 1);
      } else {
        loadEmployees();
      }
    } catch (err) {
      toastError(err?.message || "Failed to delete employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <EmployeeHeader
        onAdd={() => navigate("/employees/new")}
        canCreate={canCreate}
      />
      <CRow className="mb-3 align-items-end">
        <CCol md={6}>
          <CInputGroup>
            <CInputGroupText>
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </CInputGroup>
        </CCol>
        <CCol md={4}>
          <CFormSelect
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {EMPLOYEE_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role] ||
                  role
                    .split("_")
                    .map(
                      (w) =>
                        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
                    )
                    .join(" ")}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={2} className="d-flex align-items-end">
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={handleToggleFiltersLock}
            pageLabel="Employees"
          />
        </CCol>
      </CRow>
      <EmployeeTable
        employees={employees}
        loading={loading}
        error={error}
        onClearError={() => setError("")}
        onView={(employeeId) => navigate(`/employees/${employeeId}`)}
        onEdit={(employee) => navigate(`/employees/edit/${employee.id}`)}
        onDelete={handleDeleteClick}
        canUpdate={canUpdate}
        canDelete={canDelete}
        page={page}
        pageSize={pageSize}
        pagination={pagination}
        onPageChange={setPage}
        hasActiveFilters={hasActiveFilters}
      />
      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee?"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default EmployeeList;
