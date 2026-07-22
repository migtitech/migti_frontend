import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Users, Upload, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  Input,
  Select,
  Textarea,
} from "../../../components/ui";
import { toastSuccess, toastError } from "../../../utils/toast";
import { localPurchaseAssignees } from "../../../data/purchaseMasterDummyData";

/**
 * Action menu opened from a Purchases Request (list row or detail page). Shows
 * two choices:
 *
 *  1. Assign to Local Purchase — hand the product to a local-purchase exec with
 *     a target date and remark; it then shows up in Local Purchase carrying all
 *     the info from this request.
 *  2. Other Purchase — go to the multi-product / single-supplier purchase flow
 *     (like Raise Billing Request, but you pick several products for one
 *     supplier). This request is pre-loaded into the flow.
 *
 * Frontend-only sample UI — assigning just toasts, nothing is persisted.
 */
const PurchaseRequestActionMenu = ({ open, onOpenChange, request }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("choose"); // choose | assign

  // Assign-to-local form state
  const [assignee, setAssignee] = useState(localPurchaseAssignees[0]?.id || "");
  const [targetDate, setTargetDate] = useState("");
  const [assignRemark, setAssignRemark] = useState("");

  // Reset to the chooser whenever the dialog is (re)opened.
  const handleOpenChange = (v) => {
    if (!v) setMode("choose");
    onOpenChange(v);
  };

  if (!request) return null;

  const goToPurchase = () => {
    onOpenChange(false);
    setMode("choose");
    navigate(`/purchase-request-bucket/purchase?pr=${request.id}`);
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
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader data-dialog-chrome className="px-6 pt-6">
          <DialogTitle>Action — {request.id}</DialogTitle>
          <DialogDescription>
            {request.product} · Qty {request.qty} · choose what to do with this
            request.
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="space-y-3 px-6 pb-6">
            <button
              type="button"
              onClick={() => setMode("assign")}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                <Users className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  Assign to Local Purchase
                </span>
                <span className="block text-sm text-muted-foreground">
                  Hand this product to a local-purchase executive.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={goToPurchase}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Other Purchase</span>
                <span className="block text-sm text-muted-foreground">
                  Buy multiple products from a single supplier in one request.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <form
            id="pr-assign-form"
            onSubmit={handleAssign}
            className="space-y-5 px-6 pb-2"
          >
            <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
              <Upload className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p>
                The same product — with all the details from this request — will
                move to <strong>Local Purchase</strong> for the person you pick
                here.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-assignee">Assign To</Label>
              <Select
                id="pr-assignee"
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
              <Label htmlFor="pr-target-date">Target Date</Label>
              <Input
                id="pr-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-assign-remark">Remark</Label>
              <Textarea
                id="pr-assign-remark"
                rows={3}
                placeholder="Instructions for the local-purchase person…"
                value={assignRemark}
                onChange={(e) => setAssignRemark(e.target.value)}
              />
            </div>
          </form>
        )}

        {mode === "assign" && (
          <DialogFooter data-dialog-chrome className="px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("choose")}
            >
              Back
            </Button>
            <Button type="submit" form="pr-assign-form">
              <Users className="mr-1.5 h-4 w-4" />
              Assign to Local Purchase
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

PurchaseRequestActionMenu.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  request: PropTypes.object,
};

export default PurchaseRequestActionMenu;
