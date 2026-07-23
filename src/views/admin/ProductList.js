import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Check, Ban, Power } from "lucide-react";
import productService from "../../services/productService";
import categoryService from "../../services/categoryService";
import brandService from "../../services/brandService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  TablePagination,
  FilterLockButton,
  PageHeader,
  RowActions,
  StatusBadge,
} from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Select,
  Label,
  Tooltip,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import usePermissions, { isHodRole } from "../../hooks/usePermissions";

const PRODUCT_FILTER_DEFAULTS = { category: "", brand: "", status: "" };

const getStatusBadge = (status) => {
  switch (status) {
    case "active":
      return <StatusBadge variant="success">Active</StatusBadge>;
    case "inactive":
      return <StatusBadge variant="secondary">Inactive</StatusBadge>;
    case "pending_hod_approval":
      return <StatusBadge variant="warning">Pending Approval</StatusBadge>;
    case "rejected":
      return <StatusBadge variant="destructive">Rejected</StatusBadge>;
    case "draft":
      return <StatusBadge variant="warning">Draft</StatusBadge>;
    default:
      return <StatusBadge variant="default">{status}</StatusBadge>;
  }
};

const ProductList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreate, canUpdate } = usePermissions();
  const canDeleteProduct = isHodRole(user?.role);
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "product_list",
    PRODUCT_FILTER_DEFAULTS,
  );
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const [filterCategory, setFilterCategory] = useState(initialValues.category);
  const [filterBrand, setFilterBrand] = useState(initialValues.brand);
  const [filterStatus, setFilterStatus] = useState(initialValues.status);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm,
      };
      if (filterCategory) params.category = filterCategory;
      if (filterBrand) params.brand = filterBrand;
      if (filterStatus) params.status = filterStatus;

      const res = await withMinimumDelay(() => productService.getAll(params));
      const data = res?.data || res;
      setProducts(data?.products || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterData = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        categoryService.getAll({
          pageNumber: 1,
          pageSize: 100,
          parent: "null",
        }),
        brandService.getAll({ pageNumber: 1, pageSize: 100 }),
      ]);
      const catData = catRes?.data || catRes;
      const brandData = brandRes?.data || brandRes;
      setCategories(catData?.categories || []);
      setBrands(brandData?.brands || []);
    } catch (err) {
      console.error("Failed to fetch filter data", err);
    }
  };

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, page, filterCategory, filterBrand, filterStatus]);

  useFilterLockPersist("product_list", filtersLocked, {
    category: filterCategory,
    brand: filterBrand,
    status: filterStatus,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      category: filterCategory,
      brand: filterBrand,
      status: filterStatus,
    });
  };

  const hasActiveFilters =
    searchTerm || filterCategory || filterBrand || filterStatus;

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterCategory("");
    setFilterBrand("");
    setFilterStatus("");
    setPage(1);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    if (!id) return;
    setConfirmDelete({ visible: false, id: null });
    try {
      await productService.delete(id);
      toastSuccess("Product deleted successfully");
      fetchProducts();
    } catch (err) {
      toastError(err?.message || "Failed to delete product");
    }
  };

  // HOD status gate (D30): approve / reject / enable / disable a product.
  const isHod = isHodRole(user?.role);
  const [statusBusyId, setStatusBusyId] = useState(null);
  const [rejectDialog, setRejectDialog] = useState({
    visible: false,
    id: null,
    reason: "",
  });

  const changeStatus = async (id, status, rejectionReason = "") => {
    if (!id) return;
    setStatusBusyId(id);
    try {
      await productService.updateStatus(id, status, rejectionReason);
      const msg =
        status === "active"
          ? "Product approved / activated"
          : status === "rejected"
            ? "Product rejected"
            : "Product deactivated";
      toastSuccess(msg);
      fetchProducts();
    } catch (err) {
      toastError(err?.message || "Failed to update product status");
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleRejectConfirm = async () => {
    const { id, reason } = rejectDialog;
    if (!reason.trim()) {
      toastError("A rejection remark is required");
      return;
    }
    setRejectDialog({ visible: false, id: null, reason: "" });
    await changeStatus(id, "rejected", reason.trim());
  };

  const renderStatusActions = (product) => {
    const busy = statusBusyId === product._id;
    const status = product.status;
    return (
      <>
        {status === "pending_hod_approval" && (
          <>
            <Tooltip content="Approve">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                disabled={busy}
                onClick={() => changeStatus(product._id, "active")}
                aria-label="Approve product"
              >
                <Check className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Reject">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={() =>
                  setRejectDialog({
                    visible: true,
                    id: product._id,
                    reason: "",
                  })
                }
                aria-label="Reject product"
              >
                <Ban className="h-4 w-4" />
              </Button>
            </Tooltip>
          </>
        )}
        {(status === "active" || status === "inactive") && (
          <Tooltip content={status === "active" ? "Deactivate" : "Activate"}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              disabled={busy}
              onClick={() =>
                changeStatus(
                  product._id,
                  status === "active" ? "inactive" : "active",
                )
              }
              aria-label={status === "active" ? "Deactivate" : "Activate"}
            >
              <Power className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
        {status === "rejected" && (
          <Tooltip content="Approve">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
              disabled={busy}
              onClick={() => changeStatus(product._id, "active")}
              aria-label="Approve product"
            >
              <Check className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
      </>
    );
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "#",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (page - 1) * 10 + index + 1,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        exportValue: (product) => product.name,
        render: (product) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary!">
              {(product.name || "PR").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="font-medium text-foreground">{product.name}</div>
              {product.hasVariants && (
                <div className="text-xs text-muted-foreground">
                  {product.variantCombinationCount ??
                    product.variantCombinations?.length ??
                    0}{" "}
                  variants
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "productCode",
        label: "Code",
        sortable: true,
        exportValue: (product) => product.productCode || "-",
        render: (product) => (
          <code className="text-primary!">{product.productCode || "-"}</code>
        ),
      },
      {
        key: "category",
        label: "Category",
        exportValue: (product) => product.category?.name || "-",
        render: (product) => product.category?.name || "-",
      },
      {
        key: "brand",
        label: "Brand",
        exportValue: (product) => product.brand?.name || "-",
        render: (product) => product.brand?.name || "-",
      },
      {
        key: "status",
        label: "Status",
        sortValue: (product) => product.status,
        exportValue: (product) => product.status,
        render: (product) => getStatusBadge(product.status),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (product) => (
          <RowActions
            onView={() => navigate(`/products/${product._id}`)}
            onEdit={
              canUpdate("products")
                ? () => navigate(`/products/edit/${product._id}`)
                : undefined
            }
            onDelete={
              canDeleteProduct
                ? () => handleDeleteClick(product._id)
                : undefined
            }
            extra={isHod ? renderStatusActions(product) : null}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, canDeleteProduct, isHod, statusBusyId],
  );

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog, variants, and availability."
        actions={
          canCreate("products") && (
            <Button onClick={() => navigate("/products/new")}>
              <Plus className="h-4 w-4" />
              Add Product
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Brand</Label>
            <Select
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="pending_hod_approval">Pending Approval</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <FilterLockButton
              filtersLocked={filtersLocked}
              onToggle={handleToggleFiltersLock}
              pageLabel="Products"
            />
            <Button
              variant="outline"
              disabled={!hasActiveFilters}
              onClick={handleClearFilters}
              title="Clear all filters"
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={products}
        rowKey={(product) => product._id}
        loading={loading}
        onRowClick={(product) => navigate(`/products/${product._id}`)}
        showSearch={false}
        exportFileName="products"
        emptyTitle="No products found"
        emptyMessage={
          searchTerm
            ? `No products found matching "${searchTerm}"`
            : 'Click "Add Product" to create one.'
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
        title="Delete Product?"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      <Dialog
        open={rejectDialog.visible}
        onOpenChange={(open) =>
          !open && setRejectDialog({ visible: false, id: null, reason: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Product?</DialogTitle>
            <DialogDescription>
              This product will be marked as rejected and stay out of active
              use. A remark is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">
              Rejection remark <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              rows={3}
              placeholder="Why is this product being rejected?"
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRejectDialog({ visible: false, id: null, reason: "" })
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectDialog.reason.trim()}
              onClick={handleRejectConfirm}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductList;
