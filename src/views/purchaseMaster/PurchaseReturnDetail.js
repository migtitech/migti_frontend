import React from "react";
import { useParams } from "react-router-dom";
import {
  Undo2,
  IndianRupee,
  Image,
  FileText,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, StatusBadge } from "../../components";
import { Badge } from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import {
  DetailSection,
  DetailGrid,
  DetailTimeline,
  DetailNotFound,
  formatINR,
} from "./components/DetailPrimitives";
import { getPurchaseReturnDetail } from "../../data/purchaseMasterDummyData";

const refundVariant = (refund) => {
  switch (refund) {
    case "Refunded":
    case "Credit note":
      return "success";
    case "Awaited":
      return "warning";
    case "Denied":
      return "destructive";
    default:
      return "secondary";
  }
};

/**
 * Purchase Return — full detail page. Shows the entire story of a return so
 * anyone can understand it end to end: which PO and GRN it came from, the
 * supplier and product, why it was returned, the value and refund position,
 * the hit to the purchase manager's performance score, any photos of the
 * defect, and a timeline of what happened. Sample data only.
 */
const PurchaseReturnDetail = () => {
  const { id } = useParams();
  const data = getPurchaseReturnDetail(id);

  if (data.notFound) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Purchase Return ${id}`}
          back="/purchase-master/purchase-return"
        />
        <DetailNotFound label="Purchase Return" id={id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Purchase Return · ${data.id}`}
        description={`${data.product} — ${data.supplier}`}
        back="/purchase-master/purchase-return"
      />

      {/* Snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={data.status}
          variant={statusVariant(data.status)}
        />
        <Badge variant={refundVariant(data.refund)}>
          Refund: {data.refund}
        </Badge>
        <Badge
          variant={data.performanceImpact < 0 ? "destructive" : "secondary"}
        >
          <AlertTriangle className="mr-1 h-3 w-3" />
          Performance {data.performanceImpact} pts
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection title="Return Details" icon={Undo2}>
            <DetailGrid
              columns={3}
              items={[
                { label: "PO Number", value: data.po },
                { label: "GRN", value: data.grn },
                { label: "Supplier", value: data.supplier },
                { label: "Product", value: data.product },
                { label: "Category", value: data.category },
                { label: "Reason", value: data.reason },
                { label: "Quantity", value: data.qty },
                { label: "Unit Price", value: formatINR(data.unitPrice) },
                { label: "Return Value", value: formatINR(data.returnValue) },
                { label: "Raised On", value: data.raisedOn },
                { label: "Resolved On", value: data.resolvedOn },
                { label: "Debit Note", value: data.debitNote },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Reason & Remark"
            icon={FileText}
            description="Why the goods were returned and any notes shared with the supplier."
          >
            <DetailGrid
              items={[
                { label: "Why returned", value: data.reason, full: true },
                { label: "Remark", value: data.remark, full: true },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Photos"
            icon={Image}
            description="Images of the defect or issue shared with the supplier."
          >
            {data.photos.length ? (
              <ul className="space-y-2">
                {data.photos.map((photo, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{photo}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No photos attached.
              </p>
            )}
          </DetailSection>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <DetailSection title="Refund & Impact" icon={IndianRupee}>
            <DetailGrid
              columns={2}
              items={[
                {
                  label: "Refund",
                  value: (
                    <Badge variant={refundVariant(data.refund)}>
                      {data.refund}
                    </Badge>
                  ),
                },
                {
                  label: "Performance Impact",
                  value: (
                    <Badge
                      variant={
                        data.performanceImpact < 0 ? "destructive" : "secondary"
                      }
                    >
                      {data.performanceImpact} pts
                    </Badge>
                  ),
                },
                { label: "Debit Note", value: data.debitNote, full: true },
                {
                  label: "Return Value",
                  value: formatINR(data.returnValue),
                  full: true,
                },
              ]}
            />
          </DetailSection>

          <DetailSection title="Timeline" icon={Clock}>
            <DetailTimeline items={data.timeline} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReturnDetail;
