import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CAlert,
  CImage,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CModalFooter,
  CFormInput,
  CFormLabel,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilPencil, cilX, cilCheckCircle } from "@coreui/icons";
import productService from "../../services/productService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { formatDateInputValue } from "../../utils/procurementTimeline";
import StatusLabel from "../../components/StatusLabel/StatusLabel";
import { useAuth } from "../../context/AuthContext";
import { isBackOfficeRole } from "../../hooks/usePermissions";

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
  return typeof img === "string" ? img : "";
};

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBackOfficeUser = isBackOfficeRole(user?.role);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedImage, setExpandedImage] = useState(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [secretError, setSecretError] = useState("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => productService.getById(id));
        const data = res?.data || res;
        setProduct(data);
      } catch (err) {
        toastError(err?.message || "Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleHodApproveConfirm = () => {
    setShowConfirmModal(false);
    setSecretCode("");
    setSecretError("");
    setShowSecretModal(true);
  };

  const handleSecretSubmit = async () => {
    if (secretCode !== "2003") {
      setSecretError("Incorrect secret code. Please try again.");
      return;
    }
    setApproving(true);
    try {
      await productService.update(id, { status: "hod_approved" });
      setProduct((prev) => ({ ...prev, status: "hod_approved" }));
      toastSuccess("Product HOD approved successfully.");
      setShowSecretModal(false);
    } catch (err) {
      toastError(err?.message || "Failed to approve product.");
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <CBadge color="success">Active</CBadge>;
      case "inactive":
        return <CBadge color="secondary">Inactive</CBadge>;
      case "draft":
        return <CBadge color="warning">Draft</CBadge>;
      case "hod_approved":
        return <CBadge color="success">HOD Approved</CBadge>;
      case "hod_approval_pending":
        return <CBadge color="warning">HOD Approval Pending</CBadge>;
      default:
        return <CBadge color="info">{status}</CBadge>;
    }
  };

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading product..." />
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CAlert color="danger">
        {error}
        <CCardBody>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            Back to Products
          </CButton>
        </CCardBody>
      </CAlert>
    );
  }

  if (!product) {
    return (
      <CAlert color="warning">
        Product not found.
        <CCardBody>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            Back to Products
          </CButton>
        </CCardBody>
      </CAlert>
    );
  }

  const keyValueRows = [
    ...(product.productCode
      ? [{ key: "Product Code", value: product.productCode, highlight: true }]
      : []),
    ...(product.shortDescription
      ? [{ key: "Short Description", value: product.shortDescription }]
      : []),
    { key: "Category", value: product.category?.name || "-" },
    { key: "Subcategory", value: product.subcategory?.name || "-" },
    { key: "Brand", value: product.brand?.name || "-" },
    { key: "Group", value: product.group?.name || "-" },
    { key: "HSN Number", value: product.hsnNumber || "-", highlight: true },
    { key: "Default Model Number", value: product.defaultModelNumber || "-" },
    {
      key: "GST %",
      value:
        product.gstPercentage != null && product.gstPercentage !== ""
          ? `${product.gstPercentage}%`
          : "-",
      highlight: true,
    },
    { key: "Unit", value: product.unit || "PCS" },
    ...(product.tags?.length > 0
      ? [
          {
            key: "Tags",
            value: product.tags.map((tag, i) => (
              <CBadge key={i} color="info" className="me-1">
                {tag}
              </CBadge>
            )),
          },
        ]
      : []),
  ];

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex gap-2">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Products
          </CButton>
          {!isBackOfficeUser ? (
            <>
              <CButton
                color="warning"
                onClick={() => navigate(`/products/edit/${id}`)}
              >
                <CIcon icon={cilPencil} className="me-1" />
                Edit
              </CButton>
              {product?.status !== "hod_approved" && (
                <CButton
                  color="success"
                  onClick={() => setShowConfirmModal(true)}
                >
                  <CIcon icon={cilCheckCircle} className="me-1" />
                  HOD Approve
                </CButton>
              )}
              {product?.status === "hod_approved" && (
                <CBadge color="success" className="px-3 py-2 fs-6">
                  HOD Approved
                </CBadge>
              )}
            </>
          ) : null}
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center gap-2">
              <strong>{product.name}</strong>
              {getStatusBadge(product.status)}
            </CCardHeader>
            <CCardBody className="p-0">
              <CTable bordered hover responsive className="mb-0">
                <CTableBody>
                  {keyValueRows.map((row, idx) => (
                    <CTableRow
                      key={idx}
                      className={row.highlight ? "table-warning" : ""}
                    >
                      <CTableHeaderCell
                        style={{
                          width: "35%",
                          backgroundColor: row.highlight
                            ? "#fff3cd"
                            : "#f8f9fa",
                          fontWeight: 600,
                        }}
                        className="text-nowrap"
                      >
                        {row.key}
                      </CTableHeaderCell>
                      <CTableDataCell
                        style={
                          row.highlight
                            ? { backgroundColor: "#fff3cd", fontWeight: 600 }
                            : {}
                        }
                      >
                        {row.value}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>

          {/* Variant definitions */}
          {product.hasVariants && product.variants?.length > 0 && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Variant types</strong>
              </CCardHeader>
              <CCardBody className="p-0">
                <CTable bordered hover responsive className="mb-0">
                  <CTableBody>
                    {product.variants.map((variant, idx) => (
                      <CTableRow key={idx}>
                        <CTableHeaderCell
                          style={{
                            width: "35%",
                            backgroundColor: "#f8f9fa",
                            fontWeight: 600,
                          }}
                        >
                          {variant.name}
                        </CTableHeaderCell>
                        <CTableDataCell>
                          {(variant.options || []).map((opt, i) => (
                            <CBadge key={i} color="primary" className="me-1">
                              {opt}
                            </CBadge>
                          ))}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          )}

          {product.hasVariants && product.variantCombinations?.length > 0 && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Variant combinations</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  {product.variantCombinations.map((combo, cIdx) => (
                    <CCol key={combo.uniqueId || cIdx} xs={12} sm={6} lg={3}>
                      <CCard className="h-100 border">
                        <CCardBody className="py-3">
                          <div className="mb-2">
                            <code className="text-primary small d-block mb-1">
                              {combo.variantCode || "—"}
                            </code>
                            <strong className="small">
                              {combo.optionValues
                                ?.map(
                                  (o) => `${o.variantName}: ${o.variantValue}`,
                                )
                                .join(" · ") || "—"}
                            </strong>
                          </div>
                          <div className="small mb-2">
                            <div className="d-flex justify-content-between py-1 border-bottom">
                              <span className="text-muted">Status</span>
                              <StatusLabel
                                status={
                                  combo.isActive !== false
                                    ? "active"
                                    : "inactive"
                                }
                              />
                            </div>
                            <div className="d-flex justify-content-between py-1 border-bottom">
                              <span className="text-muted">Model</span>
                              <span>
                                {combo.modelNumber ||
                                  product.defaultModelNumber ||
                                  "—"}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between py-1 border-bottom">
                              <span className="text-muted">Purchase</span>
                              <span>
                                {combo.costPrice != null &&
                                combo.costPrice !== ""
                                  ? combo.costPrice
                                  : "—"}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between py-1 border-bottom">
                              <span className="text-muted">Selling</span>
                              <span>
                                {combo.price != null && combo.price !== ""
                                  ? combo.price
                                  : "—"}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between py-1 border-bottom">
                              <span className="text-muted">Timeline</span>
                              <span>
                                {combo.timeline > 0
                                  ? `${combo.timeline} day${combo.timeline === 1 ? "" : "s"}`
                                  : "—"}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between py-1">
                              <span className="text-muted">Next review</span>
                              <span>
                                {combo.nextTimelineDate
                                  ? formatDateInputValue(combo.nextTimelineDate)
                                  : "—"}
                              </span>
                            </div>
                            {combo.procurementReviewStatus &&
                              combo.procurementReviewStatus !== "idle" && (
                                <div className="text-muted text-capitalize mt-1">
                                  {combo.procurementReviewStatus}
                                </div>
                              )}
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {(combo.images || []).length > 0 ? (
                              (combo.images || []).map((img, iIdx) => {
                                const src = getImageUrl(img);
                                return (
                                  <div
                                    key={img?._id || iIdx}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setExpandedImage(src)}
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && setExpandedImage(src)
                                    }
                                    className="rounded border overflow-hidden"
                                    style={{
                                      width: 56,
                                      height: 56,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <CImage
                                      src={src}
                                      width={56}
                                      height={56}
                                      className="object-fit-cover w-100 h-100"
                                    />
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-muted small">
                                No images
                              </span>
                            )}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>
              </CCardBody>
            </CCard>
          )}

          {/* Physical Attributes */}
          {(product.weight > 0 ||
            (product.dimensions &&
              (product.dimensions.width > 0 ||
                product.dimensions.height > 0 ||
                product.dimensions.length > 0))) && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Physical attributes</strong>
              </CCardHeader>
              <CCardBody className="p-0">
                <CTable bordered hover responsive className="mb-0">
                  <CTableBody>
                    {product.weight > 0 && (
                      <CTableRow>
                        <CTableHeaderCell
                          style={{
                            width: "35%",
                            backgroundColor: "#f8f9fa",
                            fontWeight: 600,
                          }}
                        >
                          Weight
                        </CTableHeaderCell>
                        <CTableDataCell>
                          {product.weight} {product.weightUnit}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                    {product.dimensions &&
                      (product.dimensions.length > 0 ||
                        product.dimensions.width > 0 ||
                        product.dimensions.height > 0) && (
                        <CTableRow>
                          <CTableHeaderCell
                            style={{
                              width: "35%",
                              backgroundColor: "#f8f9fa",
                              fontWeight: 600,
                            }}
                          >
                            Dimensions
                          </CTableHeaderCell>
                          <CTableDataCell>
                            {product.dimensions.length} ×{" "}
                            {product.dimensions.width} ×{" "}
                            {product.dimensions.height} {product.dimensionUnit}
                          </CTableDataCell>
                        </CTableRow>
                      )}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          )}
        </CCol>

        {/* Main product images sidebar */}
        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Product images</strong>
            </CCardHeader>
            <CCardBody>
              {product.images?.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {product.images.map((img, index) => {
                    const src = getImageUrl(img);
                    return (
                      <div
                        key={img?._id || index}
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedImage(src)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setExpandedImage(src)
                        }
                        className="rounded border overflow-hidden"
                        style={{ width: 120, height: 120, cursor: "pointer" }}
                      >
                        <CImage
                          src={src}
                          width={120}
                          height={120}
                          className="object-fit-cover w-100 h-100"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted mb-0">No images uploaded</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* HOD Approve — confirmation modal */}
      <CModal
        alignment="center"
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
      >
        <CModalHeader>
          <CModalTitle>Confirm HOD Approval</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to HOD approve <strong>{product?.name}</strong>?
          This will mark the product as approved by HOD.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </CButton>
          <CButton color="success" onClick={handleHodApproveConfirm}>
            Yes, Proceed
          </CButton>
        </CModalFooter>
      </CModal>

      {/* HOD Approve — secret code modal */}
      <CModal
        alignment="center"
        visible={showSecretModal}
        onClose={() => !approving && setShowSecretModal(false)}
      >
        <CModalHeader>
          <CModalTitle>Enter Secret Code</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel className="fw-semibold">Secret Code</CFormLabel>
          <CFormInput
            type="password"
            placeholder="Enter secret code"
            value={secretCode}
            onChange={(e) => {
              setSecretCode(e.target.value);
              setSecretError("");
            }}
            onKeyDown={(e) =>
              e.key === "Enter" && !approving && handleSecretSubmit()
            }
            autoFocus
            invalid={!!secretError}
          />
          {secretError && (
            <div className="text-danger small mt-1">{secretError}</div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            disabled={approving}
            onClick={() => setShowSecretModal(false)}
          >
            Cancel
          </CButton>
          <CButton
            color="success"
            disabled={approving || !secretCode}
            onClick={handleSecretSubmit}
          >
            {approving ? <CSpinner size="sm" className="me-1" /> : null}
            Confirm Approval
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Image expand modal */}
      <CModal
        alignment="center"
        visible={!!expandedImage}
        onClose={() => setExpandedImage(null)}
        className="p-0"
      >
        <CModalHeader className="border-0 pb-0">
          <CModalTitle>Image</CModalTitle>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="rounded-circle"
            onClick={() => setExpandedImage(null)}
            aria-label="Close"
          >
            <CIcon icon={cilX} size="lg" />
          </CButton>
        </CModalHeader>
        <CModalBody className="text-center p-3">
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded"
              className="img-fluid rounded"
              style={{ maxHeight: "80vh", objectFit: "contain" }}
            />
          )}
        </CModalBody>
      </CModal>
    </>
  );
};

export default ProductView;
