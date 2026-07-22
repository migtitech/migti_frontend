import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Package,
  MapPin,
  IndianRupee,
  Users,
  Recycle,
  ShieldCheck,
  FileText,
  Clock,
  Zap,
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
import { statusVariant } from "./components/statusFormatters";
import {
  DetailSection,
  DetailGrid,
  DetailTimeline,
  DetailNotFound,
  formatINR,
} from "./components/DetailPrimitives";
import PurchaseActionDialog from "./components/PurchaseActionDialog";
import { getPurchaseRequestDetail } from "../../data/purchaseMasterDummyData";

const purchaseTypeBadge = (type) => (
  <Badge variant={type === "cash" ? "warning" : "info"}>
    {type === "cash" ? "Cash Purchase" : "Credit Purchase"}
  </Badge>
);

/**
 * Purchase Request — full detail page. Shows the entire story of a request so
 * anyone can understand it end to end: where it came from and why, the rate and
 * cash/credit terms, how much qty comes from which supplier, wastage mapped to
 * the product code, the authorisation trail, documents and a timeline. The
 * Action button opens the purchase / assign-to-local dialog. Sample data only.
 */
const PurchaseRequestDetail = () => {
  const { id } = useParams();
  const data = getPurchaseRequestDetail(id);
  const [actionOpen, setActionOpen] = useState(false);

  if (data.notFound) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Purchase Request ${id}`}
          back="/purchase-master/purchase-requests"
        />
        <DetailNotFound label="Purchase Request" id={id} />
      </div>
    );
  }

  const c = data.commercials;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Purchase Request · ${data.id}`}
        description={`${data.product} — ${data.category}`}
        back="/purchase-master/purchase-requests"
        actions={
          <Button type="button" onClick={() => setActionOpen(true)}>
            <Zap className="mr-1.5 h-4 w-4" />
            Action
          </Button>
        }
      />

      {/* Snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={data.status}
          variant={statusVariant(data.status)}
        />
        <Badge variant={data.bucketType === "brand" ? "info" : "secondary"}>
          {data.bucketType === "brand" ? "Brand Purchase" : "Local Purchase"}
        </Badge>
        <Badge variant={statusVariant(data.priority)}>
          Priority: {data.priority}
        </Badge>
        {purchaseTypeBadge(c.purchaseType)}
        <Badge variant="secondary">
          <Tag className="mr-1 h-3 w-3" />
          {data.productCode}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection title="Product & Request" icon={Package}>
            <DetailGrid
              items={[
                { label: "Product", value: data.product },
                { label: "Product Code", value: data.productCode },
                { label: "Category", value: data.category },
                { label: "Unit", value: data.unit },
                {
                  label: "Quantity Required",
                  value: `${data.qty} ${data.unit}`,
                },
                { label: "Target Date", value: data.targetDate },
                { label: "Raised By", value: data.raisedBy },
                { label: "Raised On", value: data.raisedOn },
                { label: "HOD Approved By", value: data.hodApprovedBy },
                { label: "HOD Approved On", value: data.hodApprovedOn },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="From Where & Why"
            icon={MapPin}
            description="The origin of this demand and the reason it exists."
          >
            <DetailGrid
              items={[
                {
                  label: "Why this purchase",
                  value: data.origin.why,
                  full: true,
                },
                {
                  label: "From where",
                  value: data.origin.fromWhere,
                  full: true,
                },
                {
                  label: "Merged from Sales Orders",
                  value: (
                    <div className="flex flex-wrap gap-1.5">
                      {data.origin.mergedFrom.map((so) => (
                        <Badge key={so} variant="secondary">
                          {so}
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                { label: "Linked Query", value: data.origin.linkedQuery },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Commercials — Rate & Payment"
            icon={IndianRupee}
            description="Purchase rate and whether this is a cash or credit purchase."
          >
            <DetailGrid
              columns={3}
              items={[
                { label: "Purchase Rate", value: formatINR(c.purchaseRate) },
                {
                  label: "Last Purchase Rate",
                  value: formatINR(c.lastPurchaseRate),
                },
                {
                  label: "Rate Change",
                  value: (
                    <span
                      className={
                        c.purchaseRate > c.lastPurchaseRate
                          ? "text-destructive"
                          : c.purchaseRate < c.lastPurchaseRate
                            ? "text-success!"
                            : ""
                      }
                    >
                      {c.purchaseRate > c.lastPurchaseRate ? "+" : ""}
                      {formatINR(c.purchaseRate - c.lastPurchaseRate)}
                    </span>
                  ),
                },
                {
                  label: "Purchase Type",
                  value: purchaseTypeBadge(c.purchaseType),
                },
                {
                  label: "Credit Days",
                  value:
                    c.purchaseType === "credit" ? `${c.creditDays} days` : "—",
                },
                { label: "GST", value: `${c.gstPercent}%` },
                { label: "Expected Value", value: formatINR(c.expectedValue) },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Supplier Split — Who supplies how much"
            icon={Users}
            description="Quantity sourced from each supplier, with rate and payment type."
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.supplierSplit.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {s.supplier}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.supplierCode}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.qty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(s.rate)}
                      </TableCell>
                      <TableCell>{purchaseTypeBadge(s.purchaseType)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.note}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DetailSection>

          <DetailSection
            title="Wastage — mapped to product code"
            icon={Recycle}
            description="Expected wastage for this purchase, tied to the product code."
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead className="text-right">
                      Expected Waste %
                    </TableHead>
                    <TableHead className="text-right">
                      Expected Waste Qty
                    </TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.wastage.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="secondary">{w.productCode}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {w.expectedWastePercent}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {w.expectedWasteQty} {data.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {w.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DetailSection>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <DetailSection title="Authorisation" icon={ShieldCheck}>
            <DetailGrid
              columns={2}
              items={[
                {
                  label: "Authorised By",
                  value: data.authorisation.authorisedBy,
                  full: true,
                },
                {
                  label: "Authorised On",
                  value: data.authorisation.authorisedOn,
                },
                {
                  label: "Status",
                  value: (
                    <Badge variant="success">{data.authorisation.status}</Badge>
                  ),
                },
                { label: "Note", value: data.authorisation.note, full: true },
              ]}
            />
          </DetailSection>

          <DetailSection title="Documents" icon={FileText}>
            {data.documents.length ? (
              <ul className="space-y-2">
                {data.documents.map((doc, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{doc.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {doc.size}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No documents attached.
              </p>
            )}
          </DetailSection>

          <DetailSection title="Remark" icon={FileText}>
            <p className="text-sm text-foreground">{data.remark || "—"}</p>
          </DetailSection>

          <DetailSection title="Timeline" icon={Clock}>
            <DetailTimeline items={data.timeline} />
          </DetailSection>
        </div>
      </div>

      <PurchaseActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        request={data}
      />
    </div>
  );
};

export default PurchaseRequestDetail;
