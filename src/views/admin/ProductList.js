import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
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
import { Button, Alert, AlertDescription, Select } from "../../components/ui";
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
      toastError(err?.message || "Failed to fetch products");
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
        sortable: true,
        exportValue: (product) => product.name,
        render: (product) => (
          <div>
            <strong>{product.name}</strong>
            {product.hasVariants && (
              <div>
                <small className="text-muted-foreground">
                  {product.variantCombinationCount ??
                    product.variantCombinations?.length ??
                    0}{" "}
                  variants
                </small>
              </div>
            )}
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
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, canDeleteProduct],
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

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
        <div className="md:col-span-2">
          <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
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
        <Select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </Select>
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
    </div>
  );
};

export default ProductList;
