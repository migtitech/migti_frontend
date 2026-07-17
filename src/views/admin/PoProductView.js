import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { useAuth } from "../../context/AuthContext";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader, PageHeader } from "../../components";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Textarea,
  Spinner,
} from "../../components/ui";
import { dateFormatter } from "../../utils/dateFormatter";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";
import { getAssetsUrl } from "../../api/endpoints";

const isHodRole = (role) => {
  const r = String(role || "").toLowerCase();
  return (
    r === "head_of_department" ||
    r === "hod" ||
    r === "admin" ||
    r === "super_admin"
  );
};

const deliverySubStatusBadge = (s) => {
  switch (s) {
    case "hod_approval_pending":
      return <Badge variant="destructive">HOD Approval Pending</Badge>;
    case "delivery_approved_by_hod":
      return <Badge variant="success">Approved by HOD</Badge>;
    default:
      return s ? (
        <Badge variant="secondary">{s.replace(/_/g, " ")}</Badge>
      ) : (
        <Badge variant="outline">—</Badge>
      );
  }
};

const lineStatusBadge = (s) => {
  if (s === "hod_approval_pending")
    return <Badge variant="destructive">HOD Approval Pending</Badge>;
  const map = {
    pending: "warning",
    purchased: "info",
    inventory_received: "default",
    ready_for_dispatchment: "default",
    delivered: "success",
    finance_approved: "success",
    po_closed: "secondary",
    payment_request_raised: "info",
    billing_request_raised: "info",
    billing_request_rejected: "destructive",
  };
  const labelMap = {
    billing_request_raised: "BR Raised",
  };
  const label = labelMap[s]
    ? labelMap[s]
    : s
      ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "—";
  return <Badge variant={map[s] || "secondary"}>{label}</Badge>;
};

