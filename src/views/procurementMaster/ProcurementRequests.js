import React, { useState } from "react";
import {
  Clipboard,
  MessageSquare,
  Send,
  ShieldCheck,
  Info,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from "../../components/ui";
import ProcurementMasterSubNav from "./components/ProcurementMasterSubNav";
import { statusVariant, stageLabel } from "./components/statusFormatters";
import { procurementRequests as initialRequests } from "../../data/procurementMasterDummyData";
import { toastSuccess, toastError } from "../../utils/toast";

const formatINR = (value) =>
  value == null
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Procurement Requests bucket: every product that lands in procurement —
 * fresh off a query, sent by the HOD for a rate, or sent for verification —
 * shows up here in one unified list. Bucket (Local/Brand) is auto-derived
 * from category. Submitting a rate here is what performance is measured
 * against. Sample data for UI preview, not wired to backend.
 */
const ProcurementRequests = () => {
  const [requests, setRequests] = useState(initialRequests);
  const [activeRow, setActiveRow] = useState(null);
  const [rateInput, setRateInput] = useState("");

  const fromQuery = requests.filter((r) => r.stage === "query");
  const hodRatePending = requests.filter((r) => r.stage === "hod_rate_pending");
  const verification = requests.filter((r) => r.stage === "verification");

  const openSubmitRate = (row) => {
    setActiveRow(row);
    setRateInput("");
  };

  const closeDialog = () => {
    setActiveRow(null);
    setRateInput("");
  };

  const handleSubmitRate = () => {
    const rate = Number(rateInput);
    if (!rateInput || Number.isNaN(rate) || rate <= 0) {
      toastError("Enter a valid rate.");
      return;
    }
    setRequests((prev) =>
      prev.map((r) =>
        r.id === activeRow.id
          ? {
              ...r,
              submittedRate: rate,
              rateStatus: "submitted",
              stage: "verification",
              status: "rate_submitted",
            }
          : r,
      ),
    );
    toastSuccess(
      `Rate ₹${rate} submitted for ${activeRow.product} (target was ${formatINR(activeRow.targetRate)}). Sent for verification.`,
    );
    closeDialog();
  };

  const columns = [
    { key: "id", label: "Req #", sortable: true },
    { key: "product", label: "Product", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "bucketType",
      label: "Bucket",
      render: (row) => (
        <Badge variant={row.bucketType === "brand" ? "info" : "secondary"}>
          {row.bucketType === "brand" ? "Brand" : "Local"}
        </Badge>
      ),
    },
    {
      key: "stage",
      label: "Stage",
      render: (row) => (
        <StatusBadge
          status={stageLabel(row.stage)}
          variant={statusVariant(row.stage)}
        />
      ),
    },
    {
      key: "targetRate",
      label: "Target Rate",
      align: "right",
      render: (row) => formatINR(row.targetRate),
      sortValue: (row) => row.targetRate,
    },
    {
      key: "submittedRate",
      label: "Submitted Rate",
      align: "right",
      render: (row) => formatINR(row.submittedRate),
      sortValue: (row) => row.submittedRate ?? -1,
    },
    { key: "receivedOn", label: "Received On", sortable: true },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        row.rateStatus === "pending" ? (
          <Button size="sm" onClick={() => openSubmitRate(row)}>
            Submit Rate
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Submitted</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Requests"
        description="Products coming into procurement via query, HOD rate request, or verification all land here in one bucket. Sample data for UI preview."
      />
      <ProcurementMasterSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total in Bucket"
          value={requests.length}
          icon={Clipboard}
          color="primary"
        />
        <StatCard
          title="From Query"
          value={fromQuery.length}
          icon={MessageSquare}
          color="secondary"
        />
        <StatCard
          title="Sent for HOD Rate"
          value={hodRatePending.length}
          icon={Send}
          color="warning"
        />
        <StatCard
          title="Sent for Verification"
          value={verification.length}
          icon={ShieldCheck}
          color="info"
        />
      </div>

      <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          Local vs Brand bucket is decided automatically from the product's
          category. Submitting a rate against the target here is what your
          performance report is based on.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={requests}
        rowKey={(r) => r.id}
        exportFileName="procurement-requests"
      />

      <Dialog
        open={!!activeRow}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Rate</DialogTitle>
          </DialogHeader>
          {activeRow && (
            <div className="space-y-4 px-6 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activeRow.product}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeRow.category} · Target Rate:{" "}
                  <span className="font-medium text-foreground">
                    {formatINR(activeRow.targetRate)}
                  </span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="submitted-rate">Your Rate</Label>
                <Input
                  id="submitted-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="Enter rate"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitRate}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcurementRequests;
