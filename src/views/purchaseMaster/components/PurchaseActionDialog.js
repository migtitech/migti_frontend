import React, { useState } from "react";
import PropTypes from "prop-types";
import { ShoppingCart, Users, Upload, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Label,
  Input,
  Select,
  Textarea,
} from "../../../components/ui";
import { FileUpload } from "../../../components";
import { toastSuccess, toastError } from "../../../utils/toast";
import {
  localPurchaseAssignees,
  purchasePriorityOptions,
  purchaseAuthorisers,
} from "../../../data/purchaseMasterDummyData";

/**
 * Action dialog opened from a Purchase Request (list or detail). Two tabs:
 *
 *  1. Direct Purchase — upload bill, upload bank details, target payment date,
 *     priority, product image, authorising person, remark. This is the "buy it
 *     now" path.
 *  2. Assign to Local Purchase — hand the same product to a local-purchase exec
 *     with a target date and remark; the item then shows up in Local Purchase
 *     carrying all the info from this request.
 *
 * Frontend-only sample UI — submitting just toasts, nothing is persisted.
 */
const noop = () => {};

const PurchaseActionDialog = ({ open, onOpenChange, request }) => {
  const [tab, setTab] = useState("purchase");

  // Direct-purchase form state
  const [priority, setPriority] = useState(request?.priority || "medium");
  const [payDate, setPayDate] = useState("");
  const [authoriser, setAuthoriser] = useState(purchaseAuthorisers[0]);
  const [purchaseRemark, setPurchaseRemark] = useState("");

  // Assign-to-local form state
  const [assignee, setAssignee] = useState(localPurchaseAssignees[0]?.id || "");
  const [targetDate, setTargetDate] = useState("");
  const [assignRemark, setAssignRemark] = useState("");

  if (!request) return null;

  const handlePurchase = (e) => {
    e.preventDefault();
    if (!payDate) {
      toastError("Set a target payment date before confirming the purchase.");
      return;
    }
    toastSuccess(
      `${request.id} marked for direct purchase — priority ${priority}, authorised by ${authoriser} (sample UI, not saved)`,
    );
    onOpenChange(false);
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!assignee) {
      toastError("Select a local-purchase person to assign this to.");
      return;
    }
    const person = localPurchaseAssignees.find((a) => a.id === assignee);
    toastSuccess(
      `${request.id} assigned to ${person?.name || "local purchase"} — all details carried over (sample UI, not saved)`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader data-dialog-chrome className="px-6 pt-6">
          <DialogTitle>Action — {request.id}</DialogTitle>
          <DialogDescription>
            {request.product} · Qty {request.qty} · choose to purchase directly
            or assign it to Local Purchase.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="purchase" className="flex-1 justify-center">
                <ShoppingCart className="h-4 w-4" />
                Direct Purchase
              </TabsTrigger>
              <TabsTrigger value="assign" className="flex-1 justify-center">
                <Users className="h-4 w-4" />
                Assign to Local Purchase
              </TabsTrigger>
            </TabsList>

            {/* ---- Direct Purchase ---- */}
            <TabsContent value="purchase">
              <form
                id="purchase-form"
                onSubmit={handlePurchase}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Upload Bill</Label>
                    <FileUpload
                      accept="image/*,application/pdf"
                      onChange={noop}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Upload Bank Details</Label>
                    <FileUpload
                      accept="image/*,application/pdf"
                      onChange={noop}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Product Image</Label>
                    <FileUpload accept="image/*" onChange={noop} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pay-date">Target Payment Date</Label>
                    <Input
                      id="pay-date"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      {purchasePriorityOptions.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="authoriser">
                      <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                      Authorised By
                    </Label>
                    <Select
                      id="authoriser"
                      value={authoriser}
                      onChange={(e) => setAuthoriser(e.target.value)}
                    >
                      {purchaseAuthorisers.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchase-remark">Remark</Label>
                  <Textarea
                    id="purchase-remark"
                    rows={3}
                    placeholder='e.g. "Mukesh ki taraf se OK hai, isliye purchase kar lo."'
                    value={purchaseRemark}
                    onChange={(e) => setPurchaseRemark(e.target.value)}
                  />
                </div>
              </form>
            </TabsContent>

            {/* ---- Assign to Local Purchase ---- */}
            <TabsContent value="assign">
              <form
                id="assign-form"
                onSubmit={handleAssign}
                className="space-y-5"
              >
                <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
                  <Upload className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <p>
                    The same product — with all the details from this request —
                    will move to <strong>Local Purchase</strong> for the person
                    you pick here.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assignee">Assign To</Label>
                  <Select
                    id="assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    {localPurchaseAssignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target-date">Target Date</Label>
                  <Input
                    id="target-date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assign-remark">Remark</Label>
                  <Textarea
                    id="assign-remark"
                    rows={3}
                    placeholder="Instructions for the local-purchase person…"
                    value={assignRemark}
                    onChange={(e) => setAssignRemark(e.target.value)}
                  />
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter data-dialog-chrome className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {tab === "purchase" ? (
            <Button type="submit" form="purchase-form">
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Confirm Purchase
            </Button>
          ) : (
            <Button type="submit" form="assign-form">
              <Users className="mr-1.5 h-4 w-4" />
              Assign to Local Purchase
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

PurchaseActionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  request: PropTypes.object,
};

export default PurchaseActionDialog;
