import React from "react";
import { CCol, CRow, CButton } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus } from "@coreui/icons";

const BranchHeader = ({ onAdd, canCreate }) => (
  <CRow className="mb-3">
    <CCol>
      <div className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">All Branches</h4>
        {canCreate ? (
          <CButton color="primary" onClick={onAdd}>
            <CIcon icon={cilPlus} className="me-2" />
            Add Branch
          </CButton>
        ) : null}
      </div>
    </CCol>
  </CRow>
);

export default BranchHeader;
