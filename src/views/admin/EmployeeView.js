import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Pencil,
  Building2,
  Users,
  Contact,
  CreditCard,
  MonitorSmartphone,
  Lock,
} from "lucide-react";
import employeeService from "../../services/employeeService";
import groupService from "../../services/groupService";
import branchService from "../../services/branchService";
import areaService from "../../services/areaService";
import { BackButton, Loader, PageHeader } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";

const empty = (v) => v === undefined || v === null || v === "";
const show = (v) => (empty(v) ? "-" : String(v).trim() || "-");

const EmployeeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [branch, setBranch] = useState(null);
  const [zones, setZones] = useState([]);
  const [assignedGroups, setAssignedGroups] = useState([]);
  // F-EMP / D27: server-derived categories (read-only), from the API response.
  const [derivedCategories, setDerivedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const closePasswordModal = () => {
    setPasswordModalVisible(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleUpdatePassword = async () => {
    const np = String(newPassword || "");
    const cp = String(confirmPassword || "");
    if (np.length < 6) {
      toastError("New password must be at least 6 characters.");
      return;
    }
    if (np !== cp) {
      toastError("New password and confirm password do not match.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await employeeService.updatePassword(id, {
        newPassword: np,
        confirmPassword: cp,
      });
      toastSuccess("Password updated successfully");
      closePasswordModal();
    } catch (err) {
      const detail = err?.data?.error ?? err?.errors;
      const msg =
        Array.isArray(detail) && detail.length
          ? detail.join(" ")
          : err?.message || "Failed to update password.";
      toastError(msg);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const getStatusBadge = (isActive) => {
    if (isActive === false) return <Badge variant="secondary">Inactive</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  // F-EMP: role badge/label removed — the view shows designation, never role.

  const InfoRow = ({ label, value, badge }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {badge ? (
        value
      ) : (
        <span className="text-sm text-foreground">{show(value)}</span>
      )}
    </div>
  );

  const AssetSection = ({ title, data }) => {
    if (!data || !data.enabled) return null;
    const fields = [
      { key: "model", label: "Model" },
      { key: "modelNumber", label: "Model Number" },
      { key: "companyName", label: "Company Name" },
      { key: "vehicleNumber", label: "Vehicle Number" },
      { key: "number", label: "Number" },
      { key: "imeiNumber", label: "IMEI Number" },
      { key: "phoneType", label: "Phone Type" },
      { key: "configurationRam", label: "RAM" },
      { key: "configurationRom", label: "ROM" },
      { key: "storageType", label: "Storage Type" },
      { key: "providedDate", label: "Provided Date" },
    ];
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-2 py-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="success">Assigned</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-border">
            {fields.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2 py-1.5 text-sm"
              >
                <span className="font-medium text-muted-foreground">
                  {label}:
                </span>
                <span className="text-foreground">{show(data[key])}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await withMinimumDelay(() =>
          employeeService.getById(id),
        );
        const employeePayload =
          response?.data?.employee ||
          response?.data?.data ||
          response?.data ||
          null;
        const normalizedEmployee = employeePayload
          ? {
              ...employeePayload,
              id: employeePayload?.id || employeePayload?._id,
            }
          : null;
        setEmployee(normalizedEmployee);

        if (normalizedEmployee?.branchId) {
          const branchResponse = await branchService.getById(
            normalizedEmployee.branchId,
          );
          const branchPayload =
            branchResponse?.data?.branch ||
            branchResponse?.data?.data ||
            branchResponse?.data ||
            null;
          const normalizedBranch = branchPayload
            ? { ...branchPayload, id: branchPayload?.id || branchPayload?._id }
            : null;
          setBranch(normalizedBranch);
        } else {
          setBranch(null);
        }

        const zoneIds = Array.isArray(normalizedEmployee?.zoneIds)
          ? normalizedEmployee.zoneIds
          : normalizedEmployee?.zoneId
            ? [normalizedEmployee.zoneId]
            : [];
        if (zoneIds.length) {
          try {
            const zoneResponses = await Promise.all(
              zoneIds.map((zid) => areaService.getById(zid)),
            );
            const zoneList = zoneResponses
              .map(
                (zoneResponse) =>
                  zoneResponse?.data?.data ||
                  zoneResponse?.data ||
                  zoneResponse,
              )
              .filter(Boolean);
            setZones(zoneList);
          } catch {
            setZones([]);
          }
        } else {
          setZones([]);
        }

        const agRaw = normalizedEmployee?.assigned_groups;
        const agIds = Array.isArray(agRaw)
          ? agRaw
              .map((x) => (x && typeof x === "object" && x._id ? x._id : x))
              .map((x) => String(x).trim())
              .filter((id) => /^[a-fA-F0-9]{24}$/i.test(id))
          : [];
        if (agIds.length) {
          try {
            const gr = await Promise.all(
              agIds.map((gid) => groupService.getById(gid).catch(() => null)),
            );
            const list = gr
              .map((r) => {
                const d = r?.data?.data || r?.data?.group || r?.data;
                if (!d) {
                  return null;
                }
                return {
                  id: d._id || d.id,
                  name: d.name || String(d._id || d.id),
                };
              })
              .filter(Boolean);
            setAssignedGroups(list);
          } catch {
            setAssignedGroups(agIds.map((id) => ({ id, name: id })));
          }
        } else {
          setAssignedGroups([]);
        }

        // F-EMP / D27: categories are auto-derived server-side; the API returns
        // them populated with names on assigned_categories.
        const acRaw = normalizedEmployee?.assigned_categories;
        const catList = Array.isArray(acRaw)
          ? acRaw
              .map((c) =>
                c && typeof c === "object"
                  ? { id: c._id || c.id, name: c.name || String(c._id || c.id) }
                  : { id: String(c), name: String(c) },
              )
              .filter((c) => c.id)
          : [];
        setDerivedCategories(catList);
      } catch (err) {
        toastError(err?.message || "Failed to load employee");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading employee..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => navigate("/employees")}>
            Back to Employees
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (!employee) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Employee not found</h4>
          <Button onClick={() => navigate("/employees")}>
            Back to Employees
          </Button>
        </CardContent>
      </Card>
    );
  }

  const e = employee;
  const bank = e.bankDetails || {};
  const assets = e.assets || {};

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback="/employees" />
      </div>

      <PageHeader
        title={show(e.name)}
        description={show(e.designation)}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setPasswordModalVisible(true)}
            >
              <Lock className="h-4 w-4" />
              Update password
            </Button>
            <Button onClick={() => navigate(`/employees/edit/${e.id}`)}>
              <Pencil className="h-4 w-4" />
              Edit Employee
            </Button>
          </>
        }
      />

      {/* Profile header */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary! text-lg text-primary-foreground">
              {e.name?.charAt(0)?.toUpperCase() || "E"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h4 className="mb-1 text-lg font-semibold">{show(e.name)}</h4>
            <p className="mb-2 text-sm text-muted-foreground">
              {show(e.designation)}
            </p>
            <div className="flex flex-wrap gap-2">
              {/* F-EMP: show designation, never the raw role key. */}
              <Badge variant="secondary">{show(e.designation)}</Badge>
              {getStatusBadge(e.isActive)}
              {/* F-EMP: System Information / ID badge removed from the view. */}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <InfoRow label="Full Name" value={e.name} />
              <InfoRow label="Father's Name" value={e.fatherName} />
              <InfoRow label="Mother's Name" value={e.motherName} />
              <InfoRow label="Address" value={e.address} />
              <InfoRow label="State" value={e.state} />
              <InfoRow label="City" value={e.city} />
              <InfoRow label="Pincode" value={e.pincode} />
              <InfoRow
                label="Has Bike"
                value={
                  e.hasBike === "yes"
                    ? "Yes"
                    : e.hasBike === "no"
                      ? "No"
                      : show(e.hasBike)
                }
              />
              <InfoRow
                label="Has Driving License"
                value={
                  e.hasDrivingLicense === "yes"
                    ? "Yes"
                    : e.hasDrivingLicense === "no"
                      ? "No"
                      : show(e.hasDrivingLicense)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2">
            <Contact className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <InfoRow label="Personal Email" value={e.email} />
              <InfoRow label="Personal Phone" value={e.phone} />
              <InfoRow label="Company Email" value={e.companyEmail} />
              <InfoRow label="Company Phone" value={e.companyPhone} />
            </div>
          </CardContent>
        </Card>

        {/* Company / Work Details */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              Company &amp; Work Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {/* F-EMP: show designation, never the raw role key. */}
              <InfoRow label="Designation" value={e.designation} />
              <InfoRow label="ID Number" value={e.idnumber} />
              <InfoRow
                label="Zones"
                value={
                  zones.length
                    ? zones
                        .map((z) => z?.name)
                        .filter(Boolean)
                        .join(", ")
                    : "-"
                }
              />
              <div className="flex items-start justify-between gap-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Product groups
                </span>
                <div className="flex flex-wrap justify-end gap-1 text-right">
                  {assignedGroups.length ? (
                    assignedGroups.map((g) => (
                      <Badge key={String(g.id)} variant="info">
                        {g.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
              {/* F-EMP / D27: categories are auto-derived from the groups above —
                  read-only, never hand-edited. */}
              {derivedCategories.length > 0 && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Derived categories ({derivedCategories.length})
                  </span>
                  <div className="max-h-32 max-w-[60%] overflow-y-auto text-right text-sm text-foreground">
                    {derivedCategories.map((c) => c.name).join(", ")}
                  </div>
                </div>
              )}
              <InfoRow label="Salary Type" value={e.salaryType} />
              <InfoRow
                label="Salary"
                value={
                  <span className="text-sm text-foreground">
                    {empty(e.salary)
                      ? "-"
                      : `₹ ${Number(e.salary).toLocaleString()}`}
                  </span>
                }
                badge
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <InfoRow label="Bank Name" value={bank.bankName} />
              <InfoRow
                label="Account Holder Name"
                value={bank.accountHolderName}
              />
              <InfoRow label="Account Number" value={bank.accountNumber} />
              <InfoRow label="IFSC Code" value={bank.ifscCode} />
              <InfoRow label="UPI Details" value={bank.upiDetails} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets */}
      <Card className="mb-6 mt-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Assets</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {assets.bike?.enabled ||
          assets.laptop?.enabled ||
          assets.mobile?.enabled ||
          assets.simCard?.enabled ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <AssetSection title="Bike" data={assets.bike} />
              <AssetSection title="Laptop" data={assets.laptop} />
              <AssetSection title="Mobile" data={assets.mobile} />
              <AssetSection title="Sim Card" data={assets.simCard} />
            </div>
          ) : (
            <p className="mb-0 text-sm text-muted-foreground">
              No assets assigned.
            </p>
          )}
        </CardContent>
      </Card>

      {/* F-EMP: System Information card removed from the view (Employee ID,
          uniqueId, created/updated). Data still returned by the API; just hidden. */}

      <Dialog
        open={passwordModalVisible}
        onOpenChange={(o) => {
          if (!o && !passwordSubmitting) closePasswordModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-2">
            <p className="mb-3 text-sm text-muted-foreground">
              The new password is stored encrypted on the server. The employee
              will use it the next time they sign in.
            </p>
            <div className="mb-3 space-y-1.5">
              <Label htmlFor="emp-new-password">New password</Label>
              <Input
                id="emp-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                disabled={passwordSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-confirm-password">Confirm password</Label>
              <Input
                id="emp-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                disabled={passwordSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePasswordModal}
              disabled={passwordSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeView;
