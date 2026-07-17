import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import { duePayments } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const DuePaymentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = duePayments.find((p) => p.id === id);

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice not found" />
        <EmptyState
          title="No such invoice"
          message="This sample invoice record doesn't exist."
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/sales-master/due-payments")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Due Payments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.id}
        description="Invoice detail — sample data for UI preview."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/sales-master/due-payments")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Due Payments
          </Button>
        }
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
            <p className="text-sm font-medium">{invoice.client}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Due Date
            </p>
            <p className="text-sm font-medium">{invoice.dueDate}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Amount
            </p>
            <p className="text-sm font-medium tabular-nums">
              {formatINR(invoice.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Days Overdue
            </p>
            <p className="text-sm font-medium">
              {invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Status
            </p>
            <StatusBadge
              status={invoice.status}
              variant={statusVariant(invoice.status)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DuePaymentView;
