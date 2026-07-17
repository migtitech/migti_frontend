import React, { useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { PageHeader } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Label,
  Select,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  salesOrderCatalog,
  salesOrderClients,
} from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * Presentational-only "Create Sales Order" form: all state is local, no API
 * calls. Submitting shows a success toast and resets the form — this is a
 * sample-data UI preview, not wired to the real Sales Order backend flow.
 */
const CreateSalesOrder = () => {
  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState([{ sku: "", qty: 1 }]);

  const addLine = () => setLines((prev) => [...prev, { sku: "", qty: 1 }]);
  const removeLine = (index) =>
    setLines((prev) => prev.filter((_, i) => i !== index));
  const updateLine = (index, patch) =>
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );

  const rows = useMemo(
    () =>
      lines.map((line) => {
        const product = salesOrderCatalog.find((p) => p.sku === line.sku);
        const qty = Number(line.qty) || 0;
        const amount = product ? product.rate * qty : 0;
        return { ...line, product, amount };
      }),
    [lines],
  );

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const client = salesOrderClients.find((c) => c.id === clientId);
    if (!client) {
      toastError("Select a client before creating the order.");
      return;
    }
    if (!rows.some((r) => r.product && r.qty > 0)) {
      toastError("Add at least one product line.");
      return;
    }
    toastSuccess(
      `Sales order created for ${client.name} — ${formatINR(total)} (sample UI, not saved).`,
    );
    setClientId("");
    setLines([{ sku: "", qty: 1 }]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Sales Order"
        description="Draft a new sales order for a client. Sample/demo form — not wired to the backend."
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Choose a client and add products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="som-client">Client</Label>
              <Select
                id="som-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Select client…</option>
                {salesOrderClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">&nbsp;</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={row.sku}
                          onChange={(e) =>
                            updateLine(index, { sku: e.target.value })
                          }
                        >
                          <option value="">Select product…</option>
                          {salesOrderCatalog.map((p) => (
                            <option key={p.sku} value={p.sku}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.product ? formatINR(row.product.rate) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="1"
                          className="w-20 text-right"
                          value={row.qty}
                          onChange={(e) =>
                            updateLine(index, { qty: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatINR(row.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add product
            </Button>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Order Total</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatINR(total)}
              </p>
            </div>
            <Button type="submit">
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Create Sales Order
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default CreateSalesOrder;
