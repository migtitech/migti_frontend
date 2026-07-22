import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Factory,
  Package,
  IndianRupee,
  Clock,
  FileText,
  Tag,
} from "lucide-react";
import { PageHeader, StatusBadge } from "../../components";
import {
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import {
  DetailSection,
  DetailGrid,
  DetailNotFound,
  formatINR,
} from "./components/DetailPrimitives";
import {
  getRaisedPurchaseDetail,
  raisedPurchaseStatusMeta,
  raisedPurchaseStages,
  raisedPurchaseTotal,
} from "../../data/purchaseMasterDummyData";

const BACK_PATH = "/raised-purchases";

/**
 * Raised Purchase — full detail / status page. Shows the supplier, every
 * product line with amount, the order total, and an end-to-end status timeline
 * (Pending HOD Approval → Approved → PO Sent → Received, or Rejected).
 * Frontend-only sample data.
 */
const RaisedPurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = getRaisedPurchaseDetail(id);

  if (data.notFound) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Raised Purchase ${id}`} back={BACK_PATH} />
        <DetailNotFound label="Raised Purchase" id={id} />
      </div>
    );
  }

  const meta = raisedPurchaseStatusMeta[data.status] || {
    label: data.status,
    variant: "secondary",
    step: 1,
  };
  const total = raisedPurchaseTotal(data);
  const isRejected = data.status === "rejected";
  const currentStep = meta.step;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Raised Purchase · ${data.id}`}
        description={`${data.supplier} — ${data.products.length} product${
          data.products.length > 1 ? "s" : ""
        }`}
        back={BACK_PATH}
        actions={
          data.sourcePr ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(`/purchase-request-bucket/${data.sourcePr}`)
              }
            >
              <Tag className="mr-1.5 h-4 w-4" />
              View Source {data.sourcePr}
            </Button>
          ) : null
        }
      />

      {/* Snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={meta.label} variant={meta.variant} />
        <Badge variant="secondary">{data.supplierCategory}</Badge>
        <Badge variant="secondary">
          <IndianRupee className="mr-1 h-3 w-3" />
          {formatINR(total)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection title="Supplier & Order" icon={Factory}>
            <DetailGrid
              items={[
                { label: "Supplier", value: data.supplier },
                { label: "Category", value: data.supplierCategory },
                { label: "Source Purchase Request", value: data.sourcePr },
                { label: "Raised By", value: data.raisedBy },
                { label: "Raised On", value: data.raisedOn },
                {
                  label: "Current Status",
                  value: (
                    <StatusBadge status={meta.label} variant={meta.variant} />
                  ),
                },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Products"
            icon={Package}
            description="All products purchased from this supplier in this order."
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((p) => (
                    <TableRow key={p.sku}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.sku}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.qty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(p.rate)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatINR(p.qty * p.rate)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right text-base font-bold tabular-nums">
                      {formatINR(total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </DetailSection>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <DetailSection title="Status" icon={Clock}>
            {isRejected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-[11px] font-bold text-success-foreground">
                    ✓
                  </span>
                  <span className="text-sm font-medium">Raised</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                    ✕
                  </span>
                  <span className="text-sm font-medium text-destructive">
                    Rejected by HOD
                  </span>
                </div>
              </div>
            ) : (
              <ol className="space-y-3">
                {raisedPurchaseStages.map((stageKey, i) => {
                  const stepNo = i + 1;
                  const done = stepNo <= currentStep;
                  const isCurrent = stepNo === currentStep;
                  const stageMeta = raisedPurchaseStatusMeta[stageKey];
                  return (
                    <li key={stageKey} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? "✓" : stepNo}
                      </span>
                      <span
                        className={
                          done
                            ? "text-sm font-medium text-foreground"
                            : "text-sm text-muted-foreground"
                        }
                      >
                        {stageMeta?.label || stageKey}
                      </span>
                      {isCurrent && (
                        <Badge variant="secondary" className="ml-auto">
                          Current
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </DetailSection>

          <DetailSection title="Remark" icon={FileText}>
            <p className="text-sm text-foreground">{data.remark || "—"}</p>
          </DetailSection>
        </div>
      </div>
    </div>
  );
};

export default RaisedPurchaseDetail;
