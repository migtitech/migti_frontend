import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { History } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from "../ui";
import quotationFollowupService from "../../services/quotationFollowupService";
import employeeService from "../../services/employeeService";
import { useAuth } from "../../context/AuthContext";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";
import {
  QUOTATION_REMARK_GROUPS,
  classifyFollowupRemark,
  FOLLOWUP_STATUS_META,
} from "../../utils/quotationFollowupRemarks";

const todayStr = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  followupId: "",
  followUpDate: todayStr(),
  remarkOption: "",
  remarkText: "",
  takenBy: "",
  nextFollowUpDate: "",
});

const sortHistoryNewestFirst = (history = []) =>
  [...history].sort(
    (a, b) =>
      new Date(b.followedUpAt || 0) - new Date(a.followedUpAt || 0) ||
      (b.sequence || 0) - (a.sequence || 0),
  );

/**
 * Shared "take a quotation follow-up" popup.
 *
 * Flow: pick the quotation number (its previous follow-ups appear),
 * then follow-up date, remark (standard dropdown, "Other" = manual),
 * who is taking the follow-up, and the required next follow-up date.
 * The saved remark drives the derived status — Lost remarks send the
 * quotation to the Lost Quotations page; Revise / On Hold remarks show
 * with that status on the dashboards.
 *
 * @param {boolean} open
 * @param {function} onClose
 * @param {function} [onSaved] - Called after a successful save with
 *   { row, remark, statusKey, form }.
 * @param {object} [initialRow] - Preselect this follow-up row (from a
 *   dashboard row action).
 */
