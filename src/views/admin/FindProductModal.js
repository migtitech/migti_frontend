import React, { useEffect, useState, useCallback } from "react";
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CFormCheck,
  CSpinner,
  CListGroup,
  CListGroupItem,
} from "@coreui/react";
import productService from "../../services/productService";
import categoryService from "../../services/categoryService";
import subcategoryService from "../../services/subcategoryService";
import { toastSuccess, toastError } from "../../utils/toast";

const getVariantComboDisplay = (combo) => {
  const parts = (combo?.optionValues || [])
    .map((o) => o?.variantValue || "")
    .filter(Boolean);
  return parts.join(", ");
};

// Flatten variant options from product.variants: [{ name, options }] -> [{ key, label }]
const getVariantOptions = (product) => {
  const list = [];
  (product?.variants || []).forEach((v) => {
    const name = v?.name || "";
    (v?.options || []).forEach((opt) => {
      if (opt) list.push({ key: `${name}::${opt}`, label: `${name}: ${opt}` });
    });
  });
  return list;
};

const matchesHsn = (val, hsnSearch) => {
  if (!hsnSearch?.trim()) return true;
  const v = (val || "").toString().trim();
  return (
    v &&
    new RegExp(
      hsnSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    ).test(v)
  );
};

const matchesModel = (val, modelSearch) => {
  if (!modelSearch?.trim()) return true;
  const v = (val || "").toString().trim();
  return (
    v &&
    new RegExp(
      modelSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    ).test(v)
  );
};

// Filter variant combos by HSN and/or Model number
const filterVariantCombos = (product, hsnSearch, modelSearch) => {
  const combos = product?.variantCombinations || [];
  if (!hsnSearch?.trim() && !modelSearch?.trim()) return combos;
  return combos.filter((c) => {
    const hsn = c?.hsnNumber ?? product?.hsnNumber ?? "";
    const model = c?.modelNumber ?? product?.defaultModelNumber ?? "";
    const hsnOk = matchesHsn(hsn, hsnSearch);
    const modelOk = matchesModel(model, modelSearch);
    return hsnOk && modelOk;
  });
};

