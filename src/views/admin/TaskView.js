import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { User } from "lucide-react";
import taskManagementService from "../../services/taskManagementService";
import employeeService from "../../services/employeeService";
import { getAssetsUrl } from "../../api/endpoints";
import {
  Loader,
  PageHeader,
  BackButton,
  GstRateSelect,
} from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const getStatusBadge = (status) => {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "assigned":
      return <Badge variant="info">Assigned</Badge>;
    case "submitted":
      return <Badge variant="success">Submitted</Badge>;
    default:
      return <Badge variant="secondary">{status || "–"}</Badge>;
  }
};

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "string")
    return img.startsWith("http") ? img : getAssetsUrl(img);
  if (img?.path)
    return img.path.startsWith("http") ? img.path : getAssetsUrl(img.path);
  return "";
};

const DetailRow = ({ label, children, stacked = false }) => (
  <div
    className={
      stacked
        ? "flex flex-col gap-1 py-3"
        : "flex items-start justify-between gap-4 py-3"
    }
  >
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground">{children}</span>
  </div>
);

const TaskView = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    productName: "",
    hsn: "",
    gst: "",
    modelNumber: "",
    description: "",
    remark: "",
    targetRate: "",
    dueDate: "",
    priority: "",
  });

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await taskManagementService.getById(id);
        const data = res?.data?.data ?? res?.data;
        setTask(data);
        setForm({
          title: data?.title || "",
          productName: data?.productInfo?.name || "",
          hsn: data?.productInfo?.hsn || "",
          gst:
            data?.productInfo?.gst != null &&
            !Number.isNaN(Number(data.productInfo.gst))
              ? String(data.productInfo.gst)
              : "",
          modelNumber: data?.productInfo?.modelNumber || "",
          description: data?.productInfo?.description || "",
          remark: data?.remark || "",
          targetRate:
            data?.targetRate != null && !Number.isNaN(Number(data.targetRate))
              ? String(data.targetRate)
              : "",
          dueDate: data?.dueDate ? data.dueDate.slice(0, 10) : "",
          priority: data?.priority || "",
        });
      } catch (err) {
        toastError(err?.message || "Failed to load task");
        setTask(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const params = { pageSize: 100 };
        const res = await employeeService.getAll(params);
        const data = res?.data?.data ?? res?.data;
        setEmployees(data?.employees ?? []);
      } catch {
        setEmployees([]);
      }
    };
    if (assignModalVisible) fetchEmployees();
  }, [assignModalVisible]);

  const handleAssign = async () => {
    if (!assignEmployeeId) {
      toastError("Please select an employee");
      return;
    }
    setAssigning(true);
    try {
      await taskManagementService.assignEmployee(id, assignEmployeeId);
      const res = await taskManagementService.getById(id);
      setTask(res?.data?.data ?? res?.data);
      setAssignModalVisible(false);
      setAssignEmployeeId("");
      toastSuccess("Employee assigned successfully");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to assign",
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!task?._id && !id) return;
    if (!form.title.trim()) {
      toastError("Title is required");
      return;
    }
    setSaving(true);
    try {
      await taskManagementService.update(id, {
        title: form.title.trim(),
        productInfo: {
          name: form.productName || "",
          hsn: form.hsn || "",
          gst: form.gst ? Number(form.gst) : null,
          modelNumber: form.modelNumber || "",
          description: form.description || "",
        },
        remark: form.remark || "",
        targetRate: form.targetRate ? Number(form.targetRate) : null,
        dueDate: form.dueDate || null,
        priority: form.priority || "",
      });
      const res = await taskManagementService.getById(id);
      const data = res?.data?.data ?? res?.data;
      setTask(data);
      setEditing(false);
      toastSuccess("Task updated");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to update task",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader message="Loading task..." />;
  if (!task) return null;

  const productImg = task.productInfo?.image;
  const canAssign = task.status !== "submitted";

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback="/task-dashboard" />
      </div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {task.title || "Task"}
            {getStatusBadge(task.status)}
          </span>
        }
        actions={
          <>
            {canAssign && (
              <Button size="sm" onClick={() => setAssignModalVisible(true)}>
                <User className="h-4 w-4" />
                Assign Employee
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing((prev) => !prev)}
            >
              {editing ? "Cancel Edit" : "Edit"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <dl className="divide-y divide-border">
              <DetailRow label="Title">
                {editing ? (
                  <Input
                    className="h-8 w-48"
                    value={form.title}
                    onChange={(e) => handleFormChange("title", e.target.value)}
                  />
                ) : (
                  <span className="font-medium">{task.title || "–"}</span>
                )}
              </DetailRow>
              <DetailRow label="Status">
                {getStatusBadge(task.status)}
              </DetailRow>
              <DetailRow label="Priority">
                <span className="capitalize">{task.priority || "–"}</span>
              </DetailRow>
              <DetailRow label="Assigned To">
                {task.employeeId ? (
                  <span className="text-right">
                    {task.employeeId.name}
                    {task.employeeId.designation && (
                      <small className="block text-muted-foreground">
                        {task.employeeId.designation}
                      </small>
                    )}
                    {task.employeeId.email && (
                      <small className="block text-muted-foreground">
                        {task.employeeId.email}
                      </small>
                    )}
                  </span>
                ) : (
                  "–"
                )}
              </DetailRow>
              <DetailRow label="Target Rate">
                {editing ? (
                  <Input
                    className="h-8 w-48"
                    type="number"
                    min={0}
                    value={form.targetRate}
                    onChange={(e) =>
                      handleFormChange("targetRate", e.target.value)
                    }
                  />
                ) : (
                  <span>
                    {task.targetRate != null
                      ? `₹${Number(task.targetRate).toLocaleString()}`
                      : "–"}
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Due Date">
                {editing ? (
                  <Input
                    className="h-8 w-48"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      handleFormChange("dueDate", e.target.value)
                    }
                  />
                ) : (
                  <span>{dateFormatter(task.dueDate, "–")}</span>
                )}
              </DetailRow>
              <DetailRow label="Assigned Date">
                {dateTimeFormatter(task.assignedDate, "–")}
              </DetailRow>
              <DetailRow label="Submission Date">
                {dateTimeFormatter(task.submissionDate, "–")}
              </DetailRow>
              <DetailRow label="Remark" stacked>
                {editing ? (
                  <Textarea
                    rows={2}
                    value={form.remark}
                    onChange={(e) => handleFormChange("remark", e.target.value)}
                  />
                ) : (
                  <span className="text-foreground">{task.remark || "–"}</span>
                )}
              </DetailRow>
              {(task.supplierInfo?.rate != null ||
                task.supplierInfo?.supplierName ||
                task.supplierInfo?.remark) && (
                <>
                  <DetailRow label="Rate">
                    {task.supplierInfo?.rate != null
                      ? `₹${Number(task.supplierInfo.rate).toLocaleString()}`
                      : "–"}
                  </DetailRow>
                  {task.supplierInfo?.supplierName && (
                    <DetailRow label="Shop Name">
                      {task.supplierInfo.supplierName}
                    </DetailRow>
                  )}
                  {task.supplierInfo?.contactName && (
                    <DetailRow label="Contact Name">
                      {task.supplierInfo.contactName}
                    </DetailRow>
                  )}
                  {task.supplierInfo?.contactPhone && (
                    <DetailRow label="Contact Phone">
                      {task.supplierInfo.contactPhone}
                    </DetailRow>
                  )}
                  {task.supplierInfo?.remark && (
                    <DetailRow label="Supplier Remark" stacked>
                      <span className="text-foreground">
                        {task.supplierInfo.remark}
                      </span>
                    </DetailRow>
                  )}
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {productImg && getImageUrl(productImg) && (
              <div className="mb-4 flex justify-center rounded-lg border border-border bg-muted p-3">
                <img
                  src={getImageUrl(productImg)}
                  alt="Product"
                  style={{ maxHeight: 160, objectFit: "contain" }}
                />
              </div>
            )}
            <dl className="divide-y divide-border">
              <DetailRow label="Name">
                {editing ? (
                  <Input
                    className="h-8 w-48"
                    value={form.productName}
                    onChange={(e) =>
                      handleFormChange("productName", e.target.value)
                    }
                  />
                ) : (
                  <span>{task.productInfo?.name || "–"}</span>
                )}
              </DetailRow>
              <DetailRow label="HSN">
                {editing ? (
                  <Input
                    className="h-8 w-48"
                    value={form.hsn}
                    onChange={(e) => handleFormChange("hsn", e.target.value)}
                  />
                ) : (
                  <span>{task.productInfo?.hsn || "–"}</span>
                )}
              </DetailRow>
              <DetailRow label="GST %">
                {editing ? (
                  <GstRateSelect
                    className="w-64"
                    value={form.gst}
                    onChange={(e) => handleFormChange("gst", e.target.value)}
                  />
                ) : (
                  <span>
                    {task.productInfo?.gst != null ? task.productInfo.gst : "–"}
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Model Number">
                {editing ? (
                  <Input
                    className="h-8 w-48"
                    value={form.modelNumber}
                    onChange={(e) =>
                      handleFormChange("modelNumber", e.target.value)
                    }
                  />
                ) : (
                  <span>{task.productInfo?.modelNumber || "–"}</span>
                )}
              </DetailRow>
              <DetailRow label="Description" stacked>
                {editing ? (
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      handleFormChange("description", e.target.value)
                    }
                  />
                ) : (
                  <span className="text-foreground">
                    {task.productInfo?.description || "–"}
                  </span>
                )}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>
      </div>

      {editing && (
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      <Dialog
        open={assignModalVisible}
        onOpenChange={(o) => !o && setAssignModalVisible(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Employee</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-2">
            <Select
              value={assignEmployeeId}
              onChange={(e) => setAssignEmployeeId(e.target.value)}
              aria-label="Select employee"
            >
              <option value="">– Select employee –</option>
              {employees.map((emp) => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name} {emp.designation ? `(${emp.designation})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignModalVisible(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !assignEmployeeId}
            >
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskView;
