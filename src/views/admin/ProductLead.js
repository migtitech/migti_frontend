import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
  CImage,
  CButton,
  CBadge,
} from "@coreui/react";
import queryNewProductService from "../../services/queryNewProductService";
import { getAssetsUrl } from "../../api/endpoints";
import Filtered from "../../filtered/Filtered";
import { Loader } from "../../components";
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
      toastError(err?.message || "Failed to fetch products");
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

  const renderPageNumbers = () => {
    const totalPages = pagination.totalPages || 0;
    const currentPage = page;

    if (!totalPages) return null;

    const items = [];

    const createPageItem = (pageNumber, label, key) => (
      <CPaginationItem
        key={key ?? `p-${pageNumber}`}
        active={pageNumber === currentPage}
        disabled={pageNumber == null}
        onClick={
          pageNumber != null
            ? () => {
                if (pageNumber !== currentPage) {
                  setPage(pageNumber);
                }
              }
            : undefined
        }
      >
        {label}
      </CPaginationItem>
    );

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) {
        items.push(createPageItem(i, i));
      }
      return items;
    }

    items.push(createPageItem(1, 1));

    const showLeftEllipsis = currentPage > 3;
    const showRightEllipsis = currentPage < totalPages - 2;

    if (showLeftEllipsis) {
      items.push(createPageItem(null, "…", "ellipsis-left"));
    }

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i += 1) {
      items.push(createPageItem(i, i));
    }

    if (showRightEllipsis) {
      items.push(createPageItem(null, "…", "ellipsis-right"));
    }

    items.push(createPageItem(totalPages, totalPages));

    return items;
  };

  const handleDeleteProduct = async (e, productId) => {
    e.stopPropagation();
    if (!productId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this product lead?",
    );
    if (!confirmed) return;
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
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Product Lead</strong>
            <span className="text-muted ms-2">Products from new query</span>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={4}>
                <Filtered
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
              </CCol>
            </CRow>

            {loading ? (
              <Loader message="Loading products..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Description</CTableHeaderCell>
                      <CTableHeaderCell>Variants</CTableHeaderCell>
                      <CTableHeaderCell>Model Number</CTableHeaderCell>
                      <CTableHeaderCell>HSN</CTableHeaderCell>
                      <CTableHeaderCell>Unit</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 80 }}>
                        Image
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 120 }}>
                        Action
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
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
                        <CTableRow
                          key={product._id}
                          onClick={() =>
                            navigate(`/product-lead/${product._id}`)
                          }
                          style={{
                            cursor: "pointer",
                            backgroundColor: isDuplicateEntry
                              ? "#e9ecef"
                              : undefined,
                          }}
                        >
                          <CTableDataCell>
                            {(page - 1) * pageSize + index + 1}
                          </CTableDataCell>
                          <CTableDataCell>
                            <strong>{product.name || "-"}</strong>
                          </CTableDataCell>
                          <CTableDataCell>
                            {product.description || "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {Array.isArray(product.variants) &&
                            product.variants.length > 0
                              ? product.variants.join(", ")
                              : "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {product.modelNumber || "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {product.hsnNumber || "-"}
                            {isDuplicateEntry && (
                              <CBadge color="secondary" className="ms-2">
                                Duplicate
                              </CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>{product.unit || "-"}</CTableDataCell>
                          <CTableDataCell>
                            {firstImageUrl ? (
                              <CImage
                                src={firstImageUrl}
                                alt={product.name}
                                rounded
                                thumbnail
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
                                className="bg-light rounded d-flex align-items-center justify-content-center text-muted"
                                style={{ width: 56, height: 56 }}
                              >
                                <small>No image</small>
                              </div>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={(e) =>
                                handleDeleteProduct(e, product._id)
                              }
                            >
                              Delete
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}
                    {products.length === 0 && (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={9}
                          className="text-center text-muted py-4"
                        >
                          {searchTerm
                            ? `No products found matching "${searchTerm}"`
                            : "No products found in the new query product list."}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
                {pagination?.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="small text-medium-emphasis">
                      Showing{" "}
                      {((pagination?.currentPage ?? 1) - 1) *
                        (pagination?.itemsPerPage ?? 10) +
                        1}
                      -
                      {Math.min(
                        (pagination?.currentPage ?? 1) *
                          (pagination?.itemsPerPage ?? 10),
                        pagination?.totalItems ?? 0,
                      )}{" "}
                      of {pagination?.totalItems ?? 0}
                    </div>
                    <CPagination
                      className="mb-0 flex-wrap"
                      aria-label="Product Lead pages"
                    >
                      <CPaginationItem
                        aria-label="Previous page"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => {
                          if (pagination.hasPrevPage)
                            setPage((p) => Math.max(1, p - 1));
                        }}
                      >
                        <span aria-hidden="true">«</span> Previous
                      </CPaginationItem>
                      {renderPageNumbers()}
                      <CPaginationItem
                        aria-label="Next page"
                        disabled={!pagination.hasNextPage}
                        onClick={() => {
                          if (pagination.hasNextPage) setPage((p) => p + 1);
                        }}
                      >
                        Next <span aria-hidden="true">»</span>
                      </CPaginationItem>
                      <CPaginationItem
                        aria-label="Last page"
                        disabled={
                          !pagination.hasNextPage ||
                          page >= pagination.totalPages
                        }
                        onClick={() => {
                          if (
                            pagination.totalPages &&
                            page !== pagination.totalPages
                          ) {
                            setPage(pagination.totalPages);
                          }
                        }}
                      >
                        Last <span aria-hidden="true">»</span>
                      </CPaginationItem>
                    </CPagination>
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default ProductLead;