const QuotationFollowupDialog = ({ open, onClose, onSaved, initialRow }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || "";

  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);

  /* reset + preselect when opened */
  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm(),
      followupId: initialRow?._id ? String(initialRow._id) : "",
      takenBy: String(currentUserId || ""),
    });
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRow?._id]);

  /* load follow-up rows for the quotation dropdown */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      setRowsLoading(true);
      try {
        const res = await quotationFollowupService.list({
          pageNumber: 1,
          pageSize: 100,
        });
        const payload = res?.data?.data ?? res?.data ?? res;
        if (alive) setRows(payload?.items || []);
      } catch (e) {
        if (alive) toastError(e?.message || "Failed to load quotations");
      } finally {
        if (alive) setRowsLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [open]);

  /* load employees for the "Follow-up By" dropdown */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await employeeService.getAll({
          pageNumber: 1,
          pageSize: 100,
        });
        const data = res?.data || res;
        const payload = data?.data ?? data;
        const list = payload?.employees || payload || [];
        if (alive && Array.isArray(list)) setEmployees(list);
      } catch {
        /* dropdown falls back to current user */
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [open]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const allRows =
    initialRow && !rows.some((r) => String(r._id) === String(initialRow._id))
      ? [initialRow, ...rows]
      : rows;

  const searchLower = search.trim().toLowerCase();
  const filteredRows = searchLower
    ? allRows.filter((r) =>
        `${r.quotationCode || ""} ${r.companyName || ""}`
          .toLowerCase()
          .includes(searchLower),
      )
    : allRows;

  const selectedRow = allRows.find(
    (r) => String(r._id) === String(form.followupId),
  );
  const selectedHistory = sortHistoryNewestFirst(
    selectedRow?.followupHistory || [],
  );

  const remarkIsOther = form.remarkOption === "Other";
  const finalRemark = remarkIsOther
    ? form.remarkText.trim()
    : form.remarkOption;

  const employeeOptions = (() => {
    const opts = employees
      .map((e) => ({
        id: String(e._id || e.id || ""),
        name: e.name || e.email || "Employee",
      }))
      .filter((e) => e.id);
    if (currentUserId && !opts.some((e) => e.id === String(currentUserId))) {
      opts.unshift({
        id: String(currentUserId),
        name: `${user?.name || user?.email || "Me"} (You)`,
      });
    }
    return opts;
  })();

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.followupId) {
      toastError("Select a quotation number first");
      return;
    }
    if (!form.followUpDate) {
      toastError("Select the follow-up date");
      return;
    }
    if (!finalRemark) {
      toastError(remarkIsOther ? "Enter the remark" : "Select a remark");
      return;
    }
    if (!form.takenBy) {
      toastError("Select who is taking the follow-up");
      return;
    }
    if (!form.nextFollowUpDate) {
      toastError("Next follow-up date is required");
      return;
    }
    if (form.nextFollowUpDate < form.followUpDate) {
      toastError("Next follow-up date cannot be before the follow-up date");
      return;
    }

    const takenByName =
      employeeOptions.find((o) => o.id === String(form.takenBy))?.name || "";
    const remarkString = `${finalRemark} | Follow-up date: ${dateFormatter(
      form.followUpDate,
      form.followUpDate,
    )} | By: ${takenByName || "—"} | Next follow-up: ${dateFormatter(
      form.nextFollowUpDate,
      form.nextFollowUpDate,
    )}`;

    setSaving(true);
    try {
      await quotationFollowupService.updateRemark(
        form.followupId,
        remarkString,
      );

      const statusKey = classifyFollowupRemark(finalRemark);
      if (statusKey === "lost") {
        toastSuccess(
          "Follow-up saved — quotation marked as Lost and moved to Lost Quotations",
        );
      } else if (statusKey === "revise") {
        toastSuccess("Follow-up saved — quotation marked for revision");
      } else if (statusKey === "hold") {
        toastSuccess("Follow-up saved — quotation put On Hold");
      } else {
        toastSuccess("Quotation follow-up recorded successfully");
      }

      onSaved?.({
        row: selectedRow,
        remark: finalRemark,
        statusKey,
        form: { ...form },
        takenByName,
      });
      onClose?.();
    } catch (err) {
      toastError(err?.message || "Failed to record quotation follow-up");
    } finally {
      setSaving(false);
    }
  };

  const previewStatus = finalRemark
    ? FOLLOWUP_STATUS_META[classifyFollowupRemark(finalRemark)]
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Quotation Follow-up</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Quotation number first */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qfd-search">Search Quotation</Label>
              <Input
                id="qfd-search"
                placeholder="Type quotation number / company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qfd-quotation">Quotation Number *</Label>
              <Select
                id="qfd-quotation"
                value={form.followupId}
                onChange={(e) => setField("followupId", e.target.value)}
                required
              >
                <option value="">
                  {rowsLoading
                    ? "Loading quotations…"
                    : "Select quotation number"}
                </option>
                {filteredRows.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.quotationCode || "—"}
                    {r.companyName ? ` — ${r.companyName}` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {selectedRow && (
            <p className="mb-0 text-sm text-muted-foreground">
              Company:{" "}
              <span className="font-medium text-foreground">
                {selectedRow.companyName || "—"}
              </span>
              {selectedRow.salesEmployeeId?.name
                ? ` · Sales: ${selectedRow.salesEmployeeId.name}`
                : ""}
              {selectedRow.followup_date
                ? ` · Next due: ${dateFormatter(selectedRow.followup_date, "—")}`
                : ""}
            </p>
          )}

          {/* Previous follow-ups of the selected quotation */}
          {form.followupId && (
            <div className="rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  Previous Follow-ups
                </span>
                <Badge variant="secondary">{selectedHistory.length}</Badge>
              </div>
              <div className="max-h-44 overflow-y-auto p-3">
                {selectedHistory.length === 0 ? (
                  <p className="mb-0 text-sm text-muted-foreground">
                    No previous follow-ups recorded for this quotation.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedHistory.map((entry) => {
                      const entryStatus =
                        FOLLOWUP_STATUS_META[
                          classifyFollowupRemark(entry.remark)
                        ];
                      return (
                        <div
                          key={entry._id || entry.sequence}
                          className="rounded bg-muted p-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                              #{entry.sequence}{" "}
                              {entry.followedUpBy?.name ||
                                entry.followedUpBy?.email ||
                                ""}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dateTimeFormatter(entry.followedUpAt, "—")}
                            </span>
                          </div>
                          <div className="mt-1">{entry.remark}</div>
                          <Badge
                            variant={entryStatus.badgeVariant}
                            className="mt-1 text-xs"
                          >
                            {entryStatus.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Date + remark */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qfd-date">Follow-up Date *</Label>
              <Input
                type="date"
                id="qfd-date"
                value={form.followUpDate}
                onChange={(e) => setField("followUpDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qfd-remark">Remark *</Label>
              <Select
                id="qfd-remark"
                value={form.remarkOption}
                onChange={(e) => setField("remarkOption", e.target.value)}
                required
              >
                <option value="">Select remark</option>
                {QUOTATION_REMARK_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="Other">Other (write manually)</option>
              </Select>
            </div>
          </div>

          {remarkIsOther && (
            <div className="space-y-1.5">
              <Label htmlFor="qfd-remark-text">Remark (manual) *</Label>
              <Textarea
                id="qfd-remark-text"
                rows={2}
                placeholder="Write the remark…"
                value={form.remarkText}
                onChange={(e) => setField("remarkText", e.target.value)}
                required
              />
            </div>
          )}

          {previewStatus && previewStatus.label !== "Active" && (
            <p className="mb-0 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Status after saving:
              <Badge variant={previewStatus.badgeVariant}>
                {previewStatus.label}
              </Badge>
              {previewStatus.label === "Lost Quotation" && (
                <span>— will appear in Lost Quotations</span>
              )}
            </p>
          )}

          {/* 3. Who is following up + next follow-up date */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qfd-by">Follow-up By *</Label>
              <Select
                id="qfd-by"
                value={form.takenBy}
                onChange={(e) => setField("takenBy", e.target.value)}
                required
              >
                <option value="">Select employee</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qfd-next-date">Next Follow-up Date *</Label>
              <Input
                type="date"
                id="qfd-next-date"
                value={form.nextFollowUpDate}
                min={form.followUpDate || undefined}
                onChange={(e) => setField("nextFollowUpDate", e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Saving…
                </>
              ) : (
                "Save Follow-up"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

QuotationFollowupDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSaved: PropTypes.func,
  initialRow: PropTypes.object,
};

export default QuotationFollowupDialog;
