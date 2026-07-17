import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import employeeService from "../../services/employeeService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  TablePagination,
  FilterLockButton,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Input,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
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

const formatRole = (role) =>
  role
    ? ROLE_LABELS[role] ||
      role
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "-";

const roleBadgeVariant = (role) => {
  const map = {
    head_of_department: "default",
    sales_manager: "secondary",
    sales_exicutive: "secondary",
    purchase_exicutive: "warning",
    procurement: "warning",
    back_office_exicutive: "secondary",
    administrator: "default",
    finance: "success",
    inventry_manager: "warning",
    dispatch_manager: "secondary",
  };
  return map[role] || "secondary";
};

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

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "SNo",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (page - 1) * pageSize + index + 1,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        exportValue: (employee) => employee.name,
        render: (employee) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback>
                {employee.name?.charAt(0)?.toUpperCase() || "E"}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-foreground">
              {employee.name}
            </span>
          </div>
        ),
      },
      { key: "email", label: "Email", sortable: true },
      {
        key: "phone",
        label: "Phone",
        render: (employee) => employee.phone || "-",
      },
      {
        key: "role",
        label: "Role",
        sortValue: (employee) => formatRole(employee.role),
        exportValue: (employee) => formatRole(employee.role),
        render: (employee) => (
          <Badge variant={roleBadgeVariant(employee.role)}>
            {formatRole(employee.role)}
          </Badge>
        ),
      },
      {
        key: "designation",
        label: "Designation",
        render: (employee) => employee.designation || "-",
      },
      {
        key: "idnumber",
        label: "ID Number",
        render: (employee) => employee.idnumber || "-",
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (employee) => (
          <RowActions
            onView={() => navigate(`/employees/${employee.id}`)}
            onEdit={
              canUpdate("employees")
                ? () => navigate(`/employees/edit/${employee.id}`)
                : undefined
            }
            onDelete={
              canDelete("employees")
                ? () => handleDeleteClick(employee.id)
                : undefined
            }
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee accounts, roles, and access."
        actions={
          canCreate("employees") && (
            <Button onClick={() => navigate("/employees/new")}>
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <div className="w-full max-w-xs">
          <Select
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
                {formatRole(role)}
              </option>
            ))}
          </Select>
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel="Employees"
        />
      </div>

      <DataTable
        columns={columns}
        rows={employees}
        rowKey={(employee) => employee.id}
        loading={loading}
        onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
        showSearch={false}
        exportFileName="employees"
        emptyTitle="No employees found"
        emptyMessage={
          hasActiveFilters
            ? "No employees match your search or filters."
            : 'Click "Add Employee" to create one.'
        }
      />

      <TablePagination
        currentPage={page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setPage}
        showRange
        totalItems={pagination?.totalItems ?? 0}
        itemsPerPage={pageSize}
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
    </div>
  );
};

export default EmployeeList;
