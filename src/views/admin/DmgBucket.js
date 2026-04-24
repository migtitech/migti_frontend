import React from "react";
import { CCard, CCardBody, CCardHeader, CCol, CRow } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilFolder } from "@coreui/icons";
import { useAuth } from "../../context/AuthContext";

const DmgBucket = () => {
  const { user } = useAuth();

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>DMG Bucket</h2>
          <p className="text-body-secondary mb-0">
            Welcome, {user?.name}. Manage DMG-related items here.
          </p>
        </CCol>
      </CRow>
      <CRow>
        <CCol>
          <CCard>
            <CCardHeader className="d-flex align-items-center">
              <CIcon icon={cilFolder} className="me-2" />
              <strong>DMG Bucket</strong>
            </CCardHeader>
            <CCardBody>
              <p className="text-body-secondary mb-0">
                This bucket is for DMG (Direct Material Group / related) items.
                Content can be added as per your process.
              </p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default DmgBucket;
