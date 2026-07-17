import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
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
import { dateFormatter } from "../../utils/dateFormatter";

const FollowUpDashboard = () => {
  const navigate = useNavigate();
  const {
    followUps,
    addFollowUp,
    updateFollowUp,
    queries,
    quotations,
    purchaseOrders,
  } = useData();
  const [activeTab, setActiveTab] = useState(1);
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

  const handleOpenModal = (followUp = null) => {
    if (followUp) {
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
    } else {
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
    }
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
    const data = {
      ...formData,
      referenceId: formData.referenceId ? parseInt(formData.referenceId) : null,
      dueDate: formData.dueDate
        ? new Date(formData.dueDate).toISOString()
        : null,
    };
    if (editingFollowUp) {
      updateFollowUp(editingFollowUp.id, data);
    } else {
      addFollowUp(data);
    }
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
          queries?.map((q) => ({ id: q.id, label: `Query: ${q.subject}` })) ||
          []
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
          <Button type="button" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" />
            Add Follow-up
          </Button>
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

      {/* Add/Edit Modal */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFollowUp ? "Edit Follow-up" : "Add New Follow-up"}
            </DialogTitle>
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
            {editingFollowUp && (
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
            )}
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
              <Button type="submit">
                {editingFollowUp ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUpDashboard;
