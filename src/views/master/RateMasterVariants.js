import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, IndianRupee, Layers, SendToBack } from "lucide-react";
import PageHeader from "../../components/PageHeader/PageHeader";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DataTable from "../../components/DataTable/DataTable";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  Textarea,
  RadioGroup,
  RadioGroupItem,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  useRateMasterProducts,
  daysUntil,
  formatDate,
  setVariantRate,
  reassignVariantToProcurement,
  GST_OPTIONS,
} from "./rateMasterStore";

/**
 * Variants page for a single product — reached by clicking "View Variants"
 * on the Rate Master board. Mock/demo data only, no backend calls.
 */
const RateMasterVariants = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const products = useRateMasterProducts();
  const product = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  );

  const [activeVariant, setActiveVariant] = useState(null);
  const [mode, setMode] = useState("set_rate");
  const [form, setForm] = useState({
    rate: "",
    discount: "",
    validDays: "",
    gst: "18",
    remark: "",
  });

  const openVariantModal = (variant) => {
    setActiveVariant(variant);
    setMode("set_rate");
    setForm({
      rate: variant.rate ?? "",
      discount: variant.discount ?? "",
      validDays: variant.validDays ?? "",
      gst: String(variant.gst ?? "18"),
      remark: "",
    });
  };

  const closeVariantModal = () => setActiveVariant(null);

  const handleSave = () => {
    if (!activeVariant || !product) return;

    if (mode === "reassign") {
      reassignVariantToProcurement(product.id, activeVariant.id);
      toastSuccess(`${activeVariant.name} sent back to Procurement team`);
      closeVariantModal();
      return;
    }

    const rateNum = Number(form.rate);
    if (!form.rate || Number.isNaN(rateNum) || rateNum <= 0) {
      toastError("Enter a valid selling rate");
      return;
    }
    const validDaysNum = Number(form.validDays) || 30;

    setVariantRate(product.id, activeVariant.id, {
      rate: rateNum,
      discount: Number(form.discount) || 0,
      gst: Number(form.gst),
      validDays: validDaysNum,
    });
    toastSuccess(`Rate updated for ${activeVariant.name}`);
    closeVariantModal();
  };

  const variantColumns = useMemo(
    () => [
      { key: "name", label: "Variant" },
      {
        key: "rate",
        label: "Selling Rate",
        align: "right",
        render: (row) =>
          row.rate != null ? `₹${row.rate.toLocaleString("en-IN")}` : "—",
      },
      {
        key: "discount",
        label: "Discount",
        align: "right",
        render: (row) => `${row.discount || 0}%`,
      },
      {
        key: "gst",
        label: "GST",
        align: "right",
        render: (row) => `${row.gst}%`,
      },
      {
        key: "expiryDate",
        label: "Valid Till",
        render: (row) =>
          row.expiryDate ? (
            <span
              className={
                daysUntil(row.expiryDate) <= 5
                  ? "text-warning! font-medium"
                  : ""
              }
            >
              {formatDate(row.expiryDate)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "status",
        label: "Status",
        align: "center",
        render: (row) => (
          <StatusBadge
            status={
              row.status === "priced"
                ? "active"
                : row.status === "expiring"
                  ? "expired"
                  : "pending"
            }
            children={
              row.status === "priced"
                ? "Priced"
                : row.status === "expiring"
                  ? "Expiring Soon"
                  : "Rate Pending"
            }
          />
        ),
      },
      { key: "assignedTo", label: "Assigned To" },
    ],
    [],
  );

  if (!product) {
    return (
      <div>
        <PageHeader title="Rate Master" description="Product not found." />
        <Button
          variant="outline"
          onClick={() => navigate("/master/rate-master")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Rate Master
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            {product.name}
          </span>
        }
        description={`${product.category} · ${product.sku} · Click a variant to set or reassign its rate.`}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/master/rate-master")}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Rate Master
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
          <CardDescription>
            {product.variants.length} variants for this product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={variantColumns}
            rows={product.variants}
            rowKey={(row) => row.id}
            onRowClick={openVariantModal}
            showSearch={false}
            exportFileName={`${product.id}-variants`}
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!activeVariant}
        onOpenChange={(open) => !open && closeVariantModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeVariant ? `${product.name} — ${activeVariant.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 py-4">
            <RadioGroup
              name="rate-action"
              value={mode}
              onValueChange={setMode}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  mode === "set_rate"
                    ? "border-primary! bg-primary/5"
                    : "border-border"
                }`}
              >
                <RadioGroupItem value="set_rate" className="mt-0.5" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <IndianRupee className="h-3.5 w-3.5" /> Set Selling Rate
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Enter rate, discount, validity and GST
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  mode === "reassign"
                    ? "border-primary! bg-primary/5"
                    : "border-border"
                }`}
              >
                <RadioGroupItem value="reassign" className="mt-0.5" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <SendToBack className="h-3.5 w-3.5" /> Reassign to
                    Procurement
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Send this variant back for sourcing
                  </span>
                </span>
              </label>
            </RadioGroup>

            {mode === "set_rate" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rate">Selling Rate (₹)</Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    placeholder="e.g. 450"
                    value={form.rate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 5"
                    value={form.discount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="validDays">Valid For (days)</Label>
                  <Input
                    id="validDays"
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={form.validDays}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, validDays: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gst">GST (%)</Label>
                  <Select
                    id="gst"
                    value={form.gst}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gst: e.target.value }))
                    }
                  >
                    {GST_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}%
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="remark">
                  Remark for Procurement (optional)
                </Label>
                <Textarea
                  id="remark"
                  rows={3}
                  placeholder="e.g. Rate too high, please renegotiate with supplier"
                  value={form.remark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remark: e.target.value }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeVariantModal}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {mode === "set_rate" ? "Save Rate" : "Send to Procurement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateMasterVariants;
