import React from "react";
import { useNavigate } from "react-router-dom";
import { CChartBar } from "@coreui/react-chartjs";
import { Package, IndianRupee, TrendingUp } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import { productSalesList } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const columns = [
  { key: "name", label: "Product", sortable: true },
  { key: "sku", label: "SKU", sortable: true },
  { key: "category", label: "Category", sortable: true },
  { key: "unitsSold", label: "Units Sold", sortable: true, align: "right" },
  {
    key: "avgRate",
    label: "Avg Rate",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.avgRate),
  },
  {
    key: "revenue",
    label: "Revenue",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.revenue),
    sortValue: (row) => row.revenue,
  },
];

const ProductSalesList = () => {
  const navigate = useNavigate();
  const totalUnits = productSalesList.reduce((sum, p) => sum + p.unitsSold, 0);
  const totalRevenue = productSalesList.reduce((sum, p) => sum + p.revenue, 0);
  const topProduct = [...productSalesList].sort(
    (a, b) => b.revenue - a.revenue,
  )[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Sales List"
        description="Product-wise sales performance across your clients. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Products Sold"
          value={productSalesList.length}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Total Units"
          value={totalUnits.toLocaleString("en-IN")}
          icon={TrendingUp}
          color="info"
        />
        <StatCard
          title="Total Revenue"
          value={formatINR(totalRevenue)}
          icon={IndianRupee}
          color="success"
        />
        <StatCard
          title="Top Product"
          value={topProduct.name}
          subtitle={formatINR(topProduct.revenue)}
          icon={Package}
          color="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Product</CardTitle>
          <CardDescription>Sample distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <CChartBar
            style={{ height: "280px" }}
            data={{
              labels: productSalesList.map((p) => p.name),
              datasets: [
                {
                  label: "Revenue",
                  backgroundColor: "#2563eb",
                  data: productSalesList.map((p) => p.revenue),
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { callback: (v) => `₹${(v / 1000).toFixed(0)}k` },
                },
              },
            }}
          />
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={productSalesList}
        rowKey={(r) => r.sku}
        exportFileName="product-sales-list"
        onRowClick={(row) =>
          navigate(`/sales-master/product-sales-list/${row.sku}`)
        }
      />
    </div>
  );
};

export default ProductSalesList;
