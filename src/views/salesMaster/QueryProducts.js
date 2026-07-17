import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, IndianRupee } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { queryProducts } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const columns = [
  { key: "queryId", label: "Query #", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "sku", label: "SKU", sortable: true },
  { key: "qty", label: "Qty", sortable: true, align: "right" },
  {
    key: "targetRate",
    label: "Target Rate",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.targetRate),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const QueryProducts = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Query Products"
        description="Product-level detail for each client query. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Products in Queries"
          value={queryProducts.length}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Total Target Value"
          value={formatINR(
            queryProducts.reduce((sum, r) => sum + r.qty * r.targetRate, 0),
          )}
          icon={IndianRupee}
          color="success"
        />
      </div>

      <DataTable
        columns={columns}
        rows={queryProducts}
        rowKey={(r) => `${r.queryId}-${r.sku}`}
        exportFileName="query-products"
        onRowClick={(row) => navigate(`/sales-master/query/${row.queryId}`)}
      />
    </div>
  );
};

export default QueryProducts;