const DocumentPreview = ({ doc, title }) => {
  if (!doc || typeof doc !== "object") return null;
  const path = doc.path || doc.url;
  const url = path ? getAssetsUrl(path) : null;
  if (!url) return null;
  const mime = String(doc.mimeType || "");
  const isImg = mime.startsWith("image/");
  const name = doc.originalName || "Open file";
  return (
    <div className="mb-3">
      <Label className="font-semibold">{title}</Label>
      {isImg && (
        <div className="my-2">
          <img
            src={url}
            alt=""
            className="rounded border border-border"
            style={{ maxHeight: 220, maxWidth: "100%" }}
          />
        </div>
      )}
      <Button
        variant="link"
        className="block h-auto p-0"
        onClick={() => window.open(url, "_blank", "noopener")}
      >
        {name}
      </Button>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="mb-2">
    <span className="text-xs font-semibold text-muted-foreground">
      {label}:
    </span>{" "}
    <span className="text-sm text-foreground">{value || "—"}</span>
  </div>
);

const PoProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAreaWithLocation } = useAreaNameLookup();

  const userCanApprove = isHodRole(user?.role);
  const isApprovalPending = (doc) =>
    String(doc?.status || "").trim() === "hod_approval_pending";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [doc, setDoc] = useState(null);

  const [form, setForm] = useState({
    remark: "",
    description: "",
    targetRate: "",
    quantity: "",
  });

  const defaultTargetRate = (poRate) => {
    if (poRate == null || poRate === "") return "";
    const val = Number(poRate);
    if (!Number.isFinite(val) || val <= 0) return "";
    return String(Math.round(val * 0.9 * 100) / 100);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          poProductsBucketService.getById(id),
        );
        const data = res?.data?.data || res?.data;
        setDoc(data);
        setForm({
          remark: data?.remark || "",
          targetRate:
            data?.targetRate != null
              ? String(data.targetRate)
              : defaultTargetRate(data?.poRate),
          quantity: data?.quantity != null ? String(data.quantity) : "",
          description: data?.description || "",
        });
      } catch (e) {
        toastError(e?.message || "Failed to load Sales Order product");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload = {
        remark: form.remark,
        targetRate: form.targetRate !== "" ? Number(form.targetRate) : null,
        quantity: form.quantity !== "" ? Number(form.quantity) : undefined,
        description: form.description,
      };
      const res = await poProductsBucketService.update(id, payload);
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);
      toastSuccess("Sales Order product updated successfully");
    } catch (e) {
      toastError(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await poProductsBucketService.update(id, {
        status: "pending",
      });
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);
      toastSuccess("HOD approved — status set to Pending");
    } catch (e) {
      toastError(e?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const hodApproved =
    doc?.status != null && doc.status !== "hod_approval_pending";
  const companyInfo = doc?.companyInfo;
  const lineStatus = doc?.status ?? doc?.inventoryStatus;

  if (loading) return <Loader />;

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/po-products")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <PageHeader
        title={doc?.productName || "Sales Order Product"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {lineStatusBadge(lineStatus)}

            {hodApproved && (
              <Badge variant="success">
                <CheckCircle className="h-3 w-3" />
                HOD Approved
              </Badge>
            )}

            {userCanApprove && isApprovalPending(doc) && (
              <Button
                size="sm"
                className="bg-success! text-success-foreground hover:opacity-90"
                disabled={approving}
                onClick={handleApprove}
              >
                {approving ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Approving…
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    HOD Approve
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      {/* Approved banner */}
      {hodApproved && (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This delivery has been <strong>approved by HOD</strong>.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: PO info + documents */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Sales Order &amp; Line Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InfoRow
                label="Sales Order Code"
                value={
                  <Badge variant="secondary" className="font-mono">
                    {doc?.poCode || "—"}
                  </Badge>
                }
              />
              <InfoRow
                label="Raw Product Code"
                value={
                  doc?.rawProductCode ? <code>{doc.rawProductCode}</code> : "—"
                }
              />
              <InfoRow
                label="Quantity"
                value={`${doc?.quantity ?? "—"} ${doc?.unit || ""}`}
              />
              <InfoRow
                label="Dispatch Date"
                value={dateFormatter(doc?.dispatchmentDate, "—")}
              />
              <InfoRow
                label="Sales Order Rate"
                value={doc?.poRate != null ? `₹${doc.poRate}` : "—"}
              />
              <InfoRow
                label="Target Rate"
                value={doc?.targetRate != null ? `₹${doc.targetRate}` : "—"}
              />
              {doc?.receivingRemark && (
                <InfoRow label="Receiving Remark" value={doc.receivingRemark} />
              )}
            </CardContent>
          </Card>

          {companyInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow label="Name" value={companyInfo.name} />
                <InfoRow
                  label="Area / Location"
                  value={
                    formatAreaWithLocation(
                      companyInfo.area,
                      companyInfo.location,
                    ) || "—"
                  }
                />
                <InfoRow label="Address" value={companyInfo.address} />
                {Array.isArray(companyInfo.purchaseManagers) &&
                  companyInfo.purchaseManagers.length > 0 && (
                    <div className="mt-2">
                      <div className="mb-1 text-xs font-semibold text-muted-foreground">
                        Purchase Managers:
                      </div>
                      <ul className="mb-0 list-disc ps-4 text-sm">
                        {companyInfo.purchaseManagers.map((pm, i) => (
                          <li key={i}>
                            {[pm.name, pm.phone, pm.email]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {(doc?.attachmentDocumentId || doc?.receivingDocumentId) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documents</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DocumentPreview
                  doc={doc.attachmentDocumentId}
                  title="Line attachment"
                />
                <DocumentPreview
                  doc={doc.receivingDocumentId}
                  title="Receiving / delivery proof"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Data enrichment form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Data Enrichment</CardTitle>
              <span className="text-sm text-muted-foreground">
                Product:{" "}
                <span className="font-medium text-foreground">
                  {doc?.productName || "—"}
                </span>
              </span>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-12">
                {/* Read-only fields */}
                <div className="col-span-1 space-y-1.5 md:col-span-4">
                  <Label className="text-muted-foreground">Product Name</Label>
                  <Input
                    value={doc?.productName || "—"}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="col-span-1 space-y-1.5 md:col-span-4">
                  <Label className="text-muted-foreground">
                    Raw Product Code
                  </Label>
                  <Input
                    value={doc?.rawProductCode || "—"}
                    readOnly
                    className="bg-muted font-mono"
                  />
                </div>

                <div className="col-span-1 space-y-1.5 md:col-span-4">
                  <Label className="text-muted-foreground">HSN Number</Label>
                  <Input
                    value={doc?.hsnNumber || "—"}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="col-span-1 space-y-1.5 md:col-span-4">
                  <Label className="text-muted-foreground">Model Number</Label>
                  <Input
                    value={doc?.modelNumber || "—"}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="col-span-1 space-y-1.5 md:col-span-2">
                  <Label className="text-muted-foreground">GST %</Label>
                  <Input
                    value={doc?.gstPercentage ?? "—"}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="col-span-1 space-y-1.5 md:col-span-2">
                  <Label className="text-muted-foreground">
                    Sales Order Rate (₹)
                  </Label>
                  <Input
                    value={doc?.poRate != null ? doc.poRate : "—"}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="col-span-2 md:col-span-12">
                  <hr className="border-border" />
                </div>

                {/* Editable fields */}
                <div className="col-span-1 space-y-1.5 md:col-span-3">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={form.quantity}
                    onChange={(e) => setField("quantity", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="col-span-1 space-y-1.5 md:col-span-3">
                  <Label>Unit</Label>
                  <Input
                    value={doc?.unit || "—"}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="col-span-2 space-y-1.5 md:col-span-6">
                  <Label>
                    Target Rate (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={form.targetRate}
                    onChange={(e) => setField("targetRate", e.target.value)}
                    placeholder="Enter target rate"
                  />
                  {doc?.poRate != null && (
                    <p className="text-sm text-muted-foreground">
                      Sales Order Rate: ₹{doc.poRate} · Suggested (−10%): ₹
                      {Math.round(doc.poRate * 0.9 * 100) / 100}
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5 md:col-span-12">
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Product description…"
                  />
                </div>

                <div className="col-span-2 space-y-1.5 md:col-span-12">
                  <Label>Remark</Label>
                  <Textarea
                    rows={2}
                    value={form.remark}
                    onChange={(e) => setField("remark", e.target.value)}
                    placeholder="Any remarks…"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/po-products")}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PoProductView;
