import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  FileText,
  History,
  Plus,
  Pencil,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { PageHeader } from "../../components";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import queryService from "../../services/queryService";
import employeeService from "../../services/employeeService";
import quotationFollowupService from "../../services/quotationFollowupService";
import QuotationFollowupDialog from "../../components/QuotationFollowupDialog";
import { toastError, toastSuccess } from "../../utils/toast";
import {
  classifyFollowupRemark,
  QUOTATION_REMARK_GROUPS,
} from "../../utils/quotationFollowupRemarks";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const REMARK_OPTIONS = [
  "Called – no response",
  "Called – will confirm later",
  "Interested – asked for quotation",
  "Quotation shared – awaiting response",
  "Negotiation in progress",
  "Order confirmed",
  "Not interested",
  "Other",
];

const todayStr = () => new Date().toISOString().split("T")[0];

const emptyAddForm = () => ({
  queryId: "",
  followUpDate: todayStr(),
  remarkOption: "",
  remarkText: "",
  takenBy: "",
  nextFollowUpDate: "",
});

const emptyQtnForm = () => ({
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
      (Number(b.sequence) || 0) - (Number(a.sequence) || 0) ||
      new Date(b.followedUpAt || 0) - new Date(a.followedUpAt || 0),
  );

const FollowUpDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    followUps,
    addFollowUp,
    updateFollowUp,
    queries: localQueries,
    quotations,
    purchaseOrders,
  } = useData();
  const [activeTab, setActiveTab] = useState(1);

  /* ── edit modal (existing local follow-ups) ── */
  const [showModal, setShowModal] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [formData, setFormData] = useState({
    type: "query",
    referenceId: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "normal",
    status: "pending",
  });

  /* ── add follow-up popup (query-first flow) ── */
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm());
  const [saving, setSaving] = useState(false);
  const [queryOptions, setQueryOptions] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [querySearch, setQuerySearch] = useState("");
  const [querySearchDebounced, setQuerySearchDebounced] = useState("");
  const [employees, setEmployees] = useState([]);
  const [prevFollowUps, setPrevFollowUps] = useState([]);
  const [prevLoading, setPrevLoading] = useState(false);

  /* ── quotation follow-up popup ── */
  const [qtnOpen, setQtnOpen] = useState(false);
  const [qtnForm, setQtnForm] = useState(emptyQtnForm());
  const [qtnSaving, setQtnSaving] = useState(false);
  const [qtnSearch, setQtnSearch] = useState("");
  const [qtnRows, setQtnRows] = useState([]);
  const [qtnLoading, setQtnLoading] = useState(false);

  const currentUserId = user?.id || user?._id || "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter follow-ups
  const pendingFollowUps =
    followUps?.filter((f) => f.status === "pending") || [];
  const overdueFollowUps =
    followUps?.filter((f) => {
      const dueDate = new Date(f.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return f.status === "pending" && dueDate < today;
    }) || [];
  const todayFollowUps =
    followUps?.filter((f) => {
      const dueDate = new Date(f.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return f.status === "pending" && dueDate.getTime() === today.getTime();
    }) || [];
  const completedFollowUps =
    followUps?.filter((f) => f.status === "completed") || [];

  /* ── debounce query search ── */
  useEffect(() => {
    const t = setTimeout(() => setQuerySearchDebounced(querySearch), 400);
    return () => clearTimeout(t);
  }, [querySearch]);

  /* ── load queries for the dropdown while popup is open ── */
  useEffect(() => {
    if (!addOpen) return;
    let alive = true;
    const loadQueries = async () => {
      setQueryLoading(true);
      try {
        const res = await queryService.getAll({
          pageNumber: 1,
          pageSize: 100,
          search: querySearchDebounced.trim() || undefined,
        });
        const data = res?.data || res;
        const result = data?.data ?? data;
        if (alive) setQueryOptions(result?.queries || []);
      } catch (e) {
        if (alive) toastError(e?.message || "Failed to load queries");
      } finally {
        if (alive) setQueryLoading(false);
      }
    };
    loadQueries();
    return () => {
      alive = false;
    };
  }, [addOpen, querySearchDebounced]);

  /* ── load employees for "Follow-up By" dropdown ── */
  useEffect(() => {
    if (!addOpen) return;
    let alive = true;
    const loadEmployees = async () => {
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
    loadEmployees();
    return () => {
      alive = false;
    };
  }, [addOpen, qtnOpen]);

  /* ── load quotations for the quotation follow-up popup ── */
  useEffect(() => {
    if (!qtnOpen) return;
    let alive = true;
    const loadQtnRows = async () => {
      setQtnLoading(true);
      try {
        const res = await quotationFollowupService.list({
          pageNumber: 1,
          pageSize: 100,
        });
        const payload = res?.data?.data ?? res?.data ?? res;
        if (alive) setQtnRows(payload?.items || []);
      } catch (e) {
        if (alive) toastError(e?.message || "Failed to load quotations");
      } finally {
        if (alive) setQtnLoading(false);
      }
    };
    loadQtnRows();
    return () => {
      alive = false;
    };
  }, [qtnOpen]);

  /* ── previous follow-ups of the selected query ── */
  useEffect(() => {
    if (!addOpen || !addForm.queryId) return;
    let alive = true;
    const loadPrevious = async () => {
      setPrevLoading(true);
      try {
        const res = await queryService.getActivities(addForm.queryId, {
          pageNumber: 1,
          pageSize: 50,
        });
        const data = res?.data || res;
        const payload = data?.data ?? data;
        const activities = Array.isArray(payload?.activities)
          ? payload.activities
          : [];
        if (alive) {
          setPrevFollowUps(activities.filter((a) => a.type === "follow_up"));
        }
      } catch {
        if (alive) setPrevFollowUps([]);
      } finally {
        if (alive) setPrevLoading(false);
      }
    };
    loadPrevious();
    return () => {
      alive = false;
    };
  }, [addOpen, addForm.queryId]);

  const handleOpenAdd = () => {
    setAddForm({ ...emptyAddForm(), takenBy: String(currentUserId || "") });
    setQuerySearch("");
    setQuerySearchDebounced("");
    setPrevFollowUps([]);
    setAddOpen(true);
  };

  const handleCloseAdd = () => {
    if (saving) return;
    setAddOpen(false);
    setAddForm(emptyAddForm());
    setPrevFollowUps([]);
  };

  const setAddField = (key, val) => setAddForm((f) => ({ ...f, [key]: val }));

  const selectedQuery = queryOptions.find(
    (q) => String(q._id || q.id) === String(addForm.queryId),
  );

  const remarkIsOther = addForm.remarkOption === "Other";
  const finalRemark = remarkIsOther
    ? addForm.remarkText.trim()
    : addForm.remarkOption;

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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.queryId) {
      toastError("Select a query number first");
      return;
    }
    if (!addForm.followUpDate) {
      toastError("Select the follow-up date");
      return;
    }
    if (!finalRemark) {
      toastError(remarkIsOther ? "Enter the remark" : "Select a remark");
      return;
    }
    if (!addForm.takenBy) {
      toastError("Select who is taking the follow-up");
      return;
    }
    if (!addForm.nextFollowUpDate) {
      toastError("Next follow-up date is required");
      return;
    }
    if (addForm.nextFollowUpDate < addForm.followUpDate) {
      toastError("Next follow-up date cannot be before the follow-up date");
      return;
    }

    setSaving(true);
    try {
      await queryService.recordActivity(
        addForm.queryId,
        "follow_up",
        addForm.takenBy,
        {
          action: `Follow-up date: ${addForm.followUpDate} | Next follow-up: ${addForm.nextFollowUpDate}`,
          followUpStatus: "pending",
          note: `${finalRemark} (Next follow-up: ${dateFormatter(
            addForm.nextFollowUpDate,
            addForm.nextFollowUpDate,
          )})`,
        },
      );

      /* keep the local dashboard lists in sync */
      const takenByName =
        employeeOptions.find((o) => o.id === String(addForm.takenBy))?.name ||
        "";
      addFollowUp({
        type: "query",
        referenceId: null,
        title: `Follow-up: ${selectedQuery?.queryCode || "Query"}`,
        description: `${finalRemark}${takenByName ? ` — by ${takenByName}` : ""}`,
        dueDate: new Date(addForm.nextFollowUpDate).toISOString(),
        priority: "normal",
        status: "pending",
      });

      toastSuccess("Follow-up recorded successfully");
      setAddOpen(false);
      setAddForm(emptyAddForm());
      setPrevFollowUps([]);
    } catch (err) {
      toastError(err?.message || "Failed to record follow-up");
    } finally {
      setSaving(false);
    }
  };

  /* ── quotation follow-up popup handlers ── */
  const handleOpenQtn = () => {
    setQtnForm({ ...emptyQtnForm(), takenBy: String(currentUserId || "") });
    setQtnSearch("");
    setQtnOpen(true);
  };

  const handleCloseQtn = () => {
    if (qtnSaving) return;
    setQtnOpen(false);
    setQtnForm(emptyQtnForm());
    setQtnSearch("");
  };

  const setQtnField = (key, val) => setQtnForm((f) => ({ ...f, [key]: val }));

  const qtnSearchLower = qtnSearch.trim().toLowerCase();
  const filteredQtnRows = qtnSearchLower
    ? qtnRows.filter((r) =>
        `${r.quotationCode || ""} ${r.companyName || ""}`
          .toLowerCase()
          .includes(qtnSearchLower),
      )
    : qtnRows;

  const selectedQtnRow = qtnRows.find(
    (r) => String(r._id) === String(qtnForm.followupId),
  );
  const selectedQtnHistory = sortHistoryNewestFirst(
    selectedQtnRow?.followupHistory || [],
  );

  const qtnRemarkIsOther = qtnForm.remarkOption === "Other";
  const qtnFinalRemark = qtnRemarkIsOther
    ? qtnForm.remarkText.trim()
    : qtnForm.remarkOption;

  const handleQtnSubmit = async (e) => {
    e.preventDefault();
    if (!qtnForm.followupId) {
      toastError("Select a quotation number first");
      return;
    }
    if (!qtnForm.followUpDate) {
      toastError("Select the follow-up date");
      return;
    }
    if (!qtnFinalRemark) {
      toastError(qtnRemarkIsOther ? "Enter the remark" : "Select a remark");
      return;
    }
    if (!qtnForm.takenBy) {
      toastError("Select who is taking the follow-up");
      return;
    }
    if (!qtnForm.nextFollowUpDate) {
      toastError("Next follow-up date is required");
      return;
    }
    if (qtnForm.nextFollowUpDate < qtnForm.followUpDate) {
      toastError("Next follow-up date cannot be before the follow-up date");
      return;
    }

    const takenByName =
      employeeOptions.find((o) => o.id === String(qtnForm.takenBy))?.name || "";
    const remarkString = `${qtnFinalRemark} | Follow-up date: ${dateFormatter(
      qtnForm.followUpDate,
      qtnForm.followUpDate,
    )} | By: ${takenByName || "—"} | Next follow-up: ${dateFormatter(
      qtnForm.nextFollowUpDate,
      qtnForm.nextFollowUpDate,
    )}`;

    setQtnSaving(true);
    try {
      await quotationFollowupService.updateRemark(
        qtnForm.followupId,
        remarkString,
      );

      /* keep the local dashboard lists in sync */
      addFollowUp({
        type: "quotation",
        referenceId: null,
        title: `Follow-up: ${selectedQtnRow?.quotationCode || "Quotation"}`,
        description: `${qtnFinalRemark}${takenByName ? ` — by ${takenByName}` : ""}`,
        dueDate: new Date(qtnForm.nextFollowUpDate).toISOString(),
        priority: "normal",
        status: "pending",
      });

      const statusKey = classifyFollowupRemark(qtnFinalRemark);
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

      setQtnOpen(false);
      setQtnForm(emptyQtnForm());
      setQtnSearch("");
    } catch (err) {
      toastError(err?.message || "Failed to record quotation follow-up");
    } finally {
      setQtnSaving(false);
    }
  };

  /* ── edit modal handlers (existing behaviour) ── */
  const handleOpenModal = (followUp) => {
    if (!followUp) return;
    setEditingFollowUp(followUp);
    setFormData({
      type: followUp.type || "query",
      referenceId: followUp.referenceId || "",
      title: followUp.title || "",
      description: followUp.description || "",
      dueDate: followUp.dueDate ? followUp.dueDate.split("T")[0] : "",
      priority: followUp.priority || "normal",
      status: followUp.status || "pending",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFollowUp(null);
    setFormData({
      type: "query",
      referenceId: "",
      title: "",
      description: "",
      dueDate: "",
      priority: "normal",
      status: "pending",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editingFollowUp) return;
    const data = {
      ...formData,
      referenceId: formData.referenceId ? parseInt(formData.referenceId) : null,
      dueDate: formData.dueDate
        ? new Date(formData.dueDate).toISOString()
        : null,
    };
    updateFollowUp(editingFollowUp.id, data);
    handleCloseModal();
  };

  const markAsComplete = (id) => {
    updateFollowUp(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "normal":
        return <Badge variant="secondary">Normal</Badge>;
      case "low":
        return <Badge variant="info">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReferenceOptions = () => {
    switch (formData.type) {
      case "query":
        return (
          localQueries?.map((q) => ({
            id: q.id,
            label: `Query: ${q.subject}`,
          })) || []
        );
      case "quotation":
        return (
          quotations?.map((q) => ({
            id: q.id,
            label: `QT-${String(q.id).padStart(4, "0")}: ${q.customerName}`,
          })) || []
        );
      case "purchase_order":
        return (
          purchaseOrders?.map((o) => ({
            id: o.id,
            label: `Sales Order-${String(o.id).padStart(4, "0")}: ${o.supplierName}`,
          })) || []
        );
      default:
        return [];
    }
  };

  const renderFollowUpTable = (items) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((followUp) => {
          const dueDate = new Date(followUp.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const isOverdue = followUp.status === "pending" && dueDate < today;
          return (
            <TableRow
              key={followUp.id}
              className={isOverdue ? "bg-destructive/10" : ""}
            >
              <TableCell>
                <strong>{followUp.title}</strong>
                {followUp.description && (
                  <>
                    <br />
                    <small className="text-muted-foreground">
                      {followUp.description.substring(0, 50)}...
                    </small>
                  </>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="info">{followUp.type?.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell>
                {followUp.dueDate ? (
                  <>
                    {dateFormatter(followUp.dueDate, "-")}
                    {isOverdue && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{getPriorityBadge(followUp.priority)}</TableCell>
              <TableCell>{getStatusBadge(followUp.status)}</TableCell>
              <TableCell>
                {followUp.status === "pending" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => markAsComplete(followUp.id)}
                    title="Mark Complete"
                  >
                    <Check className="text-success!" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenModal(followUp)}
                  title="Edit"
                >
                  <Pencil className="text-warning!" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              No follow-ups found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div>
      <PageHeader
        title="Follow-up Dashboard"
        description="Track and manage your follow-ups"
        actions={
          <>
            <Button type="button" variant="outline" onClick={handleOpenQtn}>
              <FileText className="h-4 w-4" />
              Quotation Follow-up
            </Button>
            <Button type="button" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              Add Follow-up
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="mt-1 text-2xl font-semibold">
                {overdueFollowUps.length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Due Today</p>
              <p className="mt-1 text-2xl font-semibold">
                {todayFollowUps.length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-warning!" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-semibold">
                {pendingFollowUps.length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-primary!" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-semibold">
                {completedFollowUps.length}
              </p>
            </div>
            <Check className="h-8 w-8 text-success!" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs
            value={String(activeTab)}
            onValueChange={(v) => setActiveTab(Number(v))}
          >
            <TabsList>
              <TabsTrigger value="1">
                <AlertTriangle className="h-4 w-4" />
                Overdue ({overdueFollowUps.length})
              </TabsTrigger>
              <TabsTrigger value="2">
                <Calendar className="h-4 w-4" />
                Today ({todayFollowUps.length})
              </TabsTrigger>
              <TabsTrigger value="3">
                <Clock className="h-4 w-4" />
                All Pending ({pendingFollowUps.length})
              </TabsTrigger>
              <TabsTrigger value="4">
                <Check className="h-4 w-4" />
                Completed ({completedFollowUps.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="1">
              {renderFollowUpTable(overdueFollowUps)}
            </TabsContent>
            <TabsContent value="2">
              {renderFollowUpTable(todayFollowUps)}
            </TabsContent>
            <TabsContent value="3">
              {renderFollowUpTable(pendingFollowUps)}
            </TabsContent>
            <TabsContent value="4">
              {renderFollowUpTable(completedFollowUps)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Add Follow-up popup (query-first flow) ── */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseAdd();
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleAddSubmit}
            className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-4"
          >
            {/* 1. Query number first */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fu-query-search">Search Query</Label>
                <Input
                  id="fu-query-search"
                  placeholder="Type query code / company…"
                  value={querySearch}
                  onChange={(e) => setQuerySearch(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fu-query">Query Number *</Label>
                <Select
                  id="fu-query"
                  value={addForm.queryId}
                  onChange={(e) => {
                    setPrevFollowUps([]);
                    setAddField("queryId", e.target.value);
                  }}
                  required
                >
                  <option value="">
                    {queryLoading ? "Loading queries…" : "Select query number"}
                  </option>
                  {queryOptions.map((q) => (
                    <option key={q._id || q.id} value={q._id || q.id}>
                      {q.queryCode || "—"}
                      {q.companyInfo?.name ? ` — ${q.companyInfo.name}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedQuery?.companyInfo?.name && (
              <p className="mb-0 text-sm text-muted-foreground">
                Company:{" "}
                <span className="font-medium text-foreground">
                  {selectedQuery.companyInfo.name}
                </span>
                {selectedQuery.companyInfo.area
                  ? ` (${selectedQuery.companyInfo.area})`
                  : ""}
              </p>
            )}

            {/* Previous follow-ups of the selected query */}
            {addForm.queryId && (
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4" />
                    Previous Follow-ups
                  </span>
                  <Badge variant="secondary">{prevFollowUps.length}</Badge>
                </div>
                <div className="max-h-44 overflow-y-auto p-3">
                  {prevLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="h-4 w-4" />
                      Loading previous follow-ups…
                    </div>
                  ) : prevFollowUps.length === 0 ? (
                    <p className="mb-0 text-sm text-muted-foreground">
                      No previous follow-ups recorded for this query.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {prevFollowUps.map((act) => (
                        <div
                          key={act._id || act.id}
                          className="rounded bg-muted p-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                              {act.performByName ||
                                act.performedBy?.name ||
                                act.performedBy?.email ||
                                "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dateTimeFormatter(act.createdAt, "—")}
                            </span>
                          </div>
                          {act.meta?.note && (
                            <div className="mt-1">{act.meta.note}</div>
                          )}
                          {act.meta?.followUpStatus && (
                            <Badge variant="warning" className="mt-1 text-xs">
                              {act.meta.followUpStatus}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Date + remark */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fu-date">Follow-up Date *</Label>
                <Input
                  type="date"
                  id="fu-date"
                  value={addForm.followUpDate}
                  onChange={(e) => setAddField("followUpDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fu-remark">Remark *</Label>
                <Select
                  id="fu-remark"
                  value={addForm.remarkOption}
                  onChange={(e) => setAddField("remarkOption", e.target.value)}
                  required
                >
                  <option value="">Select remark</option>
                  {REMARK_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {remarkIsOther && (
              <div className="space-y-1.5">
                <Label htmlFor="fu-remark-text">Remark (manual) *</Label>
                <Textarea
                  id="fu-remark-text"
                  rows={2}
                  placeholder="Write the remark…"
                  value={addForm.remarkText}
                  onChange={(e) => setAddField("remarkText", e.target.value)}
                  required
                />
              </div>
            )}

            {/* 3. Who is following up + next follow-up date */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fu-by">Follow-up By *</Label>
                <Select
                  id="fu-by"
                  value={addForm.takenBy}
                  onChange={(e) => setAddField("takenBy", e.target.value)}
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
                <Label htmlFor="fu-next-date">Next Follow-up Date *</Label>
                <Input
                  type="date"
                  id="fu-next-date"
                  value={addForm.nextFollowUpDate}
                  min={addForm.followUpDate || undefined}
                  onChange={(e) =>
                    setAddField("nextFollowUpDate", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAdd}
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

      {/* ── Quotation Follow-up popup (quotation-first flow) ── */}
      <Dialog
        open={qtnOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseQtn();
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Quotation Follow-up</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleQtnSubmit}
            className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-4"
          >
            {/* 1. Quotation number first */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qfu-search">Search Quotation</Label>
                <Input
                  id="qfu-search"
                  placeholder="Type quotation number / company…"
                  value={qtnSearch}
                  onChange={(e) => setQtnSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qfu-quotation">Quotation Number *</Label>
                <Select
                  id="qfu-quotation"
                  value={qtnForm.followupId}
                  onChange={(e) => setQtnField("followupId", e.target.value)}
                  required
                >
                  <option value="">
                    {qtnLoading
                      ? "Loading quotations…"
                      : "Select quotation number"}
                  </option>
                  {filteredQtnRows.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.quotationCode || "—"}
                      {r.companyName ? ` — ${r.companyName}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedQtnRow && (
              <p className="mb-0 text-sm text-muted-foreground">
                Company:{" "}
                <span className="font-medium text-foreground">
                  {selectedQtnRow.companyName || "—"}
                </span>
                {selectedQtnRow.salesEmployeeId?.name
                  ? ` · Sales: ${selectedQtnRow.salesEmployeeId.name}`
                  : ""}
                {selectedQtnRow.followup_date
                  ? ` · Next due: ${dateFormatter(selectedQtnRow.followup_date, "—")}`
                  : ""}
              </p>
            )}

            {/* Previous follow-ups of the selected quotation */}
            {qtnForm.followupId && (
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4" />
                    Previous Follow-ups
                  </span>
                  <Badge variant="secondary">{selectedQtnHistory.length}</Badge>
                </div>
                <div className="max-h-44 overflow-y-auto p-3">
                  {selectedQtnHistory.length === 0 ? (
                    <p className="mb-0 text-sm text-muted-foreground">
                      No previous follow-ups recorded for this quotation.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedQtnHistory.map((entry) => {
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
                <Label htmlFor="qfu-date">Follow-up Date *</Label>
                <Input
                  type="date"
                  id="qfu-date"
                  value={qtnForm.followUpDate}
                  onChange={(e) => setQtnField("followUpDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qfu-remark">Remark *</Label>
                <Select
                  id="qfu-remark"
                  value={qtnForm.remarkOption}
                  onChange={(e) => setQtnField("remarkOption", e.target.value)}
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

            {qtnRemarkIsOther && (
              <div className="space-y-1.5">
                <Label htmlFor="qfu-remark-text">Remark (manual) *</Label>
                <Textarea
                  id="qfu-remark-text"
                  rows={2}
                  placeholder="Write the remark…"
                  value={qtnForm.remarkText}
                  onChange={(e) => setQtnField("remarkText", e.target.value)}
                  required
                />
              </div>
            )}

            {qtnFinalRemark &&
              (() => {
                const status =
                  FOLLOWUP_STATUS_META[classifyFollowupRemark(qtnFinalRemark)];
                if (status.label === "Active") return null;
                return (
                  <p className="mb-0 flex items-center gap-2 text-sm text-muted-foreground">
                    Status after saving:
                    <Badge variant={status.badgeVariant}>{status.label}</Badge>
                    {classifyFollowupRemark(qtnFinalRemark) === "lost" && (
                      <span>— will appear in Lost Quotations</span>
                    )}
                  </p>
                );
              })()}

            {/* 3. Who is following up + next follow-up date */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qfu-by">Follow-up By *</Label>
                <Select
                  id="qfu-by"
                  value={qtnForm.takenBy}
                  onChange={(e) => setQtnField("takenBy", e.target.value)}
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
                <Label htmlFor="qfu-next-date">Next Follow-up Date *</Label>
                <Input
                  type="date"
                  id="qfu-next-date"
                  value={qtnForm.nextFollowUpDate}
                  min={qtnForm.followUpDate || undefined}
                  onChange={(e) =>
                    setQtnField("nextFollowUpDate", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseQtn}
                disabled={qtnSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={qtnSaving}>
                {qtnSaving ? (
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

      {/* Edit Modal (existing local follow-ups) */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Follow-up</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  type="date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                      referenceId: "",
                    })
                  }
                >
                  <option value="query">Query</option>
                  <option value="quotation">Quotation</option>
                  <option value="purchase_order">Sales Order</option>
                  <option value="general">General</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referenceId">Reference</Label>
                <Select
                  id="referenceId"
                  value={formData.referenceId}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceId: e.target.value })
                  }
                  disabled={formData.type === "general"}
                >
                  <option value="">Select Reference (Optional)</option>
                  {getReferenceOptions().map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUpDashboard;
