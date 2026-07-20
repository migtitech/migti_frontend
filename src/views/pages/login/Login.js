import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Users, Eye, EyeOff } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
} from "../../../components/ui";
import { useAuth, ROLES, ROLE_LABELS } from "../../../context/AuthContext";
import { toastSuccess, toastError } from "../../../utils/toast";
import { api } from "../../../api/axiosClient";
import { AUTH } from "../../../api/endpoints";

const BRAND_LOGO_URL = "https://migti.co.in/assets/images/logo.png";

/** Roles hidden from the login form (still used elsewhere in the app). */
const EXCLUDED_FROM_LOGIN_ROLE_SELECT = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.ADMINISTRATOR,
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
  if (normalized === ROLES.PROCUREMENT_MASTER)
    return "/procurement-master/dashboard";
  if (normalized === ROLES.PURCHASE_MANAGER)
    return "/purchase-master/dashboard";
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
      toastSuccess("Logged in successfully");
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
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center">
                <img
                  src={BRAND_LOGO_URL}
                  alt="ERP logo"
                  className="h-14 w-auto object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                ERP
              </h1>
              <p className="text-sm text-muted-foreground">
                Migti Industrial Private Limited
              </p>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Log in to your account
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((p) => ({ ...p, email: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.email}
                    required
                    className="pl-9"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.password}
                    required
                    className="pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-primary! hover:underline"
                  onClick={() => setForgotVisible(true)}
                >
                  Forgot Password?
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setFieldErrors((p) => ({ ...p, role: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.role}
                    required
                    className="pl-9"
                  >
                    <option value="">Select Role</option>
                    {LOGIN_FORM_SELECTABLE_ROLES.map((value) => (
                      <option key={value} value={value}>
                        {ROLE_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                </div>
                {fieldErrors.role && (
                  <p className="text-sm text-destructive">{fieldErrors.role}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={forgotVisible}
        onOpenChange={(open) => !open && setForgotVisible(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Contact your Administrator for Reset the password.
            </p>
            <Label htmlFor="forgot-message" className="mb-1.5 block">
              Message
            </Label>
            <Textarea
              id="forgot-message"
              rows={4}
              value={forgotMessage}
              onChange={(event) => setForgotMessage(event.target.value)}
              placeholder="Write your request message"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForgotVisible(false)}
              disabled={requestLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleForgotPasswordRequest}
              disabled={requestLoading}
            >
              {requestLoading ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
