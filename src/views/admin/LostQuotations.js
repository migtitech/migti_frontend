import React, { useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  History,
  PauseCircle,
  PencilRuler,
  Timer,
} from "lucide-react";
import { DataTable, PageHeader, StatCard, StatusBadge } from "../../components";
import { Badge, Button, Label, Select } from "../../components/ui";
import { cn } from "../../lib/utils";
import { dateFormatter } from "../../utils/dateFormatter";
import {
  FOLLOWUP_DECISIONS,
  getDecision,
  lostQuotationSample,
} from "../../data/quotationFollowupSample";

const formatINR = (v) =>
  v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;

/** Icon + accent per outcome status, aligned to the follow-up decisions. */
const STATUS_META = {
  lost: { icon: Ban, color: "danger" },
  hold: { icon: PauseCircle, color: "warning" },
  revise: { icon: PencilRuler, color: "info" },
  wait: { icon: Timer, color: "secondary" },
};

const statusBadge = (key) => {
  const d = getDecision(key);
  if (!d) return <StatusBadge variant="secondary">—</StatusBadge>;
  return <StatusBadge variant={d.badgeVariant}>{d.statusLabel}</StatusBadge>;
};

const LostQuotations = () => {
  const [statusKey, setStatusKey] = useState("");
  const [zone, setZone] = useState("");

  const zones = useMemo(
    () => Array.from(new Set(lostQuotationSample.map((r) => r.zone))).sort(),
    [],
  );

  const rows = useMemo(
    () =>
      lostQuotationSample
        .filter((r) => (statusKey ? r.statusKey === statusKey : true))
        .filter((r) => (zone ? r.zone === zone : true)),
    [statusKey, zone],
  );

  /** Per-status counts + value totals for the KPI tiles. */
  const stats = useMemo(() => {
    const acc = {};
    FOLLOWUP_DECISIONS.filter((d) => d.key !== "other").forEach((d) => {
      acc[d.key] = { count: 0, value: 0 };
    });
    lostQuotationSample.forEach((r) => {
      if (!acc[r.statusKey]) acc[r.statusKey] = { count: 0, value: 0 };
      acc[r.statusKey].count += 1;
      acc[r.statusKey].value += Number(r.amount) || 0;
    });
    return acc;
  }, []);

  const columns = [
    {
      key: "index",
      label: "#",
      width: 52,
      toggleable: false,
      exportable: false,
      render: (_row, index) => index + 1,
    },
    {
      key: "quotationCode",
      label: "Quotation",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-medium text-foreground">
          {row.quotationCode}
        </span>
      ),
    },
    {
      key: "company",
      label: "Company",
      sortable: true,
      render: (row) => (
        <span
          className="block max-w-[16rem] truncate font-medium text-foreground"
          title={row.company}
        >
          {row.company}
        </span>
      ),
    },
    { key: "zone", label: "Zone", sortable: true },
    { key: "salesPerson", label: "Sales person", sortable: true },
    {
      key: "amount",
      label: "Value",
      align: "right",
      sortable: true,
      sortValue: (row) => row.amount,
      exportValue: (row) => formatINR(row.amount),
      render: (row) => (
        <span className="whitespace-nowrap font-semibold text-foreground">
          {formatINR(row.amount)}
        </span>
      ),
    },
    {
      key: "statusKey",
      label: "Status",
      sortable: true,
      exportValue: (row) => getDecision(row.statusKey)?.statusLabel || "",
      render: (row) => statusBadge(row.statusKey),
    },
    {
      key: "followupCount",
      label: "Follow-ups",
      align: "center",
      sortValue: (row) => row.followupCount,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          {row.followupCount}
        </span>
      ),
    },
    {
      key: "lastFollowup",
      label: "Last follow-up",
      sortable: true,
      sortValue: (row) => new Date(row.lastFollowup).getTime(),
      exportValue: (row) => dateFormatter(row.lastFollowup, "—"),
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {dateFormatter(row.lastFollowup, "—")}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (row) => (
        <span
          className="block max-w-[22rem] truncate text-muted-foreground"
          title={row.reason}
        >
          {row.reason}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lost Quotation"
        description="Quotations closed via follow-up decisions — Lost, On Hold, Revision Requested and Awaiting Response. Sample data for preview."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FOLLOWUP_DECISIONS.filter((d) => d.key !== "other").map((d) => {
          const meta = STATUS_META[d.key] || {};
          const s = stats[d.key] || { count: 0, value: 0 };
          return (
            <StatCard
              key={d.key}
              title={d.statusLabel}
              value={s.count}
              subtitle={formatINR(s.value)}
              icon={meta.icon}
              color={meta.color}
              onClick={() =>
                setStatusKey((cur) => (cur === d.key ? "" : d.key))
              }
              className={cn(statusKey === d.key && "ring-2 ring-primary")}
            />
          );
        })}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={statusKey}
            onChange={(e) => setStatusKey(e.target.value)}
          >
            <option value="">All statuses</option>
            {FOLLOWUP_DECISIONS.filter((d) => d.key !== "other").map((d) => (
              <option key={d.key} value={d.key}>
                {d.statusLabel}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Zone</Label>
          <Select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setStatusKey("");
              setZone("");
            }}
          >
            Clear filters
          </Button>
        </div>
        <div className="flex items-end justify-end">
          <Badge variant="secondary" className="px-3 py-1">
            {rows.length} quotation{rows.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search quotation, company, sales person…"
        exportFileName="lost-quotations"
        emptyTitle="No quotations match these filters"
      />
    </div>
  );
};

export default LostQuotations;
