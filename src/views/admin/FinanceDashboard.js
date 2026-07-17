import React from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import { FileText, ShoppingCart, DollarSign, Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Progress,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { PageHeader, StatusBadge, StatCard } from "../../components";
import { useData } from "../../context/DataContext";

const FinanceDashboard = () => {
  const { quotations, purchaseOrders, queries } = useData();

  // Calculate statistics
  const totalQuotations = quotations?.length || 0;
  const acceptedQuotations =
    quotations?.filter((q) => q.status === "accepted").length || 0;
  const totalQuotationValue =
    quotations?.reduce((sum, q) => sum + (q.totalAmount || 0), 0) || 0;
  const acceptedQuotationValue =
    quotations
      ?.filter((q) => q.status === "accepted")
      .reduce((sum, q) => sum + (q.totalAmount || 0), 0) || 0;

  const totalPurchaseOrders = purchaseOrders?.length || 0;
  const deliveredOrders =
    purchaseOrders?.filter((o) => o.status === "delivered").length || 0;
  const totalPurchaseValue =
    purchaseOrders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0;
  const pendingPurchaseValue =
    purchaseOrders
      ?.filter((o) => o.status === "pending")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0;

  const totalQueries = queries?.length || 0;
  const convertedQueries =
    queries?.filter((q) => q.status === "quoted" || q.status === "closed")
      .length || 0;

  // Calculate conversion rate
  const conversionRate =
    totalQueries > 0 ? ((convertedQueries / totalQueries) * 100).toFixed(1) : 0;

  // Sample data for charts
  const monthlyRevenue = [45000, 52000, 48000, 61000, 55000, 67000];
  const monthlyExpenses = [32000, 38000, 35000, 42000, 40000, 48000];
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Dashboard"
        description="Overview of financial metrics and performance"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Quotation Value"
          value={`₹${totalQuotationValue.toLocaleString()}`}
          subtitle={`${acceptedQuotations} accepted`}
          icon={FileText}
          color="primary"
        />
        <StatCard
          title="Total Sales Orders"
          value={`₹${totalPurchaseValue.toLocaleString()}`}
          subtitle={`${deliveredOrders} delivered`}
          icon={ShoppingCart}
          color="info"
        />
        <StatCard
          title="Pending Payments"
          value={`₹${pendingPurchaseValue.toLocaleString()}`}
          subtitle="pending"
          icon={DollarSign}
          color="warning"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle={`${convertedQueries}/${totalQueries} queries`}
          icon={Users}
          color="success"
        />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "300px" }}
              data={{
                labels: months,
                datasets: [
                  {
                    label: "Revenue",
                    backgroundColor: "#2eb85c",
                    data: monthlyRevenue,
                  },
                  {
                    label: "Expenses",
                    backgroundColor: "#e55353",
                    data: monthlyExpenses,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => "₹" + value.toLocaleString(),
                    },
                  },
                },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartDoughnut
              style={{ height: "300px" }}
              data={{
                labels: [
                  "Pending",
                  "Approved",
                  "Shipped",
                  "Delivered",
                  "Cancelled",
                ],
                datasets: [
                  {
                    data: [
                      purchaseOrders?.filter((o) => o.status === "pending")
                        .length || 1,
                      purchaseOrders?.filter((o) => o.status === "approved")
                        .length || 1,
                      purchaseOrders?.filter((o) => o.status === "shipped")
                        .length || 1,
                      purchaseOrders?.filter((o) => o.status === "delivered")
                        .length || 1,
                      purchaseOrders?.filter((o) => o.status === "cancelled")
                        .length || 0,
                    ],
                    backgroundColor: [
                      "#f9b115",
                      "#39f",
                      "#636f83",
                      "#2eb85c",
                      "#e55353",
                    ],
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: "bottom",
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quotation Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Accepted</span>
                <span>
                  {totalQuotations > 0
                    ? ((acceptedQuotations / totalQuotations) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  totalQuotations > 0
                    ? (acceptedQuotations / totalQuotations) * 100
                    : 0
                }
                color="success"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Pending</span>
                <span>
                  {totalQuotations > 0
                    ? (
                        (quotations?.filter((q) => q.status === "sent").length /
                          totalQuotations) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  totalQuotations > 0
                    ? (quotations?.filter((q) => q.status === "sent").length /
                        totalQuotations) *
                      100
                    : 0
                }
                color="info"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Rejected</span>
                <span>
                  {totalQuotations > 0
                    ? (
                        (quotations?.filter((q) => q.status === "rejected")
                          .length /
                          totalQuotations) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  totalQuotations > 0
                    ? (quotations?.filter((q) => q.status === "rejected")
                        .length /
                        totalQuotations) *
                      100
                    : 0
                }
                color="destructive"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Draft</span>
                <span>
                  {totalQuotations > 0
                    ? (
                        (quotations?.filter((q) => q.status === "draft")
                          .length /
                          totalQuotations) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  totalQuotations > 0
                    ? (quotations?.filter((q) => q.status === "draft").length /
                        totalQuotations) *
                      100
                    : 0
                }
                color="secondary"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations?.slice(0, 3).map((q) => (
                  <TableRow key={`qt-${q.id}`}>
                    <TableCell>
                      <Badge>Quotation</Badge>
                    </TableCell>
                    <TableCell>QT-{String(q.id).padStart(4, "0")}</TableCell>
                    <TableCell>
                      ₹{q.totalAmount?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {purchaseOrders?.slice(0, 2).map((o) => (
                  <TableRow key={`po-${o.id}`}>
                    <TableCell>
                      <Badge variant="warning">Sales Order</Badge>
                    </TableCell>
                    <TableCell>
                      Sales Order-{String(o.id).padStart(4, "0")}
                    </TableCell>
                    <TableCell>
                      ₹{o.totalAmount?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {!quotations?.length && !purchaseOrders?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No recent transactions
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
