import React from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Factory,
  Clipboard,
  DollarSign,
  Bell,
  Folder,
  ArrowRight,
  ShoppingBasket,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Progress,
} from "../../components/ui";
import { cn } from "../../lib/utils";

const StatCard = ({ title, value, icon: Icon, tint }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              tint,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

const BucketCard = ({ icon: Icon, title, description, to, tint }) => (
  <Card className="flex h-full flex-col">
    <CardHeader className="flex flex-row items-center gap-2 space-y-0">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          tint,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col pt-0">
      <p className="mb-3 flex-1 text-sm text-muted-foreground">{description}</p>
      <Button asChild className="self-start">
        <Link to={to}>
          Open <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </CardContent>
  </Card>
);

const SummaryItem = ({ label, children, accent }) => (
  <div className={cn("rounded-lg border-l-4 bg-muted/40 px-3 py-2", accent)}>
    <div className="truncate text-sm text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{children}</div>
  </div>
);

const PurchaseDashboard = () => {
  const { user } = useAuth();

  // Dummy data for demonstration
  const stats = {
    totalPurchases: 850000,
    pendingPOs: 15,
    activeVendors: 32,
    pendingApprovals: 7,
  };

  const purchaseOrders = [
    {
      id: "PO001",
      vendor: "Steel Suppliers Ltd",
      amount: 125000,
      status: "Approved",
      date: "2024-01-15",
    },
    {
      id: "PO002",
      vendor: "Raw Materials Inc",
      amount: 78000,
      status: "Pending",
      date: "2024-01-14",
    },
    {
      id: "PO003",
      vendor: "Component World",
      amount: 45000,
      status: "Delivered",
      date: "2024-01-13",
    },
    {
      id: "PO004",
      vendor: "Industrial Parts Co",
      amount: 92000,
      status: "In Transit",
      date: "2024-01-12",
    },
    {
      id: "PO005",
      vendor: "Machine Tools Ltd",
      amount: 156000,
      status: "Pending",
      date: "2024-01-11",
    },
  ];

  const topVendors = [
    { name: "Steel Suppliers Ltd", orders: 25, value: 1250000, rating: 4.8 },
    { name: "Raw Materials Inc", orders: 18, value: 890000, rating: 4.5 },
    { name: "Component World", orders: 15, value: 650000, rating: 4.7 },
    { name: "Industrial Parts Co", orders: 12, value: 480000, rating: 4.2 },
  ];

  const getStatusVariant = (status) => {
    const variants = {
      Pending: "warning",
      Approved: "info",
      "In Transit": "default",
      Delivered: "success",
      Cancelled: "destructive",
    };
    return variants[status] || "secondary";
  };

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Purchase Dashboard - Manage procurement activities"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BucketCard
          icon={ShoppingCart}
          title="Procurement Bucket"
          description="View and manage purchase tasks, rates, and procurement activities."
          to="/purchase-tasks"
          tint="bg-primary/10 text-primary!"
        />
        <BucketCard
          icon={Bell}
          title="Follow up Bucket"
          description="Track and manage follow-ups on queries, quotations, and orders."
          to="/follow-up"
          tint="bg-accent text-accent-foreground"
        />
        <BucketCard
          icon={Folder}
          title="DMG Bucket"
          description="DMG-related items and direct material group activities."
          to="/dmg"
          tint="bg-success-muted text-success!"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <BucketCard
          icon={ShoppingBasket}
          title="Pro Bucket"
          description="Query line items for your product groups: rates, status, and fulfillment."
          to="/pro-bucket"
          tint="bg-primary/10 text-primary!"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Purchases"
          value={`₹${(stats.totalPurchases / 100000).toFixed(1)}L`}
          icon={DollarSign}
          tint="bg-primary/10 text-primary!"
        />
        <StatCard
          title="Pending Sales Orders"
          value={stats.pendingPOs.toString()}
          icon={ShoppingCart}
          tint="bg-warning-muted text-warning!"
        />
        <StatCard
          title="Active Vendors"
          value={stats.activeVendors.toString()}
          icon={Factory}
          tint="bg-success-muted text-success!"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals.toString()}
          icon={Clipboard}
          tint="bg-destructive/10 text-destructive"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Sales Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Order Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{po.id}</TableCell>
                    <TableCell>{po.vendor}</TableCell>
                    <TableCell>₹{po.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(po.status)}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Vendors</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topVendors.map((vendor, index) => (
              <div key={index} className="mb-3">
                <div className="mb-1 flex justify-between">
                  <span className="font-semibold">{vendor.name}</span>
                  <Badge variant="success">{vendor.rating}</Badge>
                </div>
                <div className="mb-1 text-sm text-muted-foreground">
                  {vendor.orders} orders • ₹{(vendor.value / 100000).toFixed(1)}
                  L
                </div>
                <Progress
                  value={(vendor.value / topVendors[0].value) * 100}
                  color="info"
                  className="mb-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Purchase Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryItem label="This Month" accent="border-primary!">
              ₹8.5L
            </SummaryItem>
            <SummaryItem label="Cost Savings" accent="border-success!">
              ₹1.2L (12%)
            </SummaryItem>
            <SummaryItem label="Pending Deliveries" accent="border-warning!">
              8 Orders
            </SummaryItem>
            <SummaryItem label="Avg Lead Time" accent="border-primary!">
              5 Days
            </SummaryItem>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseDashboard;
