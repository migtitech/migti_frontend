import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormSelect,
  CImage,
  CLink,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CFormTextarea,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilLockLocked,
  cilUser,
  cilPeople,
  cilEnvelopeOpen,
} from "@coreui/icons";
import { useAuth, ROLES, ROLE_LABELS } from "../../../context/AuthContext";
import { toastSuccess, toastError } from "../../../utils/toast";
import { api } from "../../../api/axiosClient";
import { AUTH } from "../../../api/endpoints";
import "./Login.scss";

const BRAND_LOGO_URL = "https://migti.co.in/assets/images/logo.png";

/** Roles hidden from the login form (still used elsewhere in the app). */
const EXCLUDED_FROM_LOGIN_ROLE_SELECT = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.ADMINISTRATOR,
  ROLES.PURCHASE_EXICUTIVE,
  ROLES.SALES_EXICUTIVE,
]);

const LOGIN_FORM_SELECTABLE_ROLES = Object.values(ROLES).filter(
  (r) => !EXCLUDED_FROM_LOGIN_ROLE_SELECT.has(r),
);

const getPostLoginPath = (role) => {
  const normalized = String(role || "").toLowerCase();
  if (normalized === ROLES.HEAD_OF_DEPARTMENT || normalized === "hod") {
    return "/hod-dashboard";
  }
  if (normalized === ROLES.PROCUREMENT) return "/pro-dashboard";
  if (normalized === ROLES.LOCAL_PROCUREMENT) return "/local-pro";
  if (normalized === ROLES.LOCAL_PURCHASE) return "/my-purchase";
  if (normalized === ROLES.DISPATCH_MANAGER) return "/dispatchment";
  if (normalized === ROLES.INVENTRY_MANAGER) return "/inventory-bucket";
  if (normalized === ROLES.FINANCE) return "/billing-requests";
  return "/dashboard";
};

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(
    "Please reset my password. I am unable to login.",
  );
  const [requestLoading, setRequestLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginPath(user?.role));
    }
  }, [isAuthenticated, navigate, user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errs = {};
    const emailTrim = (email || "").trim();
    if (!emailTrim) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      errs.email = "Enter a valid email address";
    }
    if (!password) {
      errs.password = "Password is required";
    }
    if (!role) {
      errs.role = "Please select a role";
    } else if (!LOGIN_FORM_SELECTABLE_ROLES.includes(role)) {
      errs.role = "Invalid role selected";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    const result = await login(emailTrim, password, role);

    if (result.success) {
      toastSuccess("Signed in successfully");
      navigate(getPostLoginPath(result.user?.role || role));
    } else {
      toastError(result.error);
    }
    setLoading(false);
  };

  const handleForgotPasswordRequest = async () => {
    const emailTrim = (email || "").trim();
    const messageTrim = (forgotMessage || "").trim();

    if (!emailTrim) {
      toastError("Please enter your email before sending request.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      toastError("Please enter a valid email.");
      return;
    }
    if (!role) {
      toastError("Please select your role before sending request.");
      return;
    }
    if (!messageTrim) {
      toastError("Please enter a message.");
      return;
    }

    try {
      setRequestLoading(true);
      const response = await api.post(AUTH.EMPLOYEE_PASSWORD_RESET_REQUEST, {
        email: emailTrim,
        role,
        message: messageTrim,
      });
      toastSuccess(response?.message || "Request sent successfully.");
      setForgotVisible(false);
    } catch (error) {
      toastError(error?.message || "Unable to send request.");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="login-page min-vh-100 d-flex align-items-center py-4">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol sm={11} md={8} lg={6} xl={5} xxl={4}>
            <CCard className="auth-card border-0">
              <CCardBody>
                <CForm
                  className="auth-form"
                  onSubmit={handleSubmit}
                  autoComplete="off"
                >
                  <div className="text-center auth-brand">
                    <div className="auth-logo-wrap">
                      <CImage
                        src={BRAND_LOGO_URL}
                        alt="Migti logo"
                        className="auth-logo-image"
                      />
                    </div>
                    <h1 className="auth-title mb-1">MigtiCRM</h1>
                    <p className="auth-subtitle mb-0">
                      Migti Industrial Private Limited
                    </p>
                  </div>

                  <div className="auth-header">
                    <h2 className="mb-2">Welcome back</h2>
                    <p className="text-body-secondary mb-0">
                      Sign in to your account
                    </p>
                  </div>

                  <CInputGroup className="auth-input-group mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilEnvelopeOpen} />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      placeholder="Email"
                      autoComplete="off"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((p) => ({ ...p, email: undefined }));
                      }}
                      invalid={!!fieldErrors.email}
                      required
                    />
                  </CInputGroup>
                  {fieldErrors.email && (
                    <div className="text-danger small mb-2">
                      {fieldErrors.email}
                    </div>
                  )}

                  <CInputGroup className="auth-input-group mb-2">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((p) => ({ ...p, password: undefined }));
                      }}
                      invalid={!!fieldErrors.password}
                      required
                    />
                    <CInputGroupText
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      role="button"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
                          <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
                          <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
                        </svg>
                      )}
                    </CInputGroupText>
                  </CInputGroup>
                  {fieldErrors.password && (
                    <div className="text-danger small mb-2">
                      {fieldErrors.password}
                    </div>
                  )}
                  <div className="d-flex justify-content-end mb-3">
                    <CLink
                      href="#"
                      className="auth-forgot-link"
                      onClick={(event) => {
                        event.preventDefault();
                        setForgotVisible(true);
                      }}
                    >
                      Forgot Password?
                    </CLink>
                  </div>

                  <CInputGroup className="auth-input-group mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilPeople} />
                    </CInputGroupText>
                    <CFormSelect
                      className="auth-role-select"
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value);
                        setFieldErrors((p) => ({ ...p, role: undefined }));
                      }}
                      invalid={!!fieldErrors.role}
                      required
                    >
                      <option value="">Select Role</option>
                      {LOGIN_FORM_SELECTABLE_ROLES.map((value) => (
                        <option key={value} value={value}>
                          {ROLE_LABELS[value]}
                        </option>
                      ))}
                    </CFormSelect>
                  </CInputGroup>
                  {fieldErrors.role && (
                    <div className="text-danger small mb-2">
                      {fieldErrors.role}
                    </div>
                  )}

                  <CRow className="g-0">
                    <CCol xs={12}>
                      <CButton
                        color="primary"
                        className="auth-submit-btn w-100"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? "Signing in..." : "Sign In"}
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      <CModal
        alignment="center"
        visible={forgotVisible}
        onClose={() => setForgotVisible(false)}
      >
        <CModalHeader>
          <CModalTitle>Forgot Password</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">
            Contact your Administrator for Reset the password.
          </p>
          <CFormTextarea
            rows={4}
            value={forgotMessage}
            onChange={(event) => setForgotMessage(event.target.value)}
            placeholder="Write your request message"
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="light"
            onClick={() => setForgotVisible(false)}
            disabled={requestLoading}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleForgotPasswordRequest}
            disabled={requestLoading}
          >
            {requestLoading ? "Sending..." : "Send Request"}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default Login;