const FindProductModal = ({ visible, onClose, onImport }) => {
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categoryResults, setCategoryResults] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subcategoryDropdownOpen, setSubcategoryDropdownOpen] = useState(false);
  const [subcategoryResults, setSubcategoryResults] = useState([]);
  const [subcategoryLoading, setSubcategoryLoading] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productResults, setProductResults] = useState([]);
  const [productLoading, setProductLoading] = useState(false);

  const [hsnNumber, setHsnNumber] = useState("");
  const [modelNumber, setModelNumber] = useState("");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // For products with variant combos: Map<productId, Set<variantComboUniqueId>>
  const [selectedVariantCombos, setSelectedVariantCombos] = useState(new Map());
  // For products with variants (no combos): Map<productId, Set<variantOptionKey>>
  const [selectedVariantOptions, setSelectedVariantOptions] = useState(
    new Map(),
  );

  // Category – default 5 when dropdown open, best 5 matches when searching
  const fetchCategoryOptions = useCallback(async (term, isOpen) => {
    if (!isOpen) {
      setCategoryResults([]);
      return;
    }
    setCategoryLoading(true);
    try {
      const params = { parent: "null", pageSize: 5 };
      if (term?.trim()) params.search = term.trim();
      const res = await categoryService.getAll(params);
      const data = res?.data || res;
      setCategoryResults(data?.categories || []);
    } catch {
      setCategoryResults([]);
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => fetchCategoryOptions(categorySearch, categoryDropdownOpen),
      categoryDropdownOpen && !categorySearch?.trim() ? 0 : 300,
    );
    return () => clearTimeout(t);
  }, [categorySearch, categoryDropdownOpen, fetchCategoryOptions]);

  const handleSelectCategory = (cat) => {
    const cid = cat._id || cat.id;
    setCategoryId(cid);
    setCategorySearch(cat.name || "");
    setCategoryDropdownOpen(false);
    setSubcategoryId("");
    setSubcategorySearch("");
    setSubcategoryResults([]);
  };

  const handleClearCategory = () => {
    setCategoryId("");
    setCategorySearch("");
    setSubcategoryId("");
    setSubcategorySearch("");
    setSubcategoryResults([]);
  };

  // Subcategory – default 5 when dropdown open, best 5 matches when searching
  const fetchSubcategoryOptions = useCallback(async (term, catId, isOpen) => {
    if (!catId || !isOpen) {
      setSubcategoryResults([]);
      return;
    }
    setSubcategoryLoading(true);
    try {
      const params = { category: catId };
      const res = await subcategoryService.getAllSubcategories(params);
      const data = res?.data || res;
      const inner = data?.data ?? data;
      let results = inner?.subcategories || [];
      if (term?.trim()) {
        const q = term.trim().toLowerCase();
        results = results.filter((s) =>
          (s.name || "").toLowerCase().includes(q),
        );
      }
      setSubcategoryResults(results.slice(0, 5));
    } catch {
      setSubcategoryResults([]);
    } finally {
      setSubcategoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () =>
        fetchSubcategoryOptions(
          subcategorySearch,
          categoryId,
          subcategoryDropdownOpen,
        ),
      subcategoryDropdownOpen && !subcategorySearch?.trim() ? 0 : 300,
    );
    return () => clearTimeout(t);
  }, [
    subcategorySearch,
    categoryId,
    subcategoryDropdownOpen,
    fetchSubcategoryOptions,
  ]);

  const handleSelectSubcategory = (sub) => {
    const sid = sub._id || sub.id;
    setSubcategoryId(sid);
    setSubcategorySearch(sub.name || "");
    setSubcategoryDropdownOpen(false);
  };

  const handleClearSubcategory = () => {
    setSubcategoryId("");
    setSubcategorySearch("");
  };

  // Product – default 5 when dropdown open, best 5 matches when searching
  const fetchProductOptions = useCallback(
    async (term, isOpen) => {
      if (!isOpen) {
        setProductResults([]);
        return;
      }
      setProductLoading(true);
      try {
        const params = { pageSize: 5 };
        if (term?.trim()) params.search = term.trim();
        if (categoryId) params.category = categoryId;
        if (subcategoryId) params.subcategory = subcategoryId;
        if (hsnNumber?.trim()) params.hsnNumber = hsnNumber.trim();
        if (modelNumber?.trim()) params.modelNumber = modelNumber.trim();
        const res = await productService.getAll(params);
        const data = res?.data || res;
        setProductResults(data?.products || []);
      } catch {
        setProductResults([]);
      } finally {
        setProductLoading(false);
      }
    },
    [categoryId, subcategoryId, hsnNumber, modelNumber],
  );

  useEffect(() => {
    const t = setTimeout(
      () => fetchProductOptions(productSearch, productDropdownOpen),
      productDropdownOpen && !productSearch?.trim() ? 0 : 300,
    );
    return () => clearTimeout(t);
  }, [productSearch, productDropdownOpen, fetchProductOptions]);

  const handleSelectProduct = (prod) => {
    const pid = prod._id || prod.id;
    setProductSearch("");
    setProductDropdownOpen(false);
    setProductResults([]);
    setProducts((prev) => {
      if (prev.some((p) => (p._id || p.id) === pid)) return prev;
      return [...prev, prod];
    });
  };

  const searchProducts = useCallback(async () => {
    setLoading(true);
    setProducts([]);
    setSelectedIds(new Set());
    setSelectedVariantCombos(new Map());
    setSelectedVariantOptions(new Map());
    try {
      const params = { pageSize: 100 };
      if (productSearch?.trim()) {
        params.search = productSearch.trim();
      }
      if (categoryId) params.category = categoryId;
      if (subcategoryId) params.subcategory = subcategoryId;
      if (hsnNumber?.trim()) params.hsnNumber = hsnNumber.trim();
      if (modelNumber?.trim()) params.modelNumber = modelNumber.trim();

      const res = await productService.getAll(params);
      const data = res?.data || res;
      const list = data?.products || [];
      setProducts(list);
      if (list.length === 0) {
        toastError("No products found. Try different filters or search.");
      }
    } catch (err) {
      toastError(err?.message || "Failed to search products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, subcategoryId, productSearch, hsnNumber, modelNumber]);

  const handleSearch = (e) => {
    e?.preventDefault();
    if (
      !productSearch?.trim() &&
      !categoryId &&
      !hsnNumber?.trim() &&
      !modelNumber?.trim()
    ) {
      toastError(
        "Select category, enter product search, HSN or Model number to find products",
      );
      return;
    }
    searchProducts();
  };

  const toggleSelect = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleVariantCombo = (productId, comboUniqueId) => {
    setSelectedVariantCombos((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(productId) || []);
      if (set.has(comboUniqueId)) set.delete(comboUniqueId);
      else set.add(comboUniqueId);
      if (set.size) next.set(productId, set);
      else next.delete(productId);
      return next;
    });
  };

  const toggleVariantOption = (productId, optionKey) => {
    setSelectedVariantOptions((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(productId) || []);
      if (set.has(optionKey)) set.delete(optionKey);
      else set.add(optionKey);
      if (set.size) next.set(productId, set);
      else next.delete(productId);
      return next;
    });
  };

  const toggleAllVariantOptions = (productId, options) => {
    const keys = (options || []).map((o) => o.key).filter(Boolean);
    if (!keys.length) return;
    setSelectedVariantOptions((prev) => {
      const next = new Map(prev);
      const current = next.get(productId);
      const allSelected = keys.every((k) => current?.has(k));
      if (allSelected) next.delete(productId);
      else next.set(productId, new Set(keys));
      return next;
    });
  };

  const toggleAllVariantCombos = (productId, combos) => {
    const uids = (combos || []).map((c) => c._id).filter(Boolean);
    if (!uids.length) return;
    setSelectedVariantCombos((prev) => {
      const next = new Map(prev);
      const current = next.get(productId);
      const allSelected = uids.every((uid) => current?.has(uid));
      if (allSelected) next.delete(productId);
      else next.set(productId, new Set(uids));
      return next;
    });
  };

  const toggleSelectAll = () => {
    const productsWithoutVariants = products.filter((p) => {
      const hasCombos = p?.hasVariants && p?.variantCombinations?.length > 0;
      const combosFiltered = hasCombos
        ? filterVariantCombos(p, hsnNumber, modelNumber)
        : [];
      const showCombos = hasCombos && combosFiltered.length > 0;
      const variantOpts = getVariantOptions(p);
      const productMatchesHsnModel =
        matchesHsn(p?.hsnNumber, hsnNumber) &&
        matchesModel(p?.defaultModelNumber, modelNumber);
      const hasVariantOpts = variantOpts.length > 0 && productMatchesHsnModel;
      const isSimpleProduct = !showCombos && !hasVariantOpts;
      return isSimpleProduct && productMatchesHsnModel;
    });
    const productIds = productsWithoutVariants.map((p) => p._id || p.id);
    setSelectedIds((prev) => {
      const allSelected = productIds.every((id) => prev.has(id));
      if (allSelected)
        return new Set([...prev].filter((id) => !productIds.includes(id)));
      return new Set([...prev, ...productIds]);
    });
  };

  const hasAnySelection = () => {
    if (selectedIds.size > 0) return true;
    if (selectedVariantCombos.size > 0) return true;
    if (selectedVariantOptions.size > 0) return true;
    return false;
  };

  const getSelectedCount = () => {
    let count = selectedIds.size;
    selectedVariantCombos.forEach((set) => {
      count += set.size;
    });
    selectedVariantOptions.forEach((set) => {
      count += set.size;
    });
    return count;
  };

  const handleImport = () => {
    if (!hasAnySelection()) {
      toastError("Select at least one product or variant to import");
      return;
    }

    // Build query product(s) - we fill form with first/combined selection
    const queryProducts = [];

    // Products without variants (whole product selected)
    const selectedWhole = products.filter((p) =>
      selectedIds.has(p._id || p.id),
    );
    const toImageRefs = (imgs) =>
      (imgs || [])
        .map((img) => (typeof img === "object" && img?._id ? img : img))
        .filter(Boolean);

    selectedWhole.forEach((p) => {
      const pid = p._id || p.id;
      queryProducts.push({
        productName: p?.name || "",
        quantity: 1,
        unit: (p?.unit && String(p.unit).trim()) || "PCS",
        hsnNumber: p?.hsnNumber || "",
        modelNumber: p?.defaultModelNumber || "",
        gstPercentage:
          typeof p?.gstPercentage === "number" ? p.gstPercentage : null,
        variants: [],
        remark: "",
        product_id: pid,
        images: toImageRefs(p?.images),
      });
    });

    // Products with variant combinations (selected combos)
    products.forEach((p) => {
      const pid = p._id || p.id;
      const comboIds = selectedVariantCombos.get(pid);
      if (!comboIds?.size || !p?.variantCombinations?.length) return;

      const selectedCombos = p.variantCombinations.filter((c) =>
        comboIds.has(c._id),
      );
      if (selectedCombos.length === 0) return;

      selectedCombos.forEach((combo) => {
        queryProducts.push({
          productName: p?.name || "",
          quantity: 1,
          unit: (p?.unit && String(p.unit).trim()) || "PCS",
          hsnNumber: combo?.hsnNumber || p?.hsnNumber || "",
          modelNumber: combo?.modelNumber || p?.defaultModelNumber || "",
          gstPercentage:
            typeof combo?.gstPercentage === "number"
              ? combo.gstPercentage
              : typeof p?.gstPercentage === "number"
                ? p.gstPercentage
                : null,
          variants: [{ variantName: getVariantComboDisplay(combo) }],
          remark: "",
          rawProductCode: combo?.variantCode || p?.productCode || "",
          product_id: pid,
          images: toImageRefs(combo?.images?.length ? combo.images : p?.images),
        });
      });
    });

    // Products with variant options (selected options)
    products.forEach((p) => {
      const pid = p._id || p.id;
      const optionKeys = selectedVariantOptions.get(pid);
      const variantOpts = getVariantOptions(p);
      if (!optionKeys?.size || !variantOpts.length) return;

      const variants = variantOpts
        .filter((o) => optionKeys.has(o.key))
        .map((o) => ({ variantName: o.label }));
      if (variants.length === 0) return;

      queryProducts.push({
        productName: p?.name || "",
        quantity: 1,
        unit: (p?.unit && String(p.unit).trim()) || "PCS",
        hsnNumber: p?.hsnNumber || "",
        modelNumber: p?.defaultModelNumber || "",
        gstPercentage:
          typeof p?.gstPercentage === "number" ? p.gstPercentage : null,
        variants,
        remark: "",
        product_id: pid,
        images: toImageRefs(p?.images),
      });
    });

    // Pass to parent to FILL the form (not add directly)
    onImport(queryProducts);
    toastSuccess("Product section filled. Review and click Save to add.");
    onClose();
  };

  const handleClose = () => {
    setCategorySearch("");
    setCategoryId("");
    setSubcategorySearch("");
    setSubcategoryId("");
    setProductSearch("");
    setHsnNumber("");
    setModelNumber("");
    setProducts([]);
    setSelectedIds(new Set());
    setSelectedVariantCombos(new Map());
    setSelectedVariantOptions(new Map());
    setCategoryResults([]);
    setSubcategoryResults([]);
    setProductResults([]);
    onClose();
  };

  return (
    <CModal visible={visible} onClose={handleClose} size="xl" scrollable>
      <CModalHeader>
        <CModalTitle>Find Product</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm onSubmit={handleSearch} className="mb-4">
          <CRow className="g-3 mb-3">
            <CCol md={4}>
              <div className="position-relative">
                <CFormLabel>Category</CFormLabel>
                <CFormInput
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  onFocus={() => setCategoryDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setCategoryDropdownOpen(false), 200)
                  }
                  placeholder="Type to search category..."
                  autoComplete="off"
                />
                {categoryId && (
                  <CButton
                    color="link"
                    size="sm"
                    className="p-0 mt-1"
                    onClick={handleClearCategory}
                  >
                    Clear
                  </CButton>
                )}
                {categoryDropdownOpen &&
                  (categoryResults?.length > 0 || categoryLoading) && (
                    <div
                      className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                      style={{
                        zIndex: 1050,
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
                      <CListGroup flush>
                        {categoryLoading && (
                          <CListGroupItem className="text-muted">
                            Searching...
                          </CListGroupItem>
                        )}
                        {!categoryLoading &&
                          categoryResults.map((c) => (
                            <CListGroupItem
                              key={c._id || c.id}
                              component="button"
                              type="button"
                              className="text-start"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectCategory(c);
                              }}
                            >
                              {c.name}
                            </CListGroupItem>
                          ))}
                      </CListGroup>
                    </div>
                  )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="position-relative">
                <CFormLabel>Subcategory</CFormLabel>
                <CFormInput
                  type="text"
                  value={subcategorySearch}
                  onChange={(e) => setSubcategorySearch(e.target.value)}
                  onFocus={() => categoryId && setSubcategoryDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setSubcategoryDropdownOpen(false), 200)
                  }
                  placeholder={
                    categoryId
                      ? "Type to search subcategory..."
                      : "Select category first"
                  }
                  autoComplete="off"
                  disabled={!categoryId}
                />
                {subcategoryId && (
                  <CButton
                    color="link"
                    size="sm"
                    className="p-0 mt-1"
                    onClick={handleClearSubcategory}
                  >
                    Clear
                  </CButton>
                )}
                {subcategoryDropdownOpen &&
                  categoryId &&
                  (subcategoryResults?.length > 0 || subcategoryLoading) && (
                    <div
                      className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                      style={{
                        zIndex: 1050,
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
                      <CListGroup flush>
                        {subcategoryLoading && (
                          <CListGroupItem className="text-muted">
                            Searching...
                          </CListGroupItem>
                        )}
                        {!subcategoryLoading &&
                          subcategoryResults.map((s) => (
                            <CListGroupItem
                              key={s._id || s.id}
                              component="button"
                              type="button"
                              className="text-start"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSubcategory(s);
                              }}
                            >
                              {s.name}
                            </CListGroupItem>
                          ))}
                      </CListGroup>
                    </div>
                  )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="position-relative">
                <CFormLabel>Product (search)</CFormLabel>
                <CFormInput
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => setProductDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setProductDropdownOpen(false), 200)
                  }
                  placeholder="Type to search product..."
                  autoComplete="off"
                />
                {productDropdownOpen &&
                  (productResults?.length > 0 || productLoading) && (
                    <div
                      className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                      style={{
                        zIndex: 1050,
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
                      <CListGroup flush>
                        {productLoading && (
                          <CListGroupItem className="text-muted">
                            Searching...
                          </CListGroupItem>
                        )}
                        {!productLoading &&
                          productResults.map((p) => (
                            <CListGroupItem
                              key={p._id || p.id}
                              component="button"
                              type="button"
                              className="text-start"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectProduct(p);
                              }}
                            >
                              <div className="fw-semibold">{p.name}</div>
                              {p.sku && (
                                <div className="text-muted small">
                                  SKU: {p.sku}
                                </div>
                              )}
                            </CListGroupItem>
                          ))}
                      </CListGroup>
                    </div>
                  )}
              </div>
            </CCol>
          </CRow>
          <CRow className="g-3 mb-3">
            <CCol md={4}>
              <CFormLabel>HSN Number</CFormLabel>
              <CFormInput
                type="text"
                value={hsnNumber}
                onChange={(e) => setHsnNumber(e.target.value)}
                placeholder="Filter by HSN number"
                autoComplete="off"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Model Number</CFormLabel>
              <CFormInput
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="Filter by model number"
                autoComplete="off"
              />
            </CCol>
          </CRow>
          <CButton type="submit" color="primary" disabled={loading}>
            {loading ? <CSpinner size="sm" className="me-2" /> : null}
            Search Products
          </CButton>
        </CForm>

        {products.length > 0 && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>
                {products.length} product(s) — check the items you want, then
                click Import to fill form
              </strong>
              <CFormCheck
                type="checkbox"
                id="selectAll"
                label="Select all (products without variants)"
                checked={(() => {
                  const withoutVariants = products.filter((p) => {
                    const hasCombos =
                      p?.hasVariants && p?.variantCombinations?.length > 0;
                    const combosFiltered = hasCombos
                      ? filterVariantCombos(p, hsnNumber, modelNumber)
                      : [];
                    const showCombos = hasCombos && combosFiltered.length > 0;
                    const variantOpts = getVariantOptions(p);
                    const productMatchesHsnModel =
                      matchesHsn(p?.hsnNumber, hsnNumber) &&
                      matchesModel(p?.defaultModelNumber, modelNumber);
                    const hasVariantOpts =
                      variantOpts.length > 0 && productMatchesHsnModel;
                    const isSimpleProduct = !showCombos && !hasVariantOpts;
                    return isSimpleProduct && productMatchesHsnModel;
                  });
                  const ids = withoutVariants.map((p) => p._id || p.id);
                  return (
                    ids.length > 0 && ids.every((id) => selectedIds.has(id))
                  );
                })()}
                onChange={toggleSelectAll}
              />
            </div>
            <div
              className="table-responsive"
              style={{ maxHeight: 400, overflowY: "auto" }}
            >
              {products.map((p) => {
                const pid = p._id || p.id;
                const combosFiltered = filterVariantCombos(
                  p,
                  hsnNumber,
                  modelNumber,
                );
                const hasCombos =
                  p?.hasVariants && p?.variantCombinations?.length > 0;
                const showCombos = hasCombos && combosFiltered.length > 0;

                const variantOpts = getVariantOptions(p);
                const productMatchesHsnModel =
                  matchesHsn(p?.hsnNumber, hsnNumber) &&
                  matchesModel(p?.defaultModelNumber, modelNumber);
                const hasVariantOpts =
                  variantOpts.length > 0 && productMatchesHsnModel;

                if (showCombos) {
                  const comboSet = selectedVariantCombos.get(pid) || new Set();
                  const allComboIds = combosFiltered
                    .map((c) => c._id)
                    .filter(Boolean);
                  const allSelected =
                    allComboIds.length > 0 &&
                    allComboIds.every((uid) => comboSet.has(uid));

                  return (
                    <CCard key={pid} className="mb-3">
                      <CCardHeader className="py-2 d-flex justify-content-between align-items-center">
                        <strong>{p.name || "–"}</strong>
                        <span className="text-muted small">
                          {p.sku && `SKU: ${p.sku}`} • {p.unit || "PCS"}
                        </span>
                      </CCardHeader>
                      <CCardBody className="py-2">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <CFormLabel className="mb-0">
                            Variant combinations — select to import
                          </CFormLabel>
                          <CFormCheck
                            type="checkbox"
                            label="Select all"
                            checked={allSelected}
                            onChange={() =>
                              toggleAllVariantCombos(pid, combosFiltered)
                            }
                          />
                        </div>
                        <CTable size="sm" hover>
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell
                                style={{ width: 44 }}
                              ></CTableHeaderCell>
                              <CTableHeaderCell>Variant</CTableHeaderCell>
                              <CTableHeaderCell>HSN</CTableHeaderCell>
                              <CTableHeaderCell>Model</CTableHeaderCell>
                              <CTableHeaderCell>Code</CTableHeaderCell>
                              <CTableHeaderCell>Qty</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {combosFiltered.map((c) => {
                              const uid = c._id;
                              const checked = comboSet.has(uid);
                              return (
                                <CTableRow key={uid}>
                                  <CTableDataCell>
                                    <CFormCheck
                                      checked={checked}
                                      onChange={() =>
                                        toggleVariantCombo(pid, uid)
                                      }
                                    />
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {getVariantComboDisplay(c)}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {(c.hsnNumber ?? p.hsnNumber) || "–"}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {(c.modelNumber ?? p.defaultModelNumber) ||
                                      "–"}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {c.variantCode || "–"}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {c.quantity ?? c.price ?? "–"}
                                  </CTableDataCell>
                                </CTableRow>
                              );
                            })}
                          </CTableBody>
                        </CTable>
                      </CCardBody>
                    </CCard>
                  );
                }

                if (hasVariantOpts) {
                  const optionSet =
                    selectedVariantOptions.get(pid) || new Set();
                  const allKeys = variantOpts.map((o) => o.key);
                  const allSelected =
                    allKeys.length > 0 &&
                    allKeys.every((k) => optionSet.has(k));

                  return (
                    <CCard key={pid} className="mb-3">
                      <CCardHeader className="py-2 d-flex justify-content-between align-items-center">
                        <strong>{p.name || "–"}</strong>
                        <span className="text-muted small">
                          {p.sku && `SKU: ${p.sku}`} • {p.unit || "PCS"}
                        </span>
                      </CCardHeader>
                      <CCardBody className="py-2">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <CFormLabel className="mb-0">
                            Variants — select to import
                          </CFormLabel>
                          <CFormCheck
                            type="checkbox"
                            label="Select all"
                            checked={allSelected}
                            onChange={() =>
                              toggleAllVariantOptions(pid, variantOpts)
                            }
                          />
                        </div>
                        <CTable size="sm" hover>
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell
                                style={{ width: 44 }}
                              ></CTableHeaderCell>
                              <CTableHeaderCell>Variant</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {variantOpts.map((o) => {
                              const checked = optionSet.has(o.key);
                              return (
                                <CTableRow key={o.key}>
                                  <CTableDataCell>
                                    <CFormCheck
                                      checked={checked}
                                      onChange={() =>
                                        toggleVariantOption(pid, o.key)
                                      }
                                    />
                                  </CTableDataCell>
                                  <CTableDataCell>{o.label}</CTableDataCell>
                                </CTableRow>
                              );
                            })}
                          </CTableBody>
                        </CTable>
                      </CCardBody>
                    </CCard>
                  );
                }

                return null;
              })}
              {products.some((p) => {
                const hasCombos =
                  p?.hasVariants && p?.variantCombinations?.length > 0;
                const combosFiltered = hasCombos
                  ? filterVariantCombos(p, hsnNumber, modelNumber)
                  : [];
                const showCombos = hasCombos && combosFiltered.length > 0;
                const variantOpts = getVariantOptions(p);
                const productMatchesHsnModel =
                  matchesHsn(p?.hsnNumber, hsnNumber) &&
                  matchesModel(p?.defaultModelNumber, modelNumber);
                const hasVariantOpts =
                  variantOpts.length > 0 && productMatchesHsnModel;
                const isSimpleProduct = !showCombos && !hasVariantOpts;
                return isSimpleProduct && productMatchesHsnModel;
              }) && (
                <CTable hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell
                        style={{ width: 44 }}
                      ></CTableHeaderCell>
                      <CTableHeaderCell>Product</CTableHeaderCell>
                      <CTableHeaderCell>SKU</CTableHeaderCell>
                      <CTableHeaderCell>Category</CTableHeaderCell>
                      <CTableHeaderCell>Unit</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {products
                      .filter((p) => {
                        const hasCombos =
                          p?.hasVariants && p?.variantCombinations?.length > 0;
                        const combosFiltered = hasCombos
                          ? filterVariantCombos(p, hsnNumber, modelNumber)
                          : [];
                        const showCombos =
                          hasCombos && combosFiltered.length > 0;
                        const variantOpts = getVariantOptions(p);
                        const productMatchesHsnModel =
                          matchesHsn(p?.hsnNumber, hsnNumber) &&
                          matchesModel(p?.defaultModelNumber, modelNumber);
                        const hasVariantOpts =
                          variantOpts.length > 0 && productMatchesHsnModel;
                        const isSimpleProduct = !showCombos && !hasVariantOpts;
                        return isSimpleProduct && productMatchesHsnModel;
                      })
                      .map((p) => {
                        const pid = p._id || p.id;
                        const checked = selectedIds.has(pid);
                        return (
                          <CTableRow key={pid}>
                            <CTableDataCell>
                              <CFormCheck
                                checked={checked}
                                onChange={() => toggleSelect(pid)}
                              />
                            </CTableDataCell>
                            <CTableDataCell>{p.name || "–"}</CTableDataCell>
                            <CTableDataCell>{p.sku || "–"}</CTableDataCell>
                            <CTableDataCell>
                              {p.category?.name || p.subcategory?.name || "–"}
                            </CTableDataCell>
                            <CTableDataCell>{p.unit || "PCS"}</CTableDataCell>
                          </CTableRow>
                        );
                      })}
                  </CTableBody>
                </CTable>
              )}
            </div>
          </>
        )}

        {!loading &&
          products.length === 0 &&
          (productSearch || categoryId || hsnNumber || modelNumber) && (
            <p className="text-muted mb-0">
              No products found. Try a different search or filters.
            </p>
          )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={handleClose}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleImport}
          disabled={!hasAnySelection()}
        >
          Fill Form ({getSelectedCount()})
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default FindProductModal;
