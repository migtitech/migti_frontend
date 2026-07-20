import React from "react";
import { useParams } from "react-router-dom";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  BackButton,
} from "../../components";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui";
import {
  formatOrderStatus,
  statusVariant,
} from "./components/statusFormatters";
import { salesOrders } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const SalesOrderView = () => {
  const { id } = useParams();
  const order = salesOrders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sales order not found" />
        <EmptyState
          title="Order not found"
          message="This sample sales order record doesn't exist."
        />
        <BackButton fallback="/sales-master/sales-order/status" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.id}
        description="Sales order detail — sample data for UI preview."
        actions={<BackButton fallback="/sales-master/sales-order/status" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Client
            </p>
            <p className="text-sm font-medium">{order.client}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Date
            </p>
            <p className="text-sm font-medium">{order.date}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Items
            </p>
            <p className="text-sm font-medium">{order.items}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Amount
            </p>
            <p className="text-sm font-medium tabular-nums">
              {formatINR(order.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Status
            </p>
            <StatusBadge variant={statusVariant(order.status)}>
              {formatOrderStatus(order.status)}
            </StatusBadge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrderView;
