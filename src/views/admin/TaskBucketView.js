import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import taskManagementService from "../../services/taskManagementService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader, PageHeader } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

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

const DetailItem = ({ label, children, sub }) => (
  <div className="py-3">
    <span className="mb-1 block text-sm font-medium text-muted-foreground">
      {label}
    </span>
    <span className="text-sm text-foreground">{children}</span>
    {sub && <small className="block text-muted-foreground">{sub}</small>}
  </div>
);

const TaskBucketView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await taskManagementService.getById(id);
        const data = res?.data?.data ?? res?.data;
        setTask(data);
      } catch (err) {
        toastError(err?.message || "Failed to load task");
        setTask(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id]);

  if (loading) return <Loader message="Loading task..." />;
  if (!task) return null;

  const productImg = task.productInfo?.image;
  const supplier = task.supplierInfo || {};

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/task-bucket")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {task.title || "Task"}
            {getStatusBadge(task.status)}
            {task.priority && (
              <Badge variant="secondary" className="uppercase">
                {task.priority}
              </Badge>
            )}
          </span>
        }
        actions={
          <Button
            onClick={() => navigate(`/task-bucket/${task._id || task.id}/rate`)}
          >
            {supplier && supplier.rate != null ? "Edit Rate" : "Add Rate"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Task &amp; Product Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <DetailItem label="Title">{task.title || "–"}</DetailItem>
              <DetailItem
                label="Product"
                sub={task.productInfo?.modelNumber || undefined}
              >
                {task.productInfo?.name || "–"}
              </DetailItem>
              <DetailItem label="Target Rate">
                {task.targetRate != null
                  ? `₹${Number(task.targetRate).toLocaleString()}`
                  : "–"}
              </DetailItem>
              <DetailItem label="Due Date">
                {task.dueDate ? dateFormatter(task.dueDate, "–") : "–"}
              </DetailItem>
              {task.remark && (
                <DetailItem label="Remark">{task.remark}</DetailItem>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Supplier &amp; Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {productImg && getImageUrl(productImg) && (
              <div className="mb-3 flex justify-center rounded-lg border border-border bg-muted p-2">
                <img
                  src={getImageUrl(productImg)}
                  alt="Product"
                  style={{ maxHeight: 160, objectFit: "contain" }}
                />
              </div>
            )}
            <div className="divide-y divide-border">
              <DetailItem label="Supplier">
                {supplier.supplierName || "–"}
              </DetailItem>
              <DetailItem
                label="Contact Person"
                sub={
                  supplier.contactEmail || supplier.contactPhone
                    ? `${supplier.contactEmail || ""}${
                        supplier.contactEmail && supplier.contactPhone
                          ? " · "
                          : ""
                      }${supplier.contactPhone || ""}`
                    : undefined
                }
              >
                {supplier.contactName || "–"}
              </DetailItem>
              <DetailItem label="Rate">
                {supplier.rate != null
                  ? `${supplier.currency || "INR"} ${Number(
                      supplier.rate,
                    ).toLocaleString()}`
                  : "–"}
              </DetailItem>
              {supplier.remark && (
                <DetailItem label="Supplier Remark">
                  {supplier.remark}
                </DetailItem>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskBucketView;
