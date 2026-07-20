import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Clipboard,
  Pencil,
  User,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import purchaseTaskService from "../../services/purchaseTaskService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth, ROLES } from "../../context/AuthContext";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";
import {
  TASK_STATUS,
  getStatusBadge,
  formatCurrency,
  classifyTask,
} from "./PurchaseTasks";

const SOURCE_LABEL = {
  assigned: { label: "Assigned", variant: "secondary" },
  direct: { label: "Direct", variant: "info" },
  reverify: { label: "Reverify", variant: "warning" },
};

const statusOptions = [
  { value: TASK_STATUS.PENDING, label: "Pending" },
  { value: TASK_STATUS.IN_PROGRESS, label: "In Progress" },
  { value: TASK_STATUS.SUBMITTED, label: "Submitted" },
  { value: TASK_STATUS.SETTLED, label: "Settled" },
];

const Detail = ({ label, value, mono = false }) => {
  const isEmpty = value == null || String(value).trim() === "";
  return (
    <div className="space-y-0.5">
      <p className="mb-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mb-0 text-sm ${mono ? "font-mono" : ""}`}>
        {isEmpty ? "—" : value}
      </p>
    </div>
  );
};

const personLine = (p) => {
  if (!p || typeof p !== "object") return "";
  const bits = [p.name || p.email || ""];
  if (p.designation) bits.push(p.designation);
  else if (p.role) bits.push(p.role);
  return bits.filter(Boolean).join(" — ");
};

const PurchaseTaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isAdminLike =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.HEAD_OF_DEPARTMENT;
  const isPurchaseRole =
    user?.role === ROLES.PURCHASE_EXICUTIVE || user?.role === ROLES.PROCUREMENT;

  const [task, setTask] = useState(location.state?.task || null);
  const [loading, setLoading] = useState(!location.state?.task);
  const [notFound, setNotFound] = useState(false);

  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkValue, setRemarkValue] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const [rateOpen, setRateOpen] = useState(false);
  const [rateValue, setRateValue] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  /* No get-by-id endpoint exists, so fall back to finding the task in the
     list endpoints when the page is opened directly by URL. */
  useEffect(() => {
    if (task) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const finders = [
          () =>
            purchaseTaskService.getMyTasks({ pageNumber: 1, pageSize: 100 }),
        ];
        if (isAdminLike) {
          finders.push(() =>
            purchaseTaskService.adminList({ pageNumber: 1, pageSize: 100 }),
          );
        }
        let found = null;
        for (const fetchList of finders) {
          try {
            const res = await withMinimumDelay(fetchList);
            const data = res?.data || res;
            const result = data?.data ?? data;
            const list = result?.tasks || [];
            found = list.find((t) => String(t._id || t.id) === String(id));
            if (found) break;
          } catch {
            /* try the next source */
          }
        }
        if (!alive) return;
        if (found) setTask(found);
        else setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [id, isAdminLike, task]);

  const reload = (updated) => {
    if (updated) setTask(updated);
  };

  const handleStatusChange = async (newStatus) => {
    if (!task || !newStatus || newStatus === task.status) return;
    setSavingStatus(true);
    try {
      const res = await purchaseTaskService.updateStatus(
        task._id || task.id,
        newStatus,
        task.targetRate,
      );
      const data = res?.data || res;
      reload(data?.data?.task || data?.data || { ...task, status: newStatus });
      toastSuccess("Status updated");
    } catch (err) {
      toastError(err?.message || "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveRemark = async () => {
    if (!task) return;
    setSavingRemark(true);
    try {
      await purchaseTaskService.updateRemark(task._id || task.id, remarkValue);
      reload({ ...task, supplierRateRemark: remarkValue });
      toastSuccess("Supplier rate remark updated");
      setRemarkOpen(false);
    } catch (err) {
      toastError(err?.message || "Failed to update remark");
    } finally {
      setSavingRemark(false);
    }
  };

  const handleSaveRate = async () => {
    if (!task) return;
    const value = rateValue === "" ? null : Number(rateValue);
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      toastError("Enter a valid target rate");
      return;
    }
    setSavingRate(true);
    try {
      await purchaseTaskService.updateStatus(
        task._id || task.id,
        task.status || "",
        value,
      );
      reload({ ...task, targetRate: value });
      toastSuccess("Target rate updated");
      setRateOpen(false);
    } catch (err) {
      toastError(err?.message || "Failed to update target rate");
    } finally {
      setSavingRate(false);
    }
  };

  if (loading) return <Loader message="Loading request details..." />;

  if (notFound || !task) {
    return (
      <div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/procurement-requests")}
          className="mb-4 px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-6 text-muted-foreground">
            Request not found or you do not have access to it.
          </CardContent>
        </Card>
      </div>
    );
  }

  const quotation = task.quotationId || task.quotation || {};
  const companyInfo = quotation.companyInfo || {};
  const products = Array.isArray(quotation.products) ? quotation.products : [];
  const source = SOURCE_LABEL[classifyTask(task)] || SOURCE_LABEL.direct;

  return (
    <div>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/procurement-requests")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Procurement Requests
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="mb-1 text-lg font-semibold">
            {quotation.quotationCode || task.quotationNumber || "Request"}
          </h4>
          <p className="mb-0 text-sm text-muted-foreground">
            Full details of this procurement request.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={source.variant}>{source.label}</Badge>
          {getStatusBadge(task.status)}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* ── request info ── */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-x-4 gap-y-4">
                <div className="col-span-6 md:col-span-3">
                  <Detail
                    label="Quotation"
                    value={quotation.quotationCode || task.quotationNumber}
                    mono
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Type" value={task.type} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Priority" value={task.priority} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail
                    label="Due Date"
                    value={dateFormatter(task.dueDate, "")}
                  />
                </div>

                <div className="col-span-6 md:col-span-4">
                  <Detail label="Category" value={task.productCategory} />
                </div>
                <div className="col-span-6 md:col-span-4">
                  <Detail label="Group" value={task.productGroup} />
                </div>
                <div className="col-span-6 md:col-span-4">
                  <Detail label="Subcategory" value={task.subCategory} />
                </div>

                <div className="col-span-6 md:col-span-4">
                  <div className="flex items-end gap-1.5">
                    <Detail
                      label="Target Rate"
                      value={formatCurrency(task.targetRate)}
                    />
                    {isPurchaseRole && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit target rate"
                        onClick={() => {
                          setRateValue(
                            task.targetRate != null
                              ? String(task.targetRate)
                              : "",
                          );
                          setRateOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-4">
                  <Detail
                    label="Procurement Rate"
                    value={formatCurrency(task.procurementRate)}
                  />
                </div>
                <div className="col-span-6 md:col-span-4">
                  <Detail
                    label="Created"
                    value={dateTimeFormatter(task.createdAt, "")}
                  />
                </div>

                <div className="col-span-12">
                  <div className="flex items-end gap-1.5">
                    <Detail
                      label="Supplier Rate Remark"
                      value={task.supplierRateRemark}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Update remark"
                      onClick={() => {
                        setRemarkValue(task.supplierRateRemark || "");
                        setRemarkOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-3">
                <div className="w-full sm:w-56">
                  <Label>Update Status</Label>
                  <Select
                    value={task.status || TASK_STATUS.PENDING}
                    disabled={savingStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── people & company ── */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                People &amp; Company
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <Detail
                    label="Company"
                    value={
                      companyInfo.name
                        ? `${companyInfo.name}${
                            companyInfo.area ? ` (${companyInfo.area})` : ""
                          }`
                        : quotation.customerName || quotation.companyName || ""
                    }
                  />
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <Detail
                    label="Assigned To"
                    value={personLine(task.assignedTo)}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <Detail
                    label="Assigned By"
                    value={personLine(task.assignedBy)}
                  />
                </div>
                <Detail
                  label="Quotation Status"
                  value={quotation.status || ""}
                />
                <Detail
                  label="Last Updated"
                  value={dateTimeFormatter(task.updatedAt, "")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── quotation products ── */}
        <div className="col-span-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quotation Products</CardTitle>
              <Badge variant="secondary">{products.length}</Badge>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="mb-0 text-muted-foreground">
                  No products found on the linked quotation.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: 48 }}>#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead>Model</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p, i) => (
                        <TableRow key={p._id || i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-semibold">
                            {p.productName || "-"}
                          </TableCell>
                          <TableCell>{p.quantity ?? "-"}</TableCell>
                          <TableCell>{p.unit || "-"}</TableCell>
                          <TableCell>{p.hsnNumber || "-"}</TableCell>
                          <TableCell>{p.modelNumber || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* remark dialog */}
      <Dialog
        open={remarkOpen}
        onOpenChange={(o) => !o && setRemarkOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Supplier Rate Remark</DialogTitle>
          </DialogHeader>
          <div className="mb-3">
            <Label>Remark</Label>
            <Input
              type="text"
              value={remarkValue}
              onChange={(e) => setRemarkValue(e.target.value)}
              placeholder="Enter supplier rate remark"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemarkOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRemark}
              disabled={savingRemark}
            >
              {savingRemark ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* target rate dialog */}
      <Dialog open={rateOpen} onOpenChange={(o) => !o && setRateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Target Rate</DialogTitle>
          </DialogHeader>
          <div className="mb-3">
            <Label>Target Rate (INR)</Label>
            <Input
              type="number"
              min={0}
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              placeholder="Enter target rate"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRate}
              disabled={savingRate}
            >
              {savingRate ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseTaskDetail;
