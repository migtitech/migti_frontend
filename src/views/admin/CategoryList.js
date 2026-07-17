import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import categoryService from "../../services/categoryService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusToggle,
  TablePagination,
} from "../../components";
import { Button, Alert, AlertDescription, Label } from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions, { isHodRole } from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";

const StackedNameCode = ({ name, code, bold = false }) => (
  <div>
    {bold ? <strong>{name || "—"}</strong> : <span>{name || "—"}</span>}
    <div>
      <code className="text-primary!">{code || "—"}</code>
    </div>
  </div>
);

const CategoryList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const canToggleStatus = isHodRole(user?.role);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        categoryService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
          parent: "null",
        }),
      );
      const data = res?.data || res;
      const inner = data?.data ?? data;
      setCategories(inner?.categories || []);
      setPagination(inner?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await categoryService.delete(id);
      toastSuccess("Category deleted successfully");
      fetchCategories();
    } catch (err) {
      toastError(err?.message || "Failed to delete category");
    }
  };

  const handleStatusToggle = async (category, checked) => {
    if (!canToggleStatus) return;

    const newStatus = checked ? "active" : "inactive";
    if (category.status === newStatus) return;

    const previousStatus = category.status;
    setTogglingId(category._id);
    setCategories((prev) =>
      prev.map((item) =>
        item._id === category._id ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      await categoryService.update(category._id, { status: newStatus });
      toastSuccess(
        `Category ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      setCategories((prev) =>
        prev.map((item) =>
          item._id === category._id
            ? { ...item, status: previousStatus }
            : item,
        ),
      );
      toastError(err?.message || "Failed to update category status");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "S No",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (page - 1) * 10 + index + 1,
      },
      {
        key: "name",
        label: "Name",
        sortValue: (cat) => cat.name ?? "",
        exportValue: (cat) => cat.name ?? "—",
        render: (cat) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary!">
              {(cat.name || "CT").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="font-medium text-foreground">
                {cat.name || "—"}
              </div>
              <code className="text-xs text-muted-foreground">
                {cat.categoryCode || "—"}
              </code>
            </div>
          </div>
        ),
      },
      {
        key: "group",
        label: "Group",
        sortValue: (cat) =>
          typeof cat.group === "object" ? (cat.group?.name ?? "") : "",
        exportValue: (cat) =>
          typeof cat.group === "object" ? (cat.group?.name ?? "—") : "—",
        render: (cat) => (
          <StackedNameCode
            name={typeof cat.group === "object" ? cat.group?.name : null}
            code={typeof cat.group === "object" ? cat.group?.code : null}
          />
        ),
      },
      {
        key: "status",
        label: "Status",
        align: "center",
        stopRowClick: true,
        sortValue: (cat) => cat.status ?? "",
        exportValue: (cat) => cat.status ?? "—",
        render: (cat) => (
          <StatusToggle
            status={cat.status}
            disabled={!canToggleStatus || togglingId === cat._id}
            onCheckedChange={(checked) => handleStatusToggle(cat, checked)}
            aria-label={`Toggle status for ${cat.name}`}
            className="justify-center"
          />
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (cat) => (
          <RowActions
            className="justify-center"
            onView={() => navigate(`/categories/${cat._id}`)}
            onEdit={
              canUpdate("categories")
                ? () => navigate(`/categories/edit/${cat._id}`)
                : undefined
            }
            onDelete={
              canDelete("categories")
                ? () => handleDeleteClick(cat._id)
                : undefined
            }
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, canToggleStatus, togglingId],
  );

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage the top-level product categories in your catalog."
        actions={
          canCreate("categories") && (
            <Button onClick={() => navigate("/categories/new")}>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="max-w-sm">
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Search
          </Label>
          <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={categories}
        rowKey={(cat) => cat._id}
        loading={loading}
        onRowClick={(cat) => navigate(`/categories/${cat._id}`)}
        showSearch={false}
        exportFileName="categories"
        emptyTitle="No categories found"
        emptyMessage={
          searchTerm
            ? `No categories found matching "${searchTerm}"`
            : 'Click "Add Category" to create one.'
        }
      />

      <TablePagination
        currentPage={pagination?.currentPage ?? 1}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        showRange
        totalItems={pagination?.totalItems ?? 0}
        itemsPerPage={pagination?.itemsPerPage ?? 10}
      />

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Category?"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CategoryList;
