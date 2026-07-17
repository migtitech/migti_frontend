import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ArrowLeft } from "lucide-react";
import {
  Button,
  Alert,
  AlertDescription,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Select,
  Label,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "../../components/ui";
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
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/quotations")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotations
        </Button>
      </div>

      {/* 1. Company information */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>1. Company Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Company search */}
          <div className="relative mb-4" ref={companyDropdownRef}>
            <Label className="mb-1.5 block">Search Client / Company</Label>
            <Input
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
                <Button
                  variant="link"
                  size="sm"
                  type="button"
                  className="h-auto p-0 text-destructive"
                  onClick={handleClearIndustry}
                >
                  Clear selection
                </Button>
              </div>
            )}
            {industryDropdownOpen && !industryId && (
              <div
                className="absolute mt-1 w-full rounded-md border border-border bg-background shadow-md"
                style={{ zIndex: 10, maxHeight: 280, overflowY: "auto" }}
              >
                <div className="divide-y divide-border">
                  {industrySearchLoading && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      Searching...
                    </div>
                  )}
                  {!industrySearchLoading &&
                    industrySearchResults.length === 0 &&
                    industrySearch.trim() && (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No matches found.
                      </div>
                    )}
                  {!industrySearchLoading &&
                    industrySearchResults.map((ind) => (
                      <button
                        key={ind._id || ind.id}
                        type="button"
                        className="block w-full px-4 py-3 text-left hover:bg-muted"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectIndustry(ind);
                        }}
                      >
                        <div className="font-semibold">{ind.name}</div>
                        {ind.location && (
                          <div className="text-sm text-muted-foreground">
                            {ind.location}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto-filled company details (read-only once a company is selected) */}
          <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company name</Label>
              <Input
                value={companyInfo.name}
                readOnly={!!industryId}
                className={industryId ? "bg-muted" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("name", e.target.value)
                }
                placeholder={
                  industryId
                    ? "Auto-filled from selected client"
                    : "Company name"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={companyInfo.location}
                readOnly={!!industryId}
                className={industryId ? "bg-muted" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("location", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Location"
                }
              />
            </div>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Input
                value={formatArea(companyInfo.area) || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-muted" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("area", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Area"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={companyInfo.email || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-muted" : ""}
                onChange={(e) =>
                  !industryId && updateCompanyField("email", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Email"
                }
              />
            </div>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Purchase manager name</Label>
              <Input
                value={companyInfo.purchase_manager_name || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-muted" : ""}
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
            </div>
            <div className="space-y-1.5">
              <Label>Purchase manager phone</Label>
              <Input
                value={companyInfo.purchase_manager_phone || ""}
                readOnly={!!industryId}
                className={industryId ? "bg-muted" : ""}
                onChange={(e) =>
                  !industryId &&
                  updateCompanyField("purchase_manager_phone", e.target.value)
                }
                placeholder={
                  industryId ? "Auto-filled from selected client" : "Phone"
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea
              rows={2}
              value={companyInfo.address || ""}
              readOnly={!!industryId}
              className={industryId ? "bg-muted" : ""}
              onChange={(e) =>
                !industryId && updateCompanyField("address", e.target.value)
              }
              placeholder={
                industryId ? "Auto-filled from selected client" : "Address"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Product information */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>2. Product Information</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowFindProductModal(true)}
          >
            Find Product
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>
                {editingProductIndex != null ? "Edit product" : "Add product"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="space-y-1.5 md:col-span-6">
                  <Label>Product name</Label>
                  <Input
                    value={formProduct.productName}
                    onChange={(e) =>
                      updateFormProduct("productName", e.target.value)
                    }
                    placeholder="Product name"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formProduct.quantity}
                    onChange={(e) =>
                      updateFormProduct("quantity", Number(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label>Unit</Label>
                  <ProductUnitSelect
                    value={formProduct.unit}
                    onChange={(e) => updateFormProduct("unit", e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="space-y-1.5 md:col-span-4">
                  <Label>Quoted rate</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formProduct.quotedRate}
                    onChange={(e) =>
                      updateFormProduct("quotedRate", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end md:col-span-8">
                  <div className="font-semibold">
                    Line total:{" "}
                    {(() => {
                      const qty = Number(formProduct.quantity) || 0;
                      const rate = Number(formProduct.quotedRate) || 0;
                      return `₹${(qty * rate).toLocaleString()}`;
                    })()}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Variants (optional)</Label>
                  <Button size="sm" type="button" onClick={addVariant}>
                    Add variant
                  </Button>
                </div>
                {(formProduct.variants || []).length > 0 ? (
                  (formProduct.variants || []).map((v, idx) => (
                    <div
                      key={idx}
                      className="mb-2 grid grid-cols-1 items-end gap-4 md:grid-cols-12"
                    >
                      <div className="md:col-span-6">
                        <Input
                          value={v.variantName || ""}
                          onChange={(e) =>
                            updateVariant(idx, "variantName", e.target.value)
                          }
                          placeholder="Variant name"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
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
                      </div>
                      <div className="md:col-span-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeVariant(idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="mb-0 text-sm text-muted-foreground">
                    No variants. Click &quot;Add variant&quot; to add.
                  </p>
                )}
              </div>

              <div className="mb-3 space-y-1.5">
                <Label>Remark</Label>
                <Textarea
                  rows={2}
                  value={formProduct.remark}
                  onChange={(e) => updateFormProduct("remark", e.target.value)}
                  placeholder="Remark"
                />
              </div>

              <div className="flex gap-2">
                {editingProductIndex != null ? (
                  <>
                    <Button type="button" onClick={updateProductInList}>
                      Update product
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={clearProductForm}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={saveProduct}>
                    Add product
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div>
            <strong className="mb-2 block">Added products</strong>
            {products.length === 0 ? (
              <p className="mb-0 text-sm text-muted-foreground">
                No products added yet. Use the form above or Find Product to
                add.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product name</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Quoted rate</TableHead>
                      <TableHead>Line total</TableHead>
                      <TableHead>GST %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{p.productName || "–"}</TableCell>
                        <TableCell>{p.quantity ?? "–"}</TableCell>
                        <TableCell>{p.unit || "–"}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8"
                            style={{ maxWidth: "90px", minWidth: "70px" }}
                            min={0}
                            step="0.01"
                            value={p.quotedRate === "" ? "" : p.quotedRate}
                            onChange={(e) =>
                              handleRateChange(index, e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8"
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
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8"
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
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="mr-1"
                            onClick={() => editProductFromTable(index)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteProductFromTable(index)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </Select>
            </div>
            <div className="flex items-end justify-end">
              <div className="font-semibold">
                Total:{" "}
                <span className="text-lg">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex justify-end gap-2 p-6">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate("/quotations")}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveQuotation}>
            Generate Quotation
          </Button>
        </CardContent>
      </Card>

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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/quotations")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotations
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Quotation" : "Add Quotation"}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Related Query</Label>
              <Select {...register("queryId")}>
                <option value="">Select Query (Optional)</option>
                {queries?.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.subject} - {q.customerName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select {...register("status")}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Customer Name *</Label>
              <Input {...register("customerName")} />
              {errors.customerName && (
                <p className="text-sm text-destructive">
                  {errors.customerName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Customer Email *</Label>
              <Input type="email" {...register("customerEmail")} />
              {errors.customerEmail && (
                <p className="text-sm text-destructive">
                  {errors.customerEmail.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Total Amount *</Label>
              <Input type="number" {...register("totalAmount")} />
              {errors.totalAmount && (
                <p className="text-sm text-destructive">
                  {errors.totalAmount.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Valid Until</Label>
              <Input type="date" {...register("validUntil")} />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>Items / Description *</Label>
            <Textarea rows={4} {...register("items")} />
            {errors.items && (
              <p className="text-sm text-destructive">{errors.items.message}</p>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex justify-end gap-2 p-6">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate("/quotations")}
          >
            Cancel
          </Button>
          <Button type="submit">
            {isEdit ? "Update Quotation" : "Create Quotation"}
          </Button>
        </CardContent>
      </Card>
    </form>
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
