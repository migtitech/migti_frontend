import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, IndianRupee } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import { quotationProducts } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const columns = [
  { key: "quotationId", label: "Quotation #", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "sku", label: "SKU", sortable: true },
  { key: "qty", label: "Qty", sortable: true, align: "right" },
  {
    key: "rate",
    label: "Rate",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.rate),
  },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.amount),
    sortValue: (row) => row.amount,
  },
];

const QuotationProducts = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Product"
        description="Product-level line items across your quotations. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Line Items"
          value={quotationProducts.length}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Total Value"
          value={formatINR(
            quotationProducts.reduce((sum, r) => sum + r.amount, 0),
          )}
          icon={IndianRupee}
          color="success"
        />
      </div>

      <DataTable
        columns={columns}
        rows={quotationProducts}
        rowKey={(r) => `${r.quotationId}-${r.sku}`}
        exportFileName="quotation-products"
        onRowClick={(row) =>
          navigate(`/sales-master/quotation/${row.quotationId}`)
        }
      />
    </div>
  );
};

export default QuotationProducts;
