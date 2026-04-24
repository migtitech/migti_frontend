import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CBreadcrumb,
  CBreadcrumbItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilPencil, cilTrash, cilArrowLeft } from "@coreui/icons";
import { useData } from "../../context/DataContext";
import { ROLE_LABELS } from "../../context/AuthContext";
import { ConfirmDialog } from "../../components";
import usePermissions from "../../hooks/usePermissions";

const BRANCH_ROLES = [
  "head_of_department",
  "sales_manager",
  "sales_exicutive",
  "purchase_manager",
  "purchase_exicutive",
  "back_office_exicutive",
  "administrator",
];

const BranchUserManagement = () => {
  const { companyId, branchId } = useParams();
  const navigate = useNavigate();
  const {
    getCompanyById,
    getBranchById,
    getUsersByBranch,
    addBranchUser,
    updateBranchUser,
    deleteBranchUser,
  } = useData();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const canCreateBranches = canCreate("branches");
  const canUpdateBranches = canUpdate("branches");
  const canDeleteBranches = canDelete("branches");

  const company = getCompanyById(parseInt(companyId));
  const branch = getBranchById(parseInt(branchId));
  const users = getUsersByBranch(parseInt(branchId));

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
  });

  if (!company || !branch) {
    return (
      <CCard>
        <CCardBody className="text-center">
          <h4>Branch not found</h4>
          <CButton color="primary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", role: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", role: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUser) {
      updateBranchUser(editingUser.id, formData);
    } else {
      addBranchUser({ ...formData, branchId: parseInt(branchId) });
    }
    handleCloseModal();
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (id != null) deleteBranchUser(id);
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      head_of_department: "primary",
      sales_manager: "success",
      sales_exicutive: "info",
      purchase_manager: "warning",
      purchase_exicutive: "info",
      back_office_exicutive: "secondary",
      administrator: "dark",
    };
    return colors[role] || "dark";
  };

  return (
    <>
      <CBreadcrumb className="mb-4">
        <CBreadcrumbItem>
          <span
            style={{ cursor: "pointer", color: "var(--cui-link-color)" }}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </span>
        </CBreadcrumbItem>
        <CBreadcrumbItem>
          <span
            style={{ cursor: "pointer", color: "var(--cui-link-color)" }}
            onClick={() => navigate(`/admin/companies/${companyId}/branches`)}
          >
            {company.name}
          </span>
        </CBreadcrumbItem>
        <CBreadcrumbItem active>{branch.name} - Users</CBreadcrumbItem>
      </CBreadcrumb>

      <CRow className="mb-4">
        <CCol>
          <CButton
            color="link"
            className="p-0 mb-2"
            onClick={() => navigate(`/admin/companies/${companyId}/branches`)}
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Branches
          </CButton>
          <h2>{branch.name}</h2>
          <p className="text-body-secondary">
            User Management - {company.name}
          </p>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Users</strong>
              {canCreateBranches ? (
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => handleOpenModal()}
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  Add User
                </CButton>
              ) : null}
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive bordered>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Role</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {users.map((user, index) => (
                    <CTableRow
                      key={user.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleOpenModal(user)}
                    >
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{user.name}</CTableDataCell>
                      <CTableDataCell>{user.email}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getRoleBadgeColor(user.role)}>
                          {ROLE_LABELS[user.role] || user.role}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell onClick={(e) => e.stopPropagation()}>
                        {canUpdateBranches ? (
                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(user);
                            }}
                            title="Edit"
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                        ) : null}
                        {canDeleteBranches ? (
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(user.id);
                            }}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        ) : null}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {users.length === 0 && (
                    <CTableRow>
                      <CTableDataCell
                        colSpan={5}
                        className="text-center text-body-secondary"
                      >
                        No users found.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {canCreateBranches || (canUpdateBranches && editingUser) ? (
        <CModal visible={showModal} onClose={handleCloseModal}>
          <CForm onSubmit={handleSubmit}>
            <CModalHeader>
              <CModalTitle>
                {editingUser ? "Edit User" : "Add New User"}
              </CModalTitle>
            </CModalHeader>
            <CModalBody>
              <div className="mb-3">
                <CFormLabel htmlFor="name">Full Name</CFormLabel>
                <CFormInput
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel htmlFor="email">Email</CFormLabel>
                <CFormInput
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email"
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel htmlFor="role">Role</CFormLabel>
                <CFormSelect
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                >
                  <option value="">Select Role</option>
                  {BRANCH_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </CModalBody>
            <CModalFooter>
              <CButton color="secondary" onClick={handleCloseModal}>
                Cancel
              </CButton>
              <CButton color="primary" type="submit">
                {editingUser ? "Update" : "Create"}
              </CButton>
            </CModalFooter>
          </CForm>
        </CModal>
      ) : null}

      {canDeleteBranches ? (
        <ConfirmDialog
          visible={confirmDelete.visible}
          onClose={() => setConfirmDelete({ visible: false, id: null })}
          onConfirm={handleDeleteConfirm}
          title="Delete User?"
          message="Are you sure you want to delete this user? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />
      ) : null}
    </>
  );
};

export default BranchUserManagement;
