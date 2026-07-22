import React from "react";
import { useParams } from "react-router-dom";
import {
  IndianRupee,
  Banknote,
  CalendarClock,
  FileText,
  CheckCircle2,
  AlertTriangle,
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
  DetailNotFound,
  formatINR,
} from "./components/DetailPrimitives";
import { getVendorPaymentDetail } from "../../data/purchaseMasterDummyData";
import { toastSuccess } from "../../utils/toast";

/**
 * Vendor Payment — full detail page. Shows a single outstanding invoice end to
 * end: the vendor, the linked PO/GRN, the amount breakdown (GST, TDS, net
 * payable), the payment schedule and the bank details used to release it. The
 * "Mark as Paid" action is a sample toast only. Frontend-only sample data.
 */
const VendorPaymentDetail = () => {
  const { id } = useParams();
  const data = getVendorPaymentDetail(id);

  if (data.notFound) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Vendor Payment ${id}`}
          back="/purchase-master/vendor-payments"
        />
        <DetailNotFound label="Vendor Payment" id={id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Vendor Payment · ${data.id}`}
        description={`${data.vendor} — PO ${data.po}`}
        back="/purchase-master/vendor-payments"
        actions={
          <Button
            type="button"
            onClick={() =>
              toastSuccess(`Payment for ${data.id} marked as paid (sample).`)
            }
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Mark as Paid
          </Button>
        }
      />

      {/* Snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={data.status}
          variant={statusVariant(data.status)}
        />
        {data.daysOverdue > 0 ? (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Overdue {data.daysOverdue}d
          </Badge>
        ) : null}
        <Badge variant="secondary">{data.paymentMode}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection title="Invoice & Amounts" icon={IndianRupee}>
            <DetailGrid
              items={[
                { label: "Vendor", value: data.vendor },
                { label: "Vendor Code", value: data.vendorCode },
                { label: "PO #", value: data.po },
                { label: "GRN #", value: data.grn },
                { label: "Invoice Date", value: data.invoiceDate },
                { label: "Due Date", value: data.dueDate },
                { label: "Invoice Amount", value: formatINR(data.amount) },
                { label: "GST", value: formatINR(data.gstAmount) },
                { label: "TDS", value: formatINR(data.tds) },
                {
                  label: "Net Payable",
                  value: (
                    <span className="text-base font-semibold text-primary">
                      {formatINR(data.payable)}
                    </span>
                  ),
                },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Payment Schedule"
            icon={CalendarClock}
            description="Milestones for this invoice and their release status."
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.schedule.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.on}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(s.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.done ? "success" : "secondary"}>
                          {s.done ? "Done" : "Pending"}
                        </Badge>
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
          <DetailSection title="Bank Details" icon={Banknote}>
            <DetailGrid
              columns={2}
              items={[
                { label: "Bank", value: data.bank.name, full: true },
                { label: "Account", value: data.bank.account },
                { label: "IFSC", value: data.bank.ifsc },
                { label: "Branch", value: data.bank.branch },
                { label: "Payment Mode", value: data.paymentMode },
              ]}
            />
          </DetailSection>

          <DetailSection title="Ageing" icon={AlertTriangle}>
            <DetailGrid
              columns={2}
              items={[
                {
                  label: "Days Overdue",
                  value:
                    data.daysOverdue > 0 ? (
                      <span className="text-destructive">
                        {data.daysOverdue} days
                      </span>
                    ) : (
                      "Not yet due"
                    ),
                },
                { label: "Due Date", value: data.dueDate },
              ]}
            />
          </DetailSection>

          <DetailSection title="Remark" icon={FileText}>
            <p className="text-sm text-foreground">{data.remark || "—"}</p>
          </DetailSection>
        </div>
      </div>
    </div>
  );
};

export default VendorPaymentDetail;
