import React, { useMemo } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCardFooter,
  CCol,
  CRow,
  CButton,
  CBadge,
  CAlert,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilTrash, cilPeople, cilPlus } from "@coreui/icons";
import { EyeIcon } from "../../../components";
import { Loader } from "../../../components";

const BranchCards = ({
  branches,
  companies,
  loading,
  error,
  onClearError,
  onAdd,
  onView,
  onEdit,
  onDelete,
  canCreate,
  canUpdate,
  canDelete,
}) => {
  const companyById = useMemo(() => {
    const map = new Map();
    companies.forEach((company) => {
      map.set(String(company.id), company);
    });
    return map;
  }, [companies]);

  return (
    <CRow>
      {error && (
        <CCol xs={12}>
          <CAlert
            color="danger"
            className="mb-3"
            dismissible
            onClose={onClearError}
          >
            {error}
          </CAlert>
        </CCol>
      )}
      {loading ? (
        <CCol xs={12}>
          <Loader message="Loading branches..." />
        </CCol>
      ) : (
        branches.map((branch) => {
          const company = companyById.get(String(branch.companyId));
          return (
            <CCol key={branch.id} sm={6} lg={4} xl={3} className="mb-4">
              <CCard className="h-100">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>{branch.name}</strong>
                  <CBadge color="success">Active</CBadge>
                </CCardHeader>
                <CCardBody>
                  <div className="mb-2">
                    <small className="text-muted">Company:</small>
                    <p className="mb-1">{company?.name || "N/A"}</p>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Email:</small>
                    <p className="mb-1">{branch.email}</p>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Branch Code:</small>
                    <p className="mb-1">{branch.branchcode || "-"}</p>
                  </div>
                  <div className="mb-0">
                    <small className="text-muted">Phone:</small>
                    <p className="mb-0">{branch.phone || "-"}</p>
                  </div>
                </CCardBody>
                <CCardFooter className="d-flex gap-1 flex-wrap">
                  <CButton
                    color="info"
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(branch.id)}
                    title="View"
                  >
                    <EyeIcon />
                  </CButton>
                  {canUpdate ? (
                    <CButton
                      color="warning"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(branch)}
                      title="Edit"
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>
                  ) : null}
                  {canDelete ? (
                    <CButton
                      color="danger"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(branch.id)}
                      title="Delete"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  ) : null}
                </CCardFooter>
              </CCard>
            </CCol>
          );
        })
      )}
      {!loading && branches.length === 0 && (
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <p className="text-muted mb-3">No branches found.</p>
              {canCreate ? (
                <CButton color="primary" onClick={onAdd}>
                  <CIcon icon={cilPlus} className="me-2" />
                  Add Branch
                </CButton>
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>
      )}
    </CRow>
  );
};

export default BranchCards;
