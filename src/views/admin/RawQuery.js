import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { EyeIcon } from "../../components";
import rawQueryService from "../../services/rawQueryService";
import industryService from "../../services/industryService";
import Filtered from "../../filtered/Filtered";
import { ConfirmDialog, Loader, TablePagination } from "../../components";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Input,
  Label,
  Textarea,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const RawQuery = () => {
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingQuery, setEditingQuery] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const [industries, setIndustries] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    industryId: "",
    description: "",
    priority: "medium",
  });

  const handleOpenModal = (query = null) => {
    if (query) {
      setEditingQuery(query);
      const industryId = query.industry_id
        ? typeof query.industry_id === "object"
          ? query.industry_id._id || query.industry_id.id
          : query.industry_id
        : "";
      setFormData({
        title: query.title || "",
        industryId: industryId || "",
        description: query.description || "",
        priority: query.priority || "medium",
      });
    } else {
      setEditingQuery(null);
      setFormData({
        title: "",
        industryId: "",
        description: "",
        priority: "medium",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQuery(null);
    setFormData({
      title: "",
      industryId: "",
      description: "",
      priority: "medium",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      industryId: formData.industryId || null,
    };
    if (!editingQuery) {
      return;
    }
    try {
      await rawQueryService.update(editingQuery._id || editingQuery.id, data);
      toastSuccess("Raw query updated successfully");
      await fetchRawQueries();
      handleCloseModal();
    } catch (err) {
      toastError(err?.message || "Failed to update raw query");
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await rawQueryService.delete(id);
      toastSuccess("Raw query deleted successfully");
      await fetchRawQueries();
    } catch (err) {
      toastError(err?.message || "Failed to delete raw query");
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
      case "normal":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="info">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const fetchRawQueries = async (options = {}) => {
    try {
      setLoading(true);
      setError("");
      const response = await withMinimumDelay(() =>
        rawQueryService.getAll({
          pageNumber,
          pageSize,
          search: searchTerm,
          ...options,
        }),
      );
      const payload = response?.data || {};
      setQueries(payload.rawQueries || []);
      setPagination(payload.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load raw queries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const response = await industryService.getAll({ pageSize: 100 });
        const payload = response?.data || response;
        setIndustries(payload?.industries || []);
      } catch {
        setIndustries([]);
      }
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRawQueries();
    }, 300);
    return () => clearTimeout(timer);
  }, [pageNumber, pageSize, searchTerm]);

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between border-b border-border py-4">
          <div className="text-base font-semibold">Raw Queries</div>
          <Button type="button" onClick={() => navigate("/raw-query/new")}>
            <Plus className="h-4 w-4" />
            Add Raw Query
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-3 max-w-sm">
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>
          {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SNo</TableHead>
                  <TableHead>Query No.</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Loader message="Loading raw queries..." />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {queries &&
                      queries?.map((query, index) => (
                        <TableRow
                          key={query._id || query.id}
                          onClick={() =>
                            navigate(`/raw-query/${query._id || query.id}`)
                          }
                          className="cursor-pointer"
                        >
                          <TableCell>
                            {(pageNumber - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {query.raw_query_number ||
                                query.rawQueryNumber ||
                                "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <strong>{query.title || "-"}</strong>
                          </TableCell>
                          <TableCell>
                            {query.industry_id &&
                            typeof query.industry_id === "object"
                              ? query.industry_id.name || "-"
                              : query.company_info || query.companyInfo || "-"}
                          </TableCell>
                          <TableCell>
                            {getPriorityBadge(query.priority)}
                          </TableCell>
                          <TableCell>
                            {dateFormatter(
                              query.createdAt || query.created_at,
                              "—",
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                navigate(`/raw-query/${query._id || query.id}`)
                              }
                              title="View"
                            >
                              <EyeIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(query);
                              }}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(query._id || query.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {(!queries || queries.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No raw queries found. Click "Add Raw Query" to create
                          one.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setPageNumber}
            showRange
            totalItems={pagination?.totalItems ?? 0}
            itemsPerPage={pagination?.itemsPerPage ?? 10}
            ariaLabel="Raw query pages"
          />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && handleCloseModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuery ? "Edit Raw Query" : "Add New Raw Query"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-6 py-4">
              <div>
                <Label htmlFor="title" className="mb-1 block">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Short title for the raw query"
                />
              </div>
              <div>
                <Label htmlFor="industryId" className="mb-1 block">
                  Client
                </Label>
                <Select
                  id="industryId"
                  value={formData.industryId}
                  onChange={(e) =>
                    setFormData({ ...formData, industryId: e.target.value })
                  }
                >
                  <option value="">Select client</option>
                  {industries.map((industry) => (
                    <option
                      key={industry._id || industry.id}
                      value={industry._id || industry.id}
                    >
                      {industry.name}
                      {industry.location ? ` (${industry.location})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="priority" className="mb-1 block">
                  Priority
                </Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="description" className="mb-1 block">
                  Description
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
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
                {editingQuery ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Raw Query?"
        message="Are you sure you want to delete this raw query? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default RawQuery;
