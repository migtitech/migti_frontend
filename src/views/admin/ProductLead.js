import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import queryNewProductService from "../../services/queryNewProductService";
import { getAssetsUrl } from "../../api/endpoints";
import Filtered from "../../filtered/Filtered";
import {
  Loader,
  TablePagination,
  PageHeader,
  ConfirmDialog,
} from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
  return typeof img === "string" ? img : "";
};

const ProductLead = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        queryNewProductService.list({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        }),
      );
      const data = res?.data || res;
      setProducts(data?.items || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  const pageSize = pagination?.itemsPerPage || 10;
  const duplicateKeyCounts = products.reduce((acc, p) => {
    const normalizedHsn = (p?.hsnNumber || "").toString().trim().toLowerCase();
    const normalizedName = (p?.name || "").toString().trim().toLowerCase();
    const normalizedDescription = (p?.description || "")
      .toString()
      .trim()
      .toLowerCase();
    if (!normalizedHsn || !normalizedName || !normalizedDescription) return acc;
    const combinedKey = `${normalizedHsn}||${normalizedName}||${normalizedDescription}`;
    acc[combinedKey] = (acc[combinedKey] || 0) + 1;
    return acc;
  }, {});

  const requestDeleteProduct = (e, productId) => {
    e.stopPropagation();
    if (!productId) return;
    setConfirmDelete({ visible: true, id: productId });
  };

  const handleDeleteConfirm = async () => {
    const productId = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!productId) return;
    try {
      await queryNewProductService.delete(productId);
      toastSuccess("Product lead deleted successfully");
      fetchProducts();
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete product lead",
      );
    }
  };

  return (
    <div>
      <PageHeader title="Product Lead" description="Products from new query" />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 max-w-sm">
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>

          {loading ? (
            <Loader message="Loading products..." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Model Number</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead style={{ width: 80 }}>Image</TableHead>
                      <TableHead style={{ width: 120 }}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, index) => {
                      const images = product?.images || [];
                      const firstImageUrl = getImageUrl(images[0]);
                      const normalizedHsn = (product?.hsnNumber || "")
                        .toString()
                        .trim()
                        .toLowerCase();
                      const normalizedName = (product?.name || "")
                        .toString()
                        .trim()
                        .toLowerCase();
                      const normalizedDescription = (product?.description || "")
                        .toString()
                        .trim()
                        .toLowerCase();
                      const duplicateKey =
                        normalizedHsn && normalizedName && normalizedDescription
                          ? `${normalizedHsn}||${normalizedName}||${normalizedDescription}`
                          : "";
                      const isDuplicateEntry =
                        !!duplicateKey &&
                        (duplicateKeyCounts[duplicateKey] || 0) > 1;
                      return (
                        <TableRow
                          key={product._id}
                          onClick={() =>
                            navigate(`/product-lead/${product._id}`)
                          }
                          className={cn(
                            "cursor-pointer",
                            isDuplicateEntry && "bg-muted",
                          )}
                        >
                          <TableCell>
                            {(page - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>
                            <strong>{product.name || "-"}</strong>
                          </TableCell>
                          <TableCell>{product.description || "-"}</TableCell>
                          <TableCell>
                            {Array.isArray(product.variants) &&
                            product.variants.length > 0
                              ? product.variants.join(", ")
                              : "-"}
                          </TableCell>
                          <TableCell>{product.modelNumber || "-"}</TableCell>
                          <TableCell>
                            {product.hsnNumber || "-"}
                            {isDuplicateEntry && (
                              <Badge variant="secondary" className="ml-2">
                                Duplicate
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{product.unit || "-"}</TableCell>
                          <TableCell>
                            {firstImageUrl ? (
                              <img
                                src={firstImageUrl}
                                alt={product.name}
                                className="rounded border border-border"
                                style={{
                                  width: 56,
                                  height: 56,
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div
                                className="flex items-center justify-center rounded bg-muted text-muted-foreground"
                                style={{ width: 56, height: 56 }}
                              >
                                <small>No image</small>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={(e) =>
                                requestDeleteProduct(e, product._id)
                              }
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {products.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="py-4 text-center text-muted-foreground"
                        >
                          {searchTerm
                            ? `No products found matching "${searchTerm}"`
                            : "No products found in the new query product list."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={pagination?.currentPage ?? 1}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                showRange
                totalItems={pagination?.totalItems ?? 0}
                itemsPerPage={pagination?.itemsPerPage ?? 10}
                ariaLabel="Product Lead pages"
              />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Product Lead?"
        message="This product lead will be permanently removed. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default ProductLead;
