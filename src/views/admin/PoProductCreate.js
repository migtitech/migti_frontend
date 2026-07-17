import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Spinner,
} from "../../components/ui";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { toastError, toastSuccess } from "../../utils/toast";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const defaultTargetRate = (poRate) => {
  const val = Number(poRate);
  if (!Number.isFinite(val) || val <= 0) return "";
  return String(Math.round(val * 0.9 * 100) / 100);
};

const PoProductCreate = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const product = state?.product;
  const { formatArea } = useAreaNameLookup();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    quantity: "",
    targetRate: "",
    remark: "",
  });

  useEffect(() => {
    if (!product) {
      navigate("/po-products/add", { replace: true });
      return;
    }
    setForm({
      quantity: product.quantity != null ? String(product.quantity) : "",
      targetRate:
        product.poRate != null ? defaultTargetRate(product.poRate) : "",
      remark: product.remark || "",
    });
  }, [product]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.quantity || Number(form.quantity) < 0) {
      toastError("Quantity is required and must be ≥ 0");
      return;
    }
    setSaving(true);
    try {
      await poProductsBucketService.create({
        purchaseOrderId: product.purchaseOrderId,
        poCode: product.poCode || "",
        productName: product.productName,
        unit: product.unit || "",
        rawProductCode: product.rawProductCode || "",
        hsnNumber: product.hsnNumber || "",
        modelNumber: product.modelNumber || "",
        gstPercentage: product.gstPercentage ?? null,
        description: product.description || "",
        companyInfo: product.companyInfo || {},
        quantity: Number(form.quantity),
        targetRate: form.targetRate !== "" ? Number(form.targetRate) : null,
        remark: form.remark,
      });
      toastSuccess(
        "Sales Order product created with HOD Approval Pending status",
      );
      navigate("/po-products");
    } catch (e) {
      toastError(e?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/po-products/add")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h5 className="mb-0 flex-1 truncate text-lg font-semibold">
          New Sales Order Product
        </h5>
        <Badge variant="destructive">HOD Approval Pending</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Product Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
            {/* All info fields — disabled */}
            <div className="col-span-2 md:col-span-6">
              <Label className="text-muted-foreground">Product Name</Label>
              <Input
                value={product.productName || "—"}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-2 md:col-span-6">
              <Label className="text-muted-foreground">Raw Product Code</Label>
              <Input
                value={product.rawProductCode || "—"}
                disabled
                className="mt-1 bg-muted font-mono"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <Label className="text-muted-foreground">Sales Order Code</Label>
              <Input
                value={product.poCode || "—"}
                disabled
                className="mt-1 bg-muted font-mono"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <Label className="text-muted-foreground">Unit</Label>
              <Input
                value={product.unit || "—"}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <Label className="text-muted-foreground">HSN Number</Label>
              <Input
                value={product.hsnNumber || "—"}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <Label className="text-muted-foreground">Model Number</Label>
              <Input
                value={product.modelNumber || "—"}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <Label className="text-muted-foreground">GST %</Label>
              <Input
                value={product.gstPercentage ?? "—"}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <Label className="text-muted-foreground">
                Sales Order Rate (₹)
              </Label>
              <Input
                value={product.poRate != null ? product.poRate : "—"}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-2 md:col-span-6">
              <Label className="text-muted-foreground">Company</Label>
              <Input
                value={
                  product.companyInfo?.name
                    ? [
                        product.companyInfo.name,
                        formatArea(product.companyInfo?.area),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "—"
                }
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-2 md:col-span-12">
              <Label className="text-muted-foreground">Description</Label>
              <Textarea
                rows={2}
                value={product.description || "—"}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <div className="col-span-2 md:col-span-12">
              <hr className="my-1 border-border" />
            </div>

            {/* Editable fields */}
            <div className="col-span-1 md:col-span-3">
              <Label>
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={form.quantity}
                onChange={(e) => setField("quantity", e.target.value)}
                placeholder="0"
                autoFocus
                className="mt-1"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <Label>Target Rate (₹)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={form.targetRate}
                onChange={(e) => setField("targetRate", e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
              {product.poRate != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Suggested (−10%): ₹
                  {Math.round(product.poRate * 0.9 * 100) / 100}
                </p>
              )}
            </div>

            <div className="col-span-2 md:col-span-12">
              <Label>Remark</Label>
              <Textarea
                rows={3}
                value={form.remark}
                onChange={(e) => setField("remark", e.target.value)}
                placeholder="Any remarks…"
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/po-products/add")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Product
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoProductCreate;
