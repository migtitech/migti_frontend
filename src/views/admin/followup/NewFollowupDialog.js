import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarClock,
  History,
  Lock,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Select,
  Textarea,
} from "../../../components/ui";
import { cn } from "../../../lib/utils";
import { toastError, toastSuccess } from "../../../utils/toast";
import { dateFormatter } from "../../../utils/dateFormatter";
import {
  FOLLOWUP_DECISIONS,
  getDecision,
  sampleQuotationsForFollowup,
} from "../../../data/quotationFollowupSample";

const formatINR = (v) =>
  v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;

/** Today as an ISO yyyy-mm-dd string (local), for the read-only date field. */
const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const decisionBadge = (key) => {
  const d = getDecision(key);
  if (!d) return null;
  return <Badge variant={d.badgeVariant}>{d.statusLabel}</Badge>;
};

const NewFollowupDialog = ({ open, onOpenChange, onSaved }) => {
  const today = useMemo(() => todayISO(), []);

  const [quotationId, setQuotationId] = useState("");
  const [decisionKey, setDecisionKey] = useState("");
  const [presetRemark, setPresetRemark] = useState("");
  const [otherRemark, setOtherRemark] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [saving, setSaving] = useState(false);

  const quotation = useMemo(
    () => sampleQuotationsForFollowup.find((q) => q.id === quotationId) || null,
    [quotationId],
  );

  const decision = getDecision(decisionKey);
  const isOther = decisionKey === "other";

  /** Last 3 previous follow-ups, newest first. */
  const previous3 = useMemo(() => {
    if (!quotation) return [];
    return [...(quotation.previousFollowups || [])]
      .sort((a, b) => (b.sequence || 0) - (a.sequence || 0))
      .slice(0, 3);
  }, [quotation]);

  const nextSequence = quotation
    ? (quotation.previousFollowups?.length || 0) + 1
    : 1;

  const resetForm = () => {
    setQuotationId("");
    setDecisionKey("");
    setPresetRemark("");
    setOtherRemark("");
    setNextDate("");
    setAttachment(null);
  };

  const close = () => {
    if (saving) return;
    resetForm();
    onOpenChange(false);
  };

  const effectiveRemark = isOther ? otherRemark.trim() : presetRemark.trim();

  const handleSave = () => {
    if (!quotation) {
      toastError("Select a quotation first");
      return;
    }
    if (!decisionKey) {
      toastError("Choose a follow-up decision");
      return;
    }
    if (!effectiveRemark) {
      toastError(
        isOther ? "Type your remark" : "Pick a remark for this decision",
      );
      return;
    }
    setSaving(true);
    // Sample flow — no backend. Build the record the API would receive.
    const record = {
      quotationCode: quotation.quotationCode,
      sequence: nextSequence,
      date: today,
      decision: decisionKey,
      newStatus: decision?.status,
      remark: effectiveRemark,
      nextFollowupDate: nextDate || null,
      attachmentName: attachment?.name || null,
    };
    setTimeout(() => {
      setSaving(false);
      toastSuccess(
        `Follow-up #${nextSequence} saved — ${quotation.quotationCode} marked ${decision?.statusLabel}`,
      );
      onSaved?.(record);
      resetForm();
      onOpenChange(false);
    }, 350);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent
        showClose={!saving}
        className="max-w-2xl"
        onInteractOutside={(e) => saving && e.preventDefault()}
        onEscapeKeyDown={(e) => saving && e.preventDefault()}
        aria-label="New follow-up"
      >
        <DialogHeader className="gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary!">
            <Plus className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>New Follow-up</DialogTitle>
            <DialogDescription>
              Pick a quotation, review its last follow-ups, then log a new one.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1. Quotation select */}
          <div className="space-y-1.5">
            <Label>
              Quotation number <span className="text-destructive">*</span>
            </Label>
            <Select
              value={quotationId}
              onChange={(e) => {
                setQuotationId(e.target.value);
                setDecisionKey("");
                setPresetRemark("");
                setOtherRemark("");
              }}
            >
              <option value="">— Select quotation —</option>
              {sampleQuotationsForFollowup.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quotationCode} · {q.company}
                </option>
              ))}
            </Select>
          </div>

          {quotation && (
            <>
              {/* Quotation summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">
                    {quotation.quotationCode}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {quotation.company}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">
                    Value
                  </div>
                  <div className="font-semibold text-foreground">
                    {formatINR(quotation.amount)}
                  </div>
                </div>
              </div>

              {/* 2. Previous 3 follow-ups */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Previous follow-ups
                  <Badge variant="secondary">
                    {quotation.previousFollowups?.length || 0}
                  </Badge>
                </div>
                {previous3.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
                    No follow-ups logged yet — this will be the first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {previous3.map((f) => (
                      <div
                        key={f.sequence}
                        className="rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">#{f.sequence}</Badge>
                          {decisionBadge(f.decision)}
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {dateFormatter(f.date, "—")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {f.by}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{f.remark}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. New follow-up form */}
              <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Plus className="h-4 w-4 text-primary!" />
                  New follow-up
                  <Badge variant="secondary">#{nextSequence}</Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Date — today, read only */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> Date
                    </Label>
                    <div className="relative">
                      <Input value={today} readOnly tabIndex={-1} />
                      <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto-set to today, cannot be changed.
                    </p>
                  </div>

                  {/* Next follow-up date */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" /> Next follow-up
                      date
                    </Label>
                    <Input
                      type="date"
                      value={nextDate}
                      min={today}
                      onChange={(e) => setNextDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Decision */}
                <div className="mt-4 space-y-1.5">
                  <Label>
                    Follow-up decision{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {FOLLOWUP_DECISIONS.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => {
                          setDecisionKey(d.key);
                          setPresetRemark("");
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                          decisionKey === d.key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {decision && (
                    <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                      On save, {quotation.quotationCode} will be marked{" "}
                      {decisionBadge(decision.key)} — {decision.hint}
                    </p>
                  )}
                </div>

                {/* Remark: presets for a decision, or free text for Other */}
                {decision && !isOther && (
                  <div className="mt-4 space-y-1.5">
                    <Label>
                      Remark <span className="text-destructive">*</span>
                    </Label>
                    <div className="space-y-1.5">
                      {decision.presets.map((p) => (
                        <label
                          key={p}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                            presetRemark === p
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted",
                          )}
                        >
                          <input
                            type="radio"
                            name="preset-remark"
                            className="mt-0.5"
                            checked={presetRemark === p}
                            onChange={() => setPresetRemark(p)}
                          />
                          <span className="text-foreground">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {isOther && (
                  <div className="mt-4 space-y-1.5">
                    <Label>
                      Remark <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      rows={3}
                      value={otherRemark}
                      onChange={(e) => setOtherRemark(e.target.value)}
                      placeholder="Type your own follow-up remark…"
                    />
                  </div>
                )}

                {/* Attachment (optional) */}
                <div className="mt-4 space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Attachment{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  {attachment ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                      <span className="truncate" title={attachment.name}>
                        {attachment.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setAttachment(null)}
                        aria-label="Remove attachment"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      onChange={(e) =>
                        setAttachment(e.target.files?.[0] || null)
                      }
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !quotation}
          >
            {saving ? "Saving…" : "Save follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewFollowupDialog;
