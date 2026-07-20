import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IndianRupee,
  ShoppingCart,
  Clock,
  AlarmClockOff,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import PageHeader from "../../components/PageHeader/PageHeader";
import StatCard from "../../components/StatCard/StatCard";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DataTable from "../../components/DataTable/DataTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Switch,
} from "../../components/ui";
import { toastSuccess } from "../../utils/toast";
import {
  useRateMasterProducts,
  productStatus,
  productVisibleToSales,
  setProductSalesVisibility,
} from "./rateMasterStore";

/**
 * Rate Master board — mock/demo screen only. All data is dummy and held in
 * an in-memory store; nothing here talks to the backend. Clicking a
 * product navigates to its own Variants page.
 */
const RateMasterBoard = () => {
  const products = useRateMasterProducts();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const withPrice = products.filter((p) =>
      p.variants.some((v) => v.status === "priced" || v.status === "expiring"),
    ).length;
    const inSales = products.filter((p) => productVisibleToSales(p)).length;
    const needRate = products.filter((p) =>
      p.variants.some((v) => v.status === "pending"),
    ).length;
    const expiring = products.filter((p) =>
      p.variants.some((v) => v.status === "expiring"),
    ).length;
    return { withPrice, inSales, needRate, expiring };
  }, [products]);

  const productColumns = useMemo(
    () => [
      { key: "id", label: "Product Code", width: 120 },
      {
        key: "name",
        label: "Product Name",
        render: (row) => (
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.sku}</div>
          </div>
        ),
      },
      { key: "category", label: "Category" },
      {
        key: "variants",
        label: "Variants",
        align: "center",
        exportable: false,
        render: (row) => row.variants.length,
      },
      {
        key: "inSalesList",
        label: "In Sales Master",
        align: "center",
        exportValue: (row) => (productVisibleToSales(row) ? "Yes" : "No"),
        render: (row) => {
          const visible = productVisibleToSales(row);
          return (
            <div className="flex items-center justify-center gap-2">
              <Switch
                checked={visible}
                onCheckedChange={(checked) => {
                  setProductSalesVisibility(row.id, checked);
                  toastSuccess(
                    checked
                      ? `${row.name} shown in Sales Master`
                      : `${row.name} hidden from Sales Master`,
                  );
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label="Toggle product in sales master"
              />
              {visible ? (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Rate Status",
        align: "center",
        exportable: false,
        render: (row) => {
          const s = productStatus(row);
          const label =
            s === "priced"
              ? "Priced"
              : s === "expiring"
                ? "Expiring Soon"
                : "Rate Pending";
          return (
            <StatusBadge
              status={
                s === "priced"
                  ? "active"
                  : s === "expiring"
                    ? "expired"
                    : "pending"
              }
              children={label}
            />
          );
        },
      },
      {
        key: "action",
        label: "",
        exportable: false,
        toggleable: false,
        align: "right",
        render: () => (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary!">
            View Variants <ChevronRight className="h-4 w-4" />
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Rate Master"
        description="Review priced products, spot rates that need attention, and set selling rates per variant. (Demo data — nothing here is saved to the server.)"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Products With Price"
          value={stats.withPrice}
          subtitle={`out of ${products.length} products`}
          icon={IndianRupee}
          color="success"
        />
        <StatCard
          title="Products In Sales List"
          value={stats.inSales}
          subtitle="Currently visible to sales team"
          icon={ShoppingCart}
          color="primary"
        />
        <StatCard
          title="Rates Pending"
          value={stats.needRate}
          subtitle="Products with at least one un-rated variant"
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Rates Expiring Soon"
          value={stats.expiring}
          subtitle="Valid for 5 days or less"
          icon={AlarmClockOff}
          color="danger"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            Click a product to open its variants and set or reassign rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={productColumns}
            rows={products}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/master/rate-master/${row.id}`)}
            searchPlaceholder="Search products..."
            exportFileName="rate-master-products"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RateMasterBoard;
