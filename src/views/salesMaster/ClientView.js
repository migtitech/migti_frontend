import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  ShoppingBag,
  IndianRupee,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
} from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import {
  clients,
  quotations,
  queries,
  salesOrders,
} from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const ClientView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="space-y-6">
        <PageHeader title="Client not found" />
        <EmptyState
          title="No such client"
          message="This sample client record doesn't exist."
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/sales-master/clients")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const relatedQueries = queries.filter((q) => q.client === client.name);
  const relatedQuotations = quotations.filter((q) => q.client === client.name);
  const relatedOrders = salesOrders.filter((o) => o.client === client.name);

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description="Client detail — sample data for UI preview."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/sales-master/clients")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Clients
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Orders"
          value={client.orders}
          icon={ShoppingBag}
          color="primary"
        />
        <StatCard
          title="Lifetime Value"
          value={formatINR(client.lifetimeValue)}
          icon={IndianRupee}
          color="success"
        />
        <StatCard title="City" value={client.city} icon={MapPin} color="info" />
        <StatCard
          title="Phone"
          value={client.phone}
          icon={Phone}
          color="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Contact Person
            </p>
            <p className="text-sm font-medium">{client.contact}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Phone
            </p>
            <p className="text-sm font-medium">{client.phone}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Status
            </p>
            <StatusBadge
              status={client.status}
              variant={statusVariant(client.status)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Queries</CardTitle>
            <CardDescription>{relatedQueries.length} on record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedQueries.length === 0 && (
              <p className="text-sm text-muted-foreground">No queries yet.</p>
            )}
            {relatedQueries.map((q) => (
              <button
                type="button"
                key={q.id}
                onClick={() => navigate(`/sales-master/query/${q.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <span className="font-medium">{q.id}</span>
                <StatusBadge
                  status={q.status}
                  variant={statusVariant(q.status)}
                />
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quotations</CardTitle>
            <CardDescription>
              {relatedQuotations.length} on record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedQuotations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No quotations yet.
              </p>
            )}
            {relatedQuotations.map((q) => (
              <button
                type="button"
                key={q.id}
                onClick={() => navigate(`/sales-master/quotation/${q.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <span className="font-medium">{q.id}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatINR(q.amount)}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales Orders</CardTitle>
            <CardDescription>{relatedOrders.length} on record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedOrders.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sales orders yet.
              </p>
            )}
            {relatedOrders.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => navigate(`/sales-master/sales-order/${o.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <span className="font-medium">{o.id}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatINR(o.amount)}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientView;
