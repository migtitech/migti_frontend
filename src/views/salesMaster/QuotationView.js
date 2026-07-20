import React from "react";
import { useParams } from "react-router-dom";
import {
  PageHeader,
  StatusBadge,
  DataTable,
  EmptyState,
  BackButton,
} from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import {
  formatQuotationStatus,
  statusVariant,
} from "./components/statusFormatters";
import {
  quotations,
  quotationProducts,
  quotationFollowups,
} from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const productColumns = [
  { key: "product", label: "Product", sortable: true },
  { key: "sku", label: "SKU" },
  { key: "qty", label: "Qty", align: "right" },
  {
    key: "rate",
    label: "Rate",
    align: "right",
    render: (r) => formatINR(r.rate),
  },
  {
    key: "amount",
    label: "Amount",
    align: "right",
    render: (r) => formatINR(r.amount),
  },
];

const followupColumns = [
  { key: "followupDate", label: "Date", sortable: true },
  { key: "stage", label: "Stage" },
  { key: "note", label: "Note" },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const QuotationView = () => {
  const { id } = useParams();
  const quotation = quotations.find((q) => q.id === id);

  if (!quotation) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quotation not found" />
        <EmptyState
          title="Quotation not found"
          message="This sample quotation record doesn't exist."
        />
        <BackButton fallback="/sales-master/quotation" />
      </div>
    );
  }

  const products = quotationProducts.filter(
    (p) => p.quotationId === quotation.id,
  );
  const followups = quotationFollowups.filter(
    (f) => f.quotationId === quotation.id,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotation.id}
        description="Quotation detail — sample data for UI preview."
        actions={<BackButton fallback="/sales-master/quotation" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Client
            </p>
            <p className="text-sm font-medium">{quotation.client}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Date
            </p>
            <p className="text-sm font-medium">{quotation.date}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Amount
            </p>
            <p className="text-sm font-medium tabular-nums">
              {formatINR(quotation.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Status
            </p>
            <StatusBadge variant={statusVariant(quotation.status)}>
              {formatQuotationStatus(quotation.status)}
            </StatusBadge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>{products.length} line items</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={productColumns}
            rows={products}
            rowKey={(r) => r.sku}
            showSearch={false}
            maxHeight="none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
          <CardDescription>{followups.length} entries</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={followupColumns}
            rows={followups}
            rowKey={(r) => r.followupDate}
            showSearch={false}
            maxHeight="none"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationView;
