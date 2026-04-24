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
}) => {
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
      purchase_manager: "warning",
      purchase_exicutive: "warning",
      back_office_exicutive: "secondary",
      administrator: "dark",
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
                    return (
                      <CTableRow
                        key={employee.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => onView(employee.id)}
                      >
                        <CTableDataCell>{index + 1}</CTableDataCell>
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
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default EmployeeTable;
