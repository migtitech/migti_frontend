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
  formatQueryStatus,
  statusVariant,
} from "./components/statusFormatters";
import {
  queries,
  queryProducts,
  queryFollowups,
} from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const productColumns = [
  { key: "product", label: "Product", sortable: true },
  { key: "sku", label: "SKU" },
  { key: "qty", label: "Qty", align: "right" },
  {
    key: "targetRate",
    label: "Target Rate",
    align: "right",
    render: (r) => formatINR(r.targetRate),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const followupColumns = [
  { key: "followupDate", label: "Date", sortable: true },
  { key: "note", label: "Note" },
  { key: "nextAction", label: "Next Action" },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const QueryView = () => {
  const { id } = useParams();
  const query = queries.find((q) => q.id === id);

  if (!query) {
    return (
      <div className="space-y-6">
        <PageHeader title="Query not found" />
        <EmptyState
          title="Query not found"
          message="This sample query record doesn't exist."
        />
        <BackButton fallback="/sales-master/query" />
      </div>
    );
  }

  const products = queryProducts.filter((p) => p.queryId === query.id);
  const followups = queryFollowups.filter((f) => f.queryId === query.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={query.id}
        description="Query detail — sample data for UI preview."
        actions={<BackButton fallback="/sales-master/query" />}
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
            <p className="text-sm font-medium">{query.client}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Product
            </p>
            <p className="text-sm font-medium">{query.product}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Date
            </p>
            <p className="text-sm font-medium">{query.date}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Status
            </p>
            <StatusBadge variant={statusVariant(query.status)}>
              {formatQueryStatus(query.status)}
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

export default QueryView;
