import React, { useMemo } from "react";
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
  CPagination,
  CPaginationItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilTrash } from "@coreui/icons";
import { EyeIcon } from "../../../components";
import { Loader } from "../../../components";
import { ROLE_LABELS } from "../../../context/AuthContext";

const EmployeeTable = ({
  employees,
  branches,
  loading,
  error,
  onClearError,
  onView,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  page = 1,
  pageSize = 10,
  pagination = {},
  onPageChange,
}) => {
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;
  const branchById = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => {
      map.set(String(branch.id), branch);
    });
    return map;
  }, [branches]);

  const roleBadgeColor = (role) => {
    const colors = {
      head_of_department: "primary",
      sales_manager: "info",
      sales_exicutive: "info",
      purchase_exicutive: "warning",
      procurement: "warning",
      back_office_exicutive: "secondary",
      administrator: "dark",
      finance: "success",
      inventry_manager: "warning",
      dispatch_manager: "info",
    };
    return colors[role] || "dark";
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Employee List</strong>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert
                color="danger"
                className="mb-3"
                dismissible
                onClose={onClearError}
              >
                {error}
              </CAlert>
            )}
            {loading ? (
              <Loader message="Loading employees..." />
            ) : (
              <CTable hover responsive bordered>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>SNo</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Phone</CTableHeaderCell>
                    <CTableHeaderCell>Role</CTableHeaderCell>
                    <CTableHeaderCell>Branch</CTableHeaderCell>
                    <CTableHeaderCell>Designation</CTableHeaderCell>
                    <CTableHeaderCell>ID Number</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {employees.map((employee, index) => {
                    const branch = branchById.get(String(employee.branchId));
                    const rowNumber = (page - 1) * pageSize + index + 1;
                    return (
                      <CTableRow
                        key={employee.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => onView(employee.id)}
                      >
                        <CTableDataCell>{rowNumber}</CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex align-items-center">
                            <CAvatar
                              color="primary"
                              textColor="white"
                              size="sm"
                              className="me-2"
                            >
                              {employee.name?.charAt(0)?.toUpperCase() || "E"}
                            </CAvatar>
                            <strong>{employee.name}</strong>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>{employee.email}</CTableDataCell>
                        <CTableDataCell>{employee.phone || "-"}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={roleBadgeColor(employee.role)}>
                            {employee.role
                              ? ROLE_LABELS[employee.role] ||
                                employee.role
                                  .split("_")
                                  .map(
                                    (w) =>
                                      w.charAt(0).toUpperCase() +
                                      w.slice(1).toLowerCase(),
                                  )
                                  .join(" ")
                              : "-"}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{branch?.name || "N/A"}</CTableDataCell>
                        <CTableDataCell>
                          {employee.designation || "-"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {employee.idnumber || "-"}
                        </CTableDataCell>
                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(employee.id);
                            }}
                            title="View"
                          >
                            <EyeIcon />
                          </CButton>
                          {canUpdate && canUpdate("employees") && (
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(employee);
                              }}
                              title="Edit"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          )}
                          {canDelete && canDelete("employees") && (
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(employee.id);
                              }}
                              title="Delete"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })}
                  {employees.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={9} className="text-center">
                        No employees found. Click "Add Employee" to create one.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            )}
            {!loading && totalItems > 0 && onPageChange && (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mt-3 px-2 pb-2">
                <div className="small text-medium-emphasis">
                  Showing{" "}
                  {Math.min((page - 1) * pageSize + 1, totalItems)}-
                  {Math.min(page * pageSize, totalItems)} of {totalItems}
                </div>
                {totalPages > 1 && (
                  <CPagination className="mb-0" aria-label="Employee pages">
                    <CPaginationItem
                      disabled={page <= 1}
                      onClick={() => page > 1 && onPageChange(page - 1)}
                      style={{ cursor: page <= 1 ? "default" : "pointer" }}
                    >
                      Previous
                    </CPaginationItem>
                    <CPaginationItem active aria-current="page">
                      {page}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={page >= totalPages}
                      onClick={() =>
                        page < totalPages && onPageChange(page + 1)
                      }
                      style={{
                        cursor: page >= totalPages ? "default" : "pointer",
                      }}
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                )}
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default EmployeeTable;
