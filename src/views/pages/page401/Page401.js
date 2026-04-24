import React from "react";
import { useNavigate } from "react-router-dom";
import { CButton, CCol, CContainer, CRow } from "@coreui/react";

const Page401 = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <div className="clearfix">
              <h1 className="float-start display-3 me-4">401</h1>
              <h4 className="pt-3">Unauthorized Access</h4>
              <p className="text-body-secondary float-start">
                You don&apos;t have permission to access this page. Please
                contact your administrator if you believe this is an error.
              </p>
            </div>
            <div className="mt-4">
              <CButton color="primary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </CButton>
              <CButton
                color="secondary"
                className="ms-2"
                onClick={() => navigate("/login")}
              >
                Login with Different Account
              </CButton>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default Page401;
