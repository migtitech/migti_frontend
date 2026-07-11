import React from "react";
import { CCard, CCardBody, CCardHeader, CCol, CRow } from "@coreui/react";

const SidebarPageShell = ({ title, description, children }) => (
  <CRow>
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>{title}</strong>
        </CCardHeader>
        <CCardBody>
          {description && (
            <p className="text-body-secondary mb-3">{description}</p>
          )}
          {children || (
            <p className="mb-0 text-muted">
              This page is reserved for this sidebar module. Existing CRM
              workflows are unchanged; connect features here when ready.
            </p>
          )}
        </CCardBody>
      </CCard>
    </CCol>
  </CRow>
);

export default SidebarPageShell;
