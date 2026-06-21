import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CListGroup,
  CListGroupItem,
  CRow,
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableDataCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft } from "@coreui/icons";
import { useData } from "../../context/DataContext";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import FindProductModal from "./FindProductModal";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import industryService from "../../services/industryService";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const INITIAL_COMPANY = {
  name: "",
  area: "",
  location: "",
  address: "",
  purchase_manager_name: "",
  purchase_manager_phone: "",
  email: "",
};

const INITIAL_VARIANT = { variantName: "", quantity: 1 };

const INITIAL_PRODUCT = {
  productName: "",
  quantity: 1,
  unit: "",
  variants: [],
  remark: "",
  product_id: null,
  quotedRate: "",
  gstPercentage: "",
};

const QuotationCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatArea } = useAreaNameLookup();
  const fromQuery = location.state?.fromQuery || null;
  const { addQuotation } = useData();

  const [companyInfo, setCompanyInfo] = useState(() => {
    const ci = fromQuery?.companyInfo || {};
    return {
      ...INITIAL_COMPANY,
      name: ci.name || "",
      area: ci.area || "",
      location: ci.location || "",
      address: ci.address || "",
      purchase_manager_name: ci.purchase_manager_name || "",
      purchase_manager_phone: ci.purchase_manager_phone || "",
      email: ci.email || "",
    };
  });

  const [industrySearch, setIndustrySearch] = useState(
    () => fromQuery?.companyInfo?.name || "",
  );
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [industrySearchResults, setIndustrySearchResults] = useState([]);
  const [industrySearchLoading, setIndustrySearchLoading] = useState(false);
  const [industryId, setIndustryId] = useState(
    () => fromQuery?.industry_id?._id || fromQuery?.industry_id || null,
  );
  const companyDropdownRef = useRef(null);

  const [status, setStatus] = useState("draft");

  const [products, setProducts] = useState(() => {
    if (!fromQuery || !Array.isArray(fromQuery.products)) return [];
    return fromQuery.products.map((p) => ({
      productName: p.productName || "",
      quantity: p.quantity ?? 1,
      unit: p.unit || "",
      variants: (p.variants || []).map((v) => ({
        variantName: v.variantName || "",
        quantity: v.quantity ?? 1,
      })),
      remark: p.remark || "",
      product_id: p.product_id?._id || p.product_id || null,
      quotedRate: "",
      gstPercentage:
        typeof p.gstPercentage === "number"
          ? p.gstPercentage
          : (p.gstPercentage ?? ""),
    }));
  });

  const [formProduct, setFormProduct] = useState({ ...INITIAL_PRODUCT });
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [showFindProductModal, setShowFindProductModal] = useState(false);

  const updateCompanyField = (field, value) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
  };

  const fetchIndustrySearch = useCallback(async (term) => {
    if (!term?.trim()) {
      setIndustrySearchResults([]);
      return;
    }
    setIndustrySearchLoading(true);
    try {
      const res = await industryService.getAll({
        search: term.trim(),
        pageSize: 5,
      });
      const data = res?.data || res;
      setIndustrySearchResults(data?.industries || []);
    } catch {
      setIndustrySearchResults([]);
    } finally {
      setIndustrySearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (industryId) return;
    const t = setTimeout(() => fetchIndustrySearch(industrySearch), 300);
    return () => clearTimeout(t);
  }, [industrySearch, fetchIndustrySearch, industryId]);

  const handleSelectIndustry = async (industry) => {
    const indId = industry._id || industry.id;
    setIndustryId(indId);
    setIndustrySearch(
      (industry.name || "") +
        (industry.location ? ` (${industry.location})` : ""),
    );
    setIndustryDropdownOpen(false);
    try {
      const res = await industryService.getById(indId);
      const data = res?.data || res;
      const firstPm = (data?.purchaseManagers || [])[0] || {};
      setCompanyInfo({
        name: data?.name || "",
        area:
          typeof data?.area === "object"
            ? data.area?.name || ""
            : data?.area || "",
        location: data?.location || "",
        address: data?.address || "",
        email: data?.email || "",
        purchase_manager_name: firstPm.name || "",
        purchase_manager_phone: firstPm.phone || "",
      });
    } catch {
      const firstPm = (industry?.purchaseManagers || [])[0] || {};
      setCompanyInfo({
        name: industry?.name || "",
        area:
          typeof industry?.area === "object"
            ? industry.area?.name || ""
            : industry?.area || "",
        location: industry?.location || "",
        address:
          industry?.shippingAddress ||
          industry?.billingAddress ||
          industry?.address ||
          "",
        email: industry?.email || "",
        purchase_manager_name: firstPm.name || "",
        purchase_manager_phone: firstPm.phone || "",
      });
    }
  };

  const handleClearIndustry = () => {
    setIndustryId(null);
    setIndustrySearch("");
    setCompanyInfo(INITIAL_COMPANY);
  };

  const updateFormProduct = (field, value) => {
    setFormProduct((prev) => ({ ...prev, [field]: value }));
  };

  const addVariant = () => {
    setFormProduct((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), { ...INITIAL_VARIANT }],
    }));
  };

  const removeVariant = (index) => {
    setFormProduct((prev) => {
      const variants = [...(prev.variants || [])];
      variants.splice(index, 1);
      return { ...prev, variants };
    });
  };

  const updateVariant = (index, field, value) => {
    setFormProduct((prev) => {
      const variants = [...(prev.variants || [])];
      variants[index] = { ...variants[index], [field]: value };
      return { ...prev, variants };
    });
  };

  const clearProductForm = () => {
    setFormProduct({ ...INITIAL_PRODUCT });
    setEditingProductIndex(null);
  };

  const saveProduct = () => {
    if (!formProduct.productName.trim()) {
      toastError("Product name is required");
      return;
    }
    if (!formProduct.quantity || Number(formProduct.quantity) <= 0) {
      toastError("Quantity must be greater than 0");
      return;
    }
    if (formProduct.quotedRate === "" || Number(formProduct.quotedRate) < 0) {
      toastError("Quoted rate is required");
      return;
    }
    setProducts((prev) => [...prev, { ...formProduct }]);
    clearProductForm();
    toastSuccess("Product added to quotation");
  };

  const updateProductInList = () => {
    if (editingProductIndex == null) return;
    if (!formProduct.productName.trim()) {
      toastError("Product name is required");
      return;
    }
    if (!formProduct.quantity || Number(formProduct.quantity) <= 0) {
      toastError("Quantity must be greater than 0");
      return;
    }
    if (formProduct.quotedRate === "" || Number(formProduct.quotedRate) < 0) {
      toastError("Quoted rate is required");
      return;
    }
    setProducts((prev) => {
      const next = [...prev];
      next[editingProductIndex] = { ...formProduct };
      return next;
    });
    clearProductForm();
    toastSuccess("Product updated in quotation");
  };

  const editProductFromTable = (index) => {
    const p = products[index];
    setFormProduct({
      productName: p.productName || "",
      quantity: p.quantity ?? 1,
      unit: p.unit || "",
      variants: (p.variants || []).map((v) => ({
        variantName: v.variantName || "",
        quantity: v.quantity ?? 1,
      })),
      remark: p.remark || "",
      product_id: p.product_id || null,
      quotedRate: p.quotedRate || "",
      gstPercentage:
        p.gstPercentage != null && p.gstPercentage !== ""
          ? p.gstPercentage
          : "",
    });
    setEditingProductIndex(index);
  };

  const deleteProductFromTable = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
    if (editingProductIndex === index) {
      clearProductForm();
    } else if (editingProductIndex != null && editingProductIndex > index) {
      setEditingProductIndex((prev) => prev - 1);
    }
    toastSuccess("Product removed from quotation");
  };

  const handleImportProducts = (importedProducts) => {
    if (!importedProducts?.length) return;
    const mapped = importedProducts.map((p) => ({
      productName: p.productName || "",
      quantity: p.quantity ?? 1,
      unit: p.unit || "",
      variants: (p.variants || []).map((v) => ({
        variantName: v.variantName || "",
        quantity: v.quantity ?? 1,
      })),
      remark: p.remark || "",
      product_id: p.product_id || null,
      quotedRate: "",
    }));
    setProducts((prev) => [...prev, ...mapped]);
    toastSuccess(`${mapped.length} product(s) imported`);
  };

  const getLineTotal = (p) => {
    const qty = Number(p.quantity) || 0;
    const rate = Number(p.quotedRate) || 0;
    return qty * rate;
  };

  const updateProductField = (index, field, value) => {
    setProducts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRateChange = (index, value) => {
    const rate = value === "" ? "" : String(value);
    updateProductField(index, "quotedRate", rate);
  };

  const handleLineTotalChange = (index, value) => {
    const p = products[index];
    const qty = Number(p.quantity) || 0;
    if (!qty) return;
    const lineTotal = parseFloat(value);
    if (Number.isNaN(lineTotal)) return;
    const rate = (lineTotal / qty).toFixed(2);
    updateProductField(index, "quotedRate", rate);
  };

  const totalAmount = products.reduce((sum, p) => sum + getLineTotal(p), 0);

  const handleSaveQuotation = () => {
    if (!companyInfo.name.trim()) {
      toastError("Company name is required");
      return;
    }
    if (!products.length) {
      toastError("Add at least one product to the quotation");
      return;
    }
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!(p.productName || "").trim()) {
        toastError("Each product must have a name");
        return;
      }
      const qty = Number(p.quantity);
      if (Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
        toastError(
          `Product ${i + 1}: quantity must be a whole number 0 or more`,
        );
        return;
      }
      if (qty === 0) {
        toastError("Each product must have quantity greater than 0");
        return;
      }
      const rate = p.quotedRate === "" ? NaN : Number(p.quotedRate);
      if (Number.isNaN(rate) || rate < 0) {
        toastError("Each product must have a quoted rate (0 or more)");
        return;
      }
    }

    const payload = {
      queryId: fromQuery?._id || fromQuery?.id || null,
      queryCode: fromQuery?.queryCode || "",
      industry_id: industryId || null,
      companyInfo,
      products: products.map((p) => ({
        productName: p.productName,
        quantity: Number(p.quantity) || 0,
        unit: p.unit || "",
        variants: (p.variants || []).map((v) => ({
          variantName: v.variantName || "",
          quantity: Number(v.quantity) || 0,
        })),
        remark: p.remark || "",
        product_id: p.product_id || null,
        quoted_rate: Number(p.quotedRate) || 0,
      })),
      status,
      totalAmount,
    };

    const saved = addQuotation(payload);
    toastSuccess("Quotation created successfully");
    // Navigate back to quotations list instead of a numeric local id detail route
    navigate("/quotations");
  };

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate("/quotations")}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Quotations
          </CButton>
        </CCol>
      </CRow>

      {/* 1. Company information */}
      <CCard className="mb-4">
        <CCardHeader>
          <strong>1. Company Information</strong>
        </CCardHeader>
        <CCardBody>
          {/* Company search */}
          <div className="mb-4 position-relative" ref={companyDropdownRef}>
            <CFormLabel>Search Client / Company</CFormLabel>
            <CFormInput
              type="text"
              value={industrySearch}
              onChange={(e) => {
                setIndustrySearch(e.target.value);
                if (industryId) handleClearIndustry();
              }}
              onFocus={() => setIndustryDropdownOpen(true)}
              onBlur={() =>
                setTimeout(() => setIndustryDropdownOpen(false), 200)
              }
              placeholder="Type to search for a client / company..."
              autoComplete="off"
            />
            {industryId && (
              <div className="mt-1">
                <CButton
                  color="link"
                  size="sm"
                  type="button"
                  className="p-0 text-danger"
                  onClick={handleClearIndustry}
                >
                  Clear selection
                </CButton>
              </div>
            )}
            {industryDropdownOpen && !industryId && (
              <div
                className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                style={{ zIndex: 10, maxHeight: 280, overflowY: "auto" }}
              >
                <CListGroup flush>
                  {industrySearchLoading && (
                    <CListGroupItem className="text-muted">
                      Searching...
                    </CListGroupItem>
                  )}
                  {!industrySearchLoading &&
                    industrySearchResults.length === 0 &&
                    industrySearch.trim() && (
                      <CListGroupItem className="text-muted">
                        No matches found.
                      </CListGroupItem>
                    )}
                  {!industrySearchLoading &&
                    industrySearchResults.map((ind) => (
                      <CListGroupItem
                        key={ind._id || ind.id}
                        component="button"
                        type="button"
                        className="text-start"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectIndustry(ind);
                        }}
                      >
                        <div className="fw-semibold">{ind.name}</div>
                        {ind.location && (
                          <div className="text-muted small">{ind.location}</div>
                        )}
                      </CListGroupItem>
                    ))}
                </CListGroup>
              </div>
            )}
          </div>

          {/* Auto-filled company details (read-only once a company is selected) */}
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Company name</CFormLabel>
              <CFormInput
                value={companyInfo.name}
                readOnly={!!industryId}
                className={industryId ? "bg-light" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("name", e.target.value)
                }
                placeholder={
                  industryId
                    ? "Auto-filled from selected client"
                    : "Company name"
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Location</CFormLabel>
              <CFormInput
                value={companyInfo.location}
                readOnly={!!industryId}
                className={industryId ? "bg-light" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("location", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Location"
                }
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Area</CFormLabel>
              <CFormInput
                value={formatArea(companyInfo.area) || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-light" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("area", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Area"
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                type="email"
                value={companyInfo.email || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-light" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("email", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Email"
                }
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Purchase manager name</CFormLabel>
              <CFormInput
                value={companyInfo.purchase_manager_name || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-light" : ""}
                onChange={(e) =>
                  !industryId &&
                  updateCompanyField("purchase_manager_name", e.target.value)
                }
                placeholder={
                  industryId
                    ? "Auto-filled from selected client"
                    : "Purchase manager name"
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Purchase manager phone</CFormLabel>
              <CFormInput
                value={companyInfo.purchase_manager_phone || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-light" : ""}
                onChange={(e) =>
                  !industryId &&
                  updateCompanyField("purchase_manager_phone", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Phone"
                }
              />
            </CCol>
          </CRow>

          <CRow>
            <CCol>
              <CFormLabel>Address</CFormLabel>
              <CFormTextarea
                rows={2}
                value={companyInfo.address || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-light" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("address", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Address"
                }
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* 2. Product information */}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>2. Product Information</strong>
          <CButton
            color="primary"
            size="sm"
            onClick={() => setShowFindProductModal(true)}
          >
            Find Product
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>
                {editingProductIndex != null ? "Edit product" : "Add product"}
              </strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Product name</CFormLabel>
                  <CFormInput
                    value={formProduct.productName}
                    onChange={(e) =>
                      updateFormProduct("productName", e.target.value)
                    }
                    placeholder="Product name"
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Quantity</CFormLabel>
                  <CFormInput
                    type="number"
                    min={0}
                    value={formProduct.quantity}
                    onChange={(e) =>
                      updateFormProduct("quantity", Number(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Unit</CFormLabel>
                  <ProductUnitSelect
                    value={formProduct.unit}
                    onChange={(e) => updateFormProduct("unit", e.target.value)}
                  />
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol md={4}>
                  <CFormLabel>Quoted rate</CFormLabel>
                  <CFormInput
                    type="number"
                    min={0}
                    value={formProduct.quotedRate}
                    onChange={(e) =>
                      updateFormProduct("quotedRate", e.target.value)
                    }
                    placeholder="0"
                  />
                </CCol>
                <CCol md={8} className="d-flex align-items-end">
                  <div className="fw-semibold">
                    Line total:{" "}
                    {(() => {
                      const qty = Number(formProduct.quantity) || 0;
                      const rate = Number(formProduct.quotedRate) || 0;
                      return `₹${(qty * rate).toLocaleString()}`;
                    })()}
                  </div>
                </CCol>
              </CRow>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <CFormLabel className="mb-0">Variants (optional)</CFormLabel>
                  <CButton
                    color="primary"
                    size="sm"
                    type="button"
                    onClick={addVariant}
                  >
                    Add variant
                  </CButton>
                </div>
                {(formProduct.variants || []).length > 0 ? (
                  (formProduct.variants || []).map((v, idx) => (
                    <CRow key={idx} className="mb-2 align-items-end">
                      <CCol md={6}>
                        <CFormInput
                          value={v.variantName || ""}
                          onChange={(e) =>
                            updateVariant(idx, "variantName", e.target.value)
                          }
                          placeholder="Variant name"
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormInput
                          type="number"
                          min={0}
                          value={v.quantity ?? ""}
                          onChange={(e) =>
                            updateVariant(
                              idx,
                              "quantity",
                              Number(e.target.value) || 0,
                            )
                          }
                          placeholder="Qty"
                        />
                      </CCol>
                      <CCol md={3}>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => removeVariant(idx)}
                        >
                          Remove
                        </CButton>
                      </CCol>
                    </CRow>
                  ))
                ) : (
                  <p className="text-muted small mb-0">
                    No variants. Click &quot;Add variant&quot; to add.
                  </p>
                )}
              </div>

              <div className="mb-3">
                <CFormLabel>Remark</CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={formProduct.remark}
                  onChange={(e) => updateFormProduct("remark", e.target.value)}
                  placeholder="Remark"
                />
              </div>

              <div className="d-flex gap-2">
                {editingProductIndex != null ? (
                  <>
                    <CButton
                      color="primary"
                      type="button"
                      onClick={updateProductInList}
                    >
                      Update product
                    </CButton>
                    <CButton
                      color="secondary"
                      type="button"
                      onClick={clearProductForm}
                    >
                      Cancel
                    </CButton>
                  </>
                ) : (
                  <CButton color="primary" type="button" onClick={saveProduct}>
                    Add product
                  </CButton>
                )}
              </div>
            </CCardBody>
          </CCard>

          <div>
            <strong className="d-block mb-2">Added products</strong>
            {products.length === 0 ? (
              <p className="text-muted small mb-0">
                No products added yet. Use the form above or Find Product to
                add.
              </p>
            ) : (
              <CTable responsive hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Product name</CTableHeaderCell>
                    <CTableHeaderCell>Qty</CTableHeaderCell>
                    <CTableHeaderCell>Unit</CTableHeaderCell>
                    <CTableHeaderCell>Quoted rate</CTableHeaderCell>
                    <CTableHeaderCell>Line total</CTableHeaderCell>
                    <CTableHeaderCell>GST %</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">
                      Actions
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {products.map((p, index) => (
                    <CTableRow key={index}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{p.productName || "–"}</CTableDataCell>
                      <CTableDataCell>{p.quantity ?? "–"}</CTableDataCell>
                      <CTableDataCell>{p.unit || "–"}</CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          size="sm"
                          className="form-control-sm"
                          style={{ maxWidth: "90px", minWidth: "70px" }}
                          min={0}
                          step="0.01"
                          value={p.quotedRate === "" ? "" : p.quotedRate}
                          onChange={(e) =>
                            handleRateChange(index, e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          size="sm"
                          className="form-control-sm"
                          style={{ maxWidth: "90px", minWidth: "70px" }}
                          min={0}
                          step="0.01"
                          value={
                            getLineTotal(p) === 0 && p.quotedRate === ""
                              ? ""
                              : Number(getLineTotal(p)).toFixed(2)
                          }
                          onChange={(e) =>
                            handleLineTotalChange(index, e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          size="sm"
                          className="form-control-sm"
                          style={{ maxWidth: "70px", minWidth: "55px" }}
                          min={0}
                          max={100}
                          step="0.01"
                          value={
                            p.gstPercentage != null && p.gstPercentage !== ""
                              ? p.gstPercentage
                              : ""
                          }
                          onChange={(e) =>
                            updateProductField(
                              index,
                              "gstPercentage",
                              e.target.value === "" ? "" : e.target.value,
                            )
                          }
                          placeholder="%"
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CButton
                          color="primary"
                          size="sm"
                          variant="ghost"
                          className="me-1"
                          onClick={() => editProductFromTable(index)}
                        >
                          Edit
                        </CButton>
                        <CButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProductFromTable(index)}
                        >
                          Delete
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </div>

          <CRow className="mt-4">
            <CCol md={6}>
              <CFormLabel>Status</CFormLabel>
              <CFormSelect
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </CFormSelect>
            </CCol>
            <CCol md={6} className="d-flex align-items-end justify-content-end">
              <div className="fw-semibold">
                Total:{" "}
                <span className="fs-5">₹{totalAmount.toLocaleString()}</span>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton
            color="secondary"
            type="button"
            onClick={() => navigate("/quotations")}
          >
            Cancel
          </CButton>
          <CButton color="primary" type="button" onClick={handleSaveQuotation}>
            Generate Quotation
          </CButton>
        </CCardBody>
      </CCard>

      <FindProductModal
        visible={showFindProductModal}
        onClose={() => setShowFindProductModal(false)}
        onImport={handleImportProducts}
      />
    </>
  );
};

const quotationSchema = yup.object({
  customerName: yup.string().required("Customer name is required"),
  customerEmail: yup
    .string()
    .email("Invalid email")
    .required("Email is required"),
  items: yup.string().required("Items / description is required"),
  totalAmount: yup
    .number()
    .typeError("Total amount must be a number")
    .positive()
    .required("Total amount is required"),
  validUntil: yup.date().nullable(),
  status: yup.string().required(),
  notes: yup.string().nullable(),
  queryId: yup.string().nullable(),
});

const defaultValues = {
  queryId: "",
  customerName: "",
  customerEmail: "",
  items: "",
  totalAmount: "",
  validUntil: "",
  notes: "",
  status: "draft",
};

const QuotationEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { quotations, addQuotation, updateQuotation, queries } = useData();

  const location = useLocation();
  const fromQuery = !isEdit ? location.state?.fromQuery || null : null;

  if (fromQuery && !isEdit) {
    return <QuotationFromQuery fromQuery={fromQuery} />;
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(quotationSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await withMinimumDelay(() => Promise.resolve());
        const quotation = quotations?.find((q) => q.id === Number(id));
        if (!quotation) return;

        reset({
          queryId: quotation.queryId || "",
          customerName: quotation.customerName || "",
          customerEmail: quotation.customerEmail || "",
          items: quotation.items || "",
          totalAmount: quotation.totalAmount || "",
          validUntil: quotation.validUntil
            ? quotation.validUntil.split("T")[0]
            : "",
          notes: quotation.notes || "",
          status: quotation.status || "draft",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, quotations, reset]);

  const onSubmit = (values) => {
    try {
      const payload = {
        ...values,
        queryId: values.queryId ? Number(values.queryId) : null,
        totalAmount: Number(values.totalAmount),
        validUntil: values.validUntil
          ? new Date(values.validUntil).toISOString()
          : null,
      };

      if (isEdit) {
        updateQuotation(Number(id), payload);
        toastSuccess("Quotation updated successfully");
      } else {
        addQuotation(payload);
        toastSuccess("Quotation created successfully");
      }

      navigate("/quotations");
    } catch (err) {
      toastError("Failed to save quotation");
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading quotation..." />
      </div>
    );
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate("/quotations")}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Quotations
          </CButton>
        </CCol>
      </CRow>

      {error && <CAlert color="danger">{error}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader>
          <strong>{isEdit ? "Edit Quotation" : "Add Quotation"}</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <CFormLabel>Related Query</CFormLabel>
              <CFormSelect {...register("queryId")}>
                <option value="">Select Query (Optional)</option>
                {queries?.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.subject} - {q.customerName}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Status</CFormLabel>
              <CFormSelect {...register("status")}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={6}>
              <CFormLabel>Customer Name *</CFormLabel>
              <CFormInput {...register("customerName")} />
              {errors.customerName && (
                <div className="text-danger small">
                  {errors.customerName.message}
                </div>
              )}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Customer Email *</CFormLabel>
              <CFormInput type="email" {...register("customerEmail")} />
              {errors.customerEmail && (
                <div className="text-danger small">
                  {errors.customerEmail.message}
                </div>
              )}
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={6}>
              <CFormLabel>Total Amount *</CFormLabel>
              <CFormInput type="number" {...register("totalAmount")} />
              {errors.totalAmount && (
                <div className="text-danger small">
                  {errors.totalAmount.message}
                </div>
              )}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Valid Until</CFormLabel>
              <CFormInput type="date" {...register("validUntil")} />
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={12}>
              <CFormLabel>Items / Description *</CFormLabel>
              <CFormTextarea rows={4} {...register("items")} />
              {errors.items && (
                <div className="text-danger small">{errors.items.message}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={12}>
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea rows={2} {...register("notes")} />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate("/quotations")}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit">
            {isEdit ? "Update Quotation" : "Create Quotation"}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  );
};

const QuotationForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  if (isEdit) {
    return <QuotationEdit />;
  }

  return <QuotationCreate />;
};

export default QuotationForm;
