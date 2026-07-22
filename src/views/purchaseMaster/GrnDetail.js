import React from "react";
import { useParams } from "react-router-dom";
import {
  Truck,
  Package,
  ClipboardCheck,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Recycle,
} from "lucide-react";
import { PageHeader, StatusBadge } from "../../components";
import {
  Badge,
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
} from "./components/DetailPrimitives";
import { getGrnDetail } from "../../data/purchaseMasterDummyData";

/**
 * GRN — full detail page. Shows the whole receipt story end to end: receipt
 * info (PO, supplier, invoice, vehicle, gate pass), the received lines with
 * accepted/rejected split, the quality check outcome, any linked purchase
 * return, documents, remark and a timeline. Read-only, sample data only.
 */
const GrnDetail = () => {
  const { id } = useParams();
  const data = getGrnDetail(id);

  if (data.notFound) {
    return (
      <div className="space-y-6">
        <PageHeader title={`GRN ${id}`} back="/purchase-master/grn" />
        <DetailNotFound label="GRN" id={id} />
      </div>
    );
  }

  const qc = data.qc || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`GRN · ${data.id}`}
        description={`${data.supplier} · PO ${data.po}`}
        back="/purchase-master/grn"
      />

      {/* Snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={data.status}
          variant={statusVariant(data.status)}
        />
        <Badge variant={statusVariant(qc.status)}>
          {qc.status === "pass" ? (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          ) : (
            <AlertTriangle className="mr-1 h-3 w-3" />
          )}
          QC: {qc.status || "—"}
        </Badge>
        {data.linkedReturn ? (
          <Badge variant="destructive">
            <Recycle className="mr-1 h-3 w-3" />
            Return: {data.linkedReturn}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection title="Receipt Info" icon={Truck}>
            <DetailGrid
              items={[
                { label: "PO #", value: data.po },
                { label: "Supplier", value: data.supplier },
                { label: "Supplier Code", value: data.supplierCode },
                { label: "Received By", value: data.receivedBy },
                { label: "Received On", value: data.receivedOn },
                { label: "Invoice No", value: data.invoiceNo },
                { label: "Vehicle No", value: data.vehicleNo },
                { label: "Gate Pass", value: data.gatePass },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Received Lines"
            icon={Package}
            description="Ordered vs received, with accepted / rejected split per line."
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Bin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.lines || []).map((line, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{line.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.sku}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.qtyOrdered}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.qtyReceived}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.qtyAccepted}
                      </TableCell>
                      <TableCell
                        className={
                          line.qtyRejected > 0
                            ? "text-right tabular-nums text-destructive"
                            : "text-right tabular-nums"
                        }
                      >
                        {line.qtyRejected}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.condition}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.bin}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DetailSection>

          <DetailSection title="Quality Check" icon={ClipboardCheck}>
            <DetailGrid
              items={[
                {
                  label: "Status",
                  value: (
                    <Badge variant={statusVariant(qc.status)}>
                      {qc.status || "—"}
                    </Badge>
                  ),
                },
                { label: "Checked By", value: qc.checkedBy },
                { label: "Note", value: qc.note, full: true },
              ]}
            />
          </DetailSection>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <DetailSection title="Linked Return" icon={Recycle}>
            {data.linkedReturn ? (
              <p className="text-sm font-medium text-foreground">
                {data.linkedReturn}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </DetailSection>

          <DetailSection title="Documents" icon={FileText}>
            {data.documents && data.documents.length ? (
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
    </div>
  );
};

export default GrnDetail;
