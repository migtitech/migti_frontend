import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CListGroup,
  CListGroupItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CImage,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilX, cilArrowRight } from "@coreui/icons";
import queryService from "../../services/queryService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const formatVariants = (variants) => {
  if (!variants?.length) return "—";
  return (
    variants
      .map((v) => v.variantName || v || "—")
      .filter(Boolean)
      .join(", ") || "—"
  );
};

const QuotationGenerate = () => {
  const { queryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryFromState = location.state?.query || null;
  const forceNewQuotation = !!location.state?.forceNewQuotation;
  const { canCreate, canUpdate } = usePermissions();
  const canSubmitQuotation = canCreate("quotations") || canUpdate("quotations");

  const [query, setQuery] = useState(queryFromState);
  const [loading, setLoading] = useState(!queryFromState);
  const [remark, setRemark] = useState("");
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedImages, setExpandedImages] = useState([]);
  const [expandedImageIndex, setExpandedImageIndex] = useState(0);

  const getImageUrl = (img) => {
    if (!img) return "";
    if (typeof img === "string")
      return img.startsWith("http") ? img : getAssetsUrl(img);
    if (typeof img === "object" && img?.path)
      return img.path.startsWith("http") ? img.path : getAssetsUrl(img.path);
    if (typeof img === "object" && img?.url) return img.url;
    return "";
  };

  useEffect(() => {
    const load = async () => {
      if (!queryId) return;
      if (queryFromState) {
        setProducts((queryFromState.products || []).map((p) => ({ ...p })));
        setRemark(queryFromState.remark || "");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => queryService.getById(queryId));
        const data = res?.data || res;
        const q = data?.data ?? data;
        setQuery(q);
        setProducts((q?.products || []).map((p) => ({ ...p })));
        setRemark(q?.remark || "");
      } catch (err) {
        toastError(err?.message || "Failed to load query");
        navigate("/queries");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryId, queryFromState, navigate]);

  const handleSubmit = async () => {
    if (!query?.queryCode) {
      toastError("Query code is missing");
      return;
    }
    if (products.length === 0) {
      toastError("Add at least one product");
      return;
    }
    setSubmitting(true);
    try {
      const productsPayload = products.map((p) => {
        const pid = p.product_id;
        const productId = !pid
          ? null
          : typeof pid === "object" && pid._id
            ? String(pid._id)
            : String(pid);
        return {
          productName: p.productName || "",
          quantity: Number(p.quantity) ?? 1,
          unit: p.unit || "",
          hsnNumber: p.hsnNumber || "",
          modelNumber: p.modelNumber || "",
          rawProductCode:
            (p.rawProductCode && String(p.rawProductCode).trim()) || "",
          gstPercentage:
            typeof p.gstPercentage === "number" ? p.gstPercentage : null,
          variants: (p.variants || []).map((v) => ({
            variantName: v.variantName || v || "",
          })),
          remark: p.remark || "",
          description: p.description || "",
          product_id: productId,
          images: (p.images || [])
            .map((img) => (typeof img === "object" && img?._id ? img._id : img))
            .filter(Boolean),
        };
      });
      const res = await queryService.convertToQuotation(query.queryCode, {
        remark,
        products: productsPayload,
        forceNewQuotation,
      });
      const bundle = res?.data ?? res;
      const quotation = bundle?.quotation;
      const updatedQuery = bundle?.query;
      const qMongoId = updatedQuery?._id ?? updatedQuery?.id ?? queryId;
      const quotationId = quotation?._id ?? quotation?.id;
      const quotationCode = quotation?.quotationCode ?? "";
      if (qMongoId && quotationId) {
        try {
          await queryService.syncQuotationOnQuery({
            queryId: String(qMongoId),
            quotationId: String(quotationId),
            quotationCode,
          });
        } catch (syncErr) {
          console.error("syncQuotationOnQuery failed", syncErr);
        }
      }
      toastSuccess("Quotation created successfully");
      if (quotation?._id || quotation?.id) {
        navigate(`/quotations/${quotation._id || quotation.id}`);
      } else {
        navigate("/quotations");
      }
    } catch (err) {
      toastError(err?.message || "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const ci = query?.companyInfo || {};
  const prods = products;

  if (loading) return <Loader />;

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <CButton
              color="light"
              variant="ghost"
              onClick={() => navigate(`/queries/${queryId}`)}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back to Query
            </CButton>
            <h4 className="mb-0">Generate Quotation from Query</h4>
          </div>
        </CCol>
      </CRow>

      {/* 1. Company Information - Read only */}
      <CCard className="mb-4">
        <CCardHeader>
          <strong>1. Company Information</strong>{" "}
          <span className="text-muted fw-normal">(Read only)</span>
        </CCardHeader>
        <CCardBody>
          <CListGroup flush>
            <CListGroupItem className="d-flex justify-content-between">
              <strong>Company name</strong>
              <span>{ci.name || "-"}</span>
            </CListGroupItem>
            <CListGroupItem className="d-flex justify-content-between">
              <strong>Location</strong>
              <span>{ci.location || "-"}</span>
            </CListGroupItem>
            <CListGroupItem>
              <strong>Purchase managers</strong>
              <div className="mt-1">
                {(ci.purchaseManagers || []).length > 0
                  ? (ci.purchaseManagers || []).map((m, i) => (
                      <div key={i}>
                        {m.name || "–"}
                        {m.phone ? ` • ${m.phone}` : ""}
                        {m.email ? ` • ${m.email}` : ""}
                      </div>
                    ))
                  : ci.purchase_manager_name || ci.purchase_manager_phone
                    ? `${ci.purchase_manager_name || "–"} • ${ci.purchase_manager_phone || ""}`
                    : "–"}
              </div>
            </CListGroupItem>
            <CListGroupItem>
              <strong>Address</strong>
              <div className="mt-1">{ci.address || "-"}</div>
            </CListGroupItem>
          </CListGroup>
        </CCardBody>
      </CCard>

      {/* 2. Remark - Read only */}
      <CCard className="mb-4">
        <CCardHeader>
          <strong>2. Remark</strong>{" "}
          <span className="text-muted fw-normal">(Read only)</span>
        </CCardHeader>
        <CCardBody>
          <CFormLabel>Remark</CFormLabel>
          <CFormTextarea
            value={remark}
            rows={3}
            placeholder="No remark"
            disabled
            readOnly
          />
        </CCardBody>
      </CCard>

      {/* 3. Add product + Products table */}
      <CCard className="mb-4">
        <CCardHeader>
          <strong>3. Products</strong>
        </CCardHeader>
        <CCardBody>
          {/* Products table */}
          {prods.length > 0 ? (
            <CTable responsive hover bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 60 }}>#</CTableHeaderCell>
                  <CTableHeaderCell>Product name</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 100 }}>
                    Quantity
                  </CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 80 }}>
                    Unit
                  </CTableHeaderCell>
                  <CTableHeaderCell>Variants</CTableHeaderCell>
                  <CTableHeaderCell>HSN</CTableHeaderCell>
                  <CTableHeaderCell>GST %</CTableHeaderCell>
                  <CTableHeaderCell>Remark</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 120 }}>
                    Images
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {prods.map((p, index) => {
                  const productRef =
                    typeof p.product_id === "object" ? p.product_id : null;
                  const snapshotImages = Array.isArray(p.images)
                    ? p.images
                    : [];
                  const productRefImages = Array.isArray(productRef?.images)
                    ? productRef.images
                    : [];
                  const allImages =
                    (snapshotImages.length
                      ? snapshotImages
                      : productRefImages) || [];
                  const imageUrls = allImages
                    .map((img) => getImageUrl(img))
                    .filter((src) => !!src);
                  return (
                    <CTableRow key={index}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{p.productName || "—"}</CTableDataCell>
                      <CTableDataCell className="small">
                        {p.description || productRef?.shortDescription || "—"}
                      </CTableDataCell>
                      <CTableDataCell>
                        {p.quantity != null ? p.quantity : "—"}
                      </CTableDataCell>
                      <CTableDataCell>{p.unit || "—"}</CTableDataCell>
                      <CTableDataCell className="small">
                        {formatVariants(p.variants)}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {productRef?.hsnNumber || p.hsnNumber || "—"}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {productRef?.gstPercentage != null
                          ? `${productRef.gstPercentage}%`
                          : p.gstPercentage != null
                            ? `${p.gstPercentage}%`
                            : "—"}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {p.remark || "—"}
                      </CTableDataCell>
                      <CTableDataCell>
                        {imageUrls.length > 0 ? (
                          <div
                            role="button"
                            tabIndex={0}
                            className="d-inline-flex align-items-center gap-1 flex-wrap"
                            style={{ cursor: "pointer", maxWidth: 140 }}
                            onClick={() => {
                              setExpandedImages(imageUrls);
                              setExpandedImageIndex(0);
                            }}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              (setExpandedImages(imageUrls),
                              setExpandedImageIndex(0))
                            }
                            aria-label="View images"
                          >
                            {imageUrls.slice(0, 2).map((src, i) => (
                              <div
                                key={i}
                                className="rounded overflow-hidden border flex-shrink-0"
                                style={{ width: 40, height: 40 }}
                              >
                                <CImage
                                  src={src}
                                  alt=""
                                  className="w-100 h-100"
                                  style={{ objectFit: "cover" }}
                                />
                              </div>
                            ))}
                            {imageUrls.length > 2 && (
                              <div
                                className="d-flex align-items-center justify-content-center rounded border bg-light flex-shrink-0 text-primary small fw-bold"
                                style={{
                                  width: 40,
                                  height: 40,
                                  fontSize: "0.75rem",
                                }}
                              >
                                +{imageUrls.length - 2}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  );
                })}
              </CTableBody>
            </CTable>
          ) : (
            <p className="text-muted mb-0">No products on this query.</p>
          )}
        </CCardBody>
      </CCard>

      <CRow>
        <CCol xs={12} className="d-flex justify-content-end gap-2">
          <CButton
            color="light"
            variant="outline"
            onClick={() => navigate(`/queries/${queryId}`)}
          >
            Back to Query
          </CButton>
          {canSubmitQuotation && (
            <CButton
              color="success"
              onClick={handleSubmit}
              disabled={submitting || products.length === 0}
            >
              {submitting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                "Create Quotation"
              )}
            </CButton>
          )}
        </CCol>
      </CRow>

      <CModal
        alignment="center"
        visible={expandedImages.length > 0}
        onClose={() => setExpandedImages([])}
        className="p-0"
      >
        <CModalHeader className="border-0 pb-0 d-flex justify-content-between align-items-center">
          <CModalTitle className="mb-0">
            Image{" "}
            {expandedImages.length > 1
              ? `${expandedImageIndex + 1} / ${expandedImages.length}`
              : ""}
          </CModalTitle>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="rounded-circle"
            onClick={() => setExpandedImages([])}
          >
            <CIcon icon={cilX} size="lg" />
          </CButton>
        </CModalHeader>
        <CModalBody className="text-center p-3 position-relative">
          {expandedImages.length > 0 && (
            <>
              {expandedImages.length > 1 && (
                <>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle ms-2"
                    style={{ zIndex: 10, width: 48, height: 48, left: 0 }}
                    onClick={() =>
                      setExpandedImageIndex((i) =>
                        i <= 0 ? expandedImages.length - 1 : i - 1,
                      )
                    }
                  >
                    <CIcon icon={cilArrowLeft} size="lg" />
                  </CButton>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle me-2"
                    style={{ zIndex: 10, width: 48, height: 48, right: 0 }}
                    onClick={() =>
                      setExpandedImageIndex((i) =>
                        i >= expandedImages.length - 1 ? 0 : i + 1,
                      )
                    }
                  >
                    <CIcon icon={cilArrowRight} size="lg" />
                  </CButton>
                </>
              )}
              <img
                src={expandedImages[expandedImageIndex]}
                alt=""
                className="img-fluid rounded"
                style={{ maxHeight: "80vh", objectFit: "contain" }}
              />
            </>
          )}
        </CModalBody>
      </CModal>
    </>
  );
};

export default QuotationGenerate;
