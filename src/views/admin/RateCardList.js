import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Save, Trash2, Plus, X } from "lucide-react";
import rateCardService from "../../services/rateCardService";
import productService from "../../services/productService";
import { Loader, ConfirmDialog, PageHeader } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";

const RateCardList = () => {
  const [activeTab, setActiveTab] = useState("product");

  // --- Search by Product state ---
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSuppliers, setProductSuppliers] = useState([]);
  const [productInfo, setProductInfo] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [combinationIdsWithRates, setCombinationIdsWithRates] = useState([]);
  const [selectedProductCombination, setSelectedProductCombination] =
    useState(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // --- Search by Supplier state ---
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierResults, setSupplierResults] = useState([]);
  const [supplierSearching, setSupplierSearching] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [supplierInfo, setSupplierInfo] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // --- Rate editing state ---
  const [editingRates, setEditingRates] = useState({});
  const [savingRate, setSavingRate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
    context: null,
    isRateCombination: false,
  });

  // --- Add Rate tab state ---
  const [addProductSearch, setAddProductSearch] = useState("");
  const [addProductResults, setAddProductResults] = useState([]);
  const [addProductSearching, setAddProductSearching] = useState(false);
  const [addSelectedProduct, setAddSelectedProduct] = useState(null);
  const [showAddProductDropdown, setShowAddProductDropdown] = useState(false);

  const [addSupplierSearch, setAddSupplierSearch] = useState("");
  const [addSupplierResults, setAddSupplierResults] = useState([]);
  const [addSupplierSearching, setAddSupplierSearching] = useState(false);
  const [addSelectedSupplier, setAddSelectedSupplier] = useState(null);
  const [showAddSupplierDropdown, setShowAddSupplierDropdown] = useState(false);

  const [addRate, setAddRate] = useState("");
  const [addingRate, setAddingRate] = useState(false);
  const [addProductDetail, setAddProductDetail] = useState(null);
  const [addSelectedCombination, setAddSelectedCombination] = useState(null);
  const [addCombinationSearch, setAddCombinationSearch] = useState("");
  const [loadingProductDetail, setLoadingProductDetail] = useState(false);
  const [addNextDueDate, setAddNextDueDate] = useState("");
  const [addNextDueDateMin, setAddNextDueDateMin] = useState("");

  const productDropdownRef = useRef(null);
  const supplierDropdownRef = useRef(null);
  const addProductDropdownRef = useRef(null);
  const addSupplierDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(e.target)
      ) {
        setShowProductDropdown(false);
      }
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(e.target)
      ) {
        setShowSupplierDropdown(false);
      }
      if (
        addProductDropdownRef.current &&
        !addProductDropdownRef.current.contains(e.target)
      ) {
        setShowAddProductDropdown(false);
      }
      if (
        addSupplierDropdownRef.current &&
        !addSupplierDropdownRef.current.contains(e.target)
      ) {
        setShowAddSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize default next due date (today + 3 months) and min date (today)
  useEffect(() => {
    const today = new Date();
    const toInputDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const minDate = toInputDate(today);
    const defaultDate = new Date(today);
    defaultDate.setMonth(defaultDate.getMonth() + 3);

    setAddNextDueDateMin(minDate);
    setAddNextDueDate(toInputDate(defaultDate));
  }, []);

  // --- Product search ---
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setProductSearching(true);
      try {
        const res = await rateCardService.searchProducts({
          search: productSearch,
          limit: 10,
        });
        const data = res?.data || res;
        setProductResults(data?.products || []);
        setShowProductDropdown(true);
      } catch {
        setProductResults([]);
      } finally {
        setProductSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // --- Supplier search ---
  useEffect(() => {
    if (!supplierSearch.trim()) {
      setSupplierResults([]);
      setShowSupplierDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSupplierSearching(true);
      try {
        const res = await rateCardService.searchSuppliers({
          search: supplierSearch,
          limit: 10,
        });
        const data = res?.data || res;
        setSupplierResults(data?.suppliers || []);
        setShowSupplierDropdown(true);
      } catch {
        setSupplierResults([]);
      } finally {
        setSupplierSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  // --- Add Rate tab: product search ---
  useEffect(() => {
    if (!addProductSearch.trim()) {
      setAddProductResults([]);
      setShowAddProductDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setAddProductSearching(true);
      try {
        const res = await rateCardService.searchProducts({
          search: addProductSearch,
          limit: 10,
        });
        const data = res?.data || res;
        setAddProductResults(data?.products || []);
        setShowAddProductDropdown(true);
      } catch {
        setAddProductResults([]);
      } finally {
        setAddProductSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [addProductSearch]);

  // --- Add Rate tab: supplier search ---
  useEffect(() => {
    if (!addSupplierSearch.trim()) {
      setAddSupplierResults([]);
      setShowAddSupplierDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setAddSupplierSearching(true);
      try {
        const res = await rateCardService.searchSuppliers({
          search: addSupplierSearch,
          limit: 10,
        });
        const data = res?.data || res;
        setAddSupplierResults(data?.suppliers || []);
        setShowAddSupplierDropdown(true);
      } catch {
        setAddSupplierResults([]);
      } finally {
        setAddSupplierSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [addSupplierSearch]);

  const getVariantComboDisplay = (combo) => {
    const parts = (combo?.optionValues || [])
      .map((o) => o?.variantValue || "")
      .filter(Boolean);
    return parts.join(", ");
  };

  const handleAddProductSelect = async (p) => {
    setAddSelectedProduct(p);
    setAddProductSearch(p.name);
    setShowAddProductDropdown(false);
    setAddSelectedCombination(null);
    setLoadingProductDetail(true);
    try {
      const res = await productService.getById(p._id);
      const product = res?.data ?? res;
      setAddProductDetail(product);
    } catch {
      setAddProductDetail(null);
    } finally {
      setLoadingProductDetail(false);
    }
  };

  const handleClearAddProduct = () => {
    setAddSelectedProduct(null);
    setAddProductSearch("");
    setAddProductDetail(null);
    setAddSelectedCombination(null);
    setAddCombinationSearch("");
  };

  const handleClearAddSupplier = () => {
    setAddSelectedSupplier(null);
    setAddSupplierSearch("");
  };

  // --- Add Rate tab: submit handler ---
  const handleAddRate = async () => {
    if (!addSelectedProduct) {
      toastError("Please select a product");
      return;
    }
    if (!addSelectedSupplier) {
      toastError("Please select a supplier");
      return;
    }
    if (
      addProductDetail &&
      addProductDetail?.hasVariants &&
      addProductDetail?.variantCombinations?.length > 0
    ) {
      if (!addSelectedCombination) {
        toastError("Please select a combination");
        return;
      }
    }
    if (!addRate || isNaN(Number(addRate)) || Number(addRate) < 0) {
      toastError("Please enter a valid rate");
      return;
    }
    if (!addNextDueDate) {
      toastError("Please select next due date");
      return;
    }
    const selectedDate = new Date(addNextDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toastError("Next due date cannot be in the past");
      return;
    }
    setAddingRate(true);
    try {
      const payload = {
        productId: addSelectedProduct._id,
        supplierId: addSelectedSupplier._id,
        rate: Number(addRate),
        nextDueDate: selectedDate.toISOString(),
      };
      if (addSelectedCombination && addSelectedCombination !== "base") {
        payload.variantCombinationId = addSelectedCombination;
      }
      await rateCardService.upsertRate(payload);
      toastSuccess("Rate added successfully");
      // Do NOT reset product and supplier - only clear rate for next entry
      setAddRate("");
    } catch (err) {
      toastError(err?.message || "Failed to add rate");
    } finally {
      setAddingRate(false);
    }
  };

  const fetchProductSuppliers = useCallback(
    async (productId, combinationUniqueId = null) => {
      const res = await rateCardService.getByProduct(
        productId,
        combinationUniqueId,
      );
      const data = res?.data || res;
      setProductInfo(data?.product || null);
      setProductSuppliers(data?.rates || []);
      if (Array.isArray(data?.variantCombinationIdsWithRates)) {
        setCombinationIdsWithRates(data.variantCombinationIdsWithRates);
      }
    },
    [],
  );

  // --- Select product & load suppliers ---
  const handleSelectProduct = useCallback(
    async (product) => {
      setSelectedProduct(product);
      setProductSearch(product.name);
      setShowProductDropdown(false);
      setSelectedProductCombination(null);
      setLoadingSuppliers(true);
      setEditingRates({});
      try {
        let fullProduct = null;
        try {
          const pres = await productService.getById(product._id);
          fullProduct = pres?.data ?? pres;
          setProductDetail(fullProduct);
        } catch {
          setProductDetail(null);
        }
        await fetchProductSuppliers(product._id);
      } catch (err) {
        toastError(err?.message || "Failed to load suppliers");
      } finally {
        setLoadingSuppliers(false);
      }
    },
    [fetchProductSuppliers],
  );

  const handleSelectProductCombination = useCallback(
    async (comboId) => {
      setSelectedProductCombination(comboId);
      if (!selectedProduct?._id) return;
      setLoadingSuppliers(true);
      try {
        await fetchProductSuppliers(
          selectedProduct._id,
          comboId === "base" ? null : comboId,
        );
      } catch (err) {
        toastError(err?.message || "Failed to load suppliers");
      } finally {
        setLoadingSuppliers(false);
      }
    },
    [selectedProduct, fetchProductSuppliers],
  );

  // --- Select supplier & load products ---
  const handleSelectSupplier = useCallback(async (supplier) => {
    setSelectedSupplier(supplier);
    setSupplierSearch(supplier.name);
    setShowSupplierDropdown(false);
    setLoadingProducts(true);
    setEditingRates({});
    try {
      const res = await rateCardService.getBySupplier(supplier._id);
      const data = res?.data || res;
      setSupplierInfo(data?.supplier || supplier);
      setSupplierProducts(data?.rates || []);
    } catch (err) {
      toastError(err?.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // --- Save rate ---
  const handleSaveRate = async (
    productId,
    supplierId,
    rate,
    combinationUniqueId = null,
  ) => {
    if (rate === "" || rate === undefined || isNaN(Number(rate))) {
      toastError("Please enter a valid rate");
      return;
    }
    const key = combinationUniqueId
      ? `${productId}_${supplierId}_${combinationUniqueId}`
      : `${productId}_${supplierId}`;
    setSavingRate(key);
    try {
      const payload = { productId, supplierId, rate: Number(rate) };
      if (combinationUniqueId && combinationUniqueId !== "base") {
        payload.variantCombinationId = combinationUniqueId;
      }
      await rateCardService.upsertRate(payload);
      toastSuccess("Rate saved successfully");
      if (activeTab === "product" && selectedProduct) {
        await fetchProductSuppliers(
          selectedProduct._id,
          selectedProductCombination === "base"
            ? null
            : selectedProductCombination,
        );
      } else if (activeTab === "supplier" && selectedSupplier) {
        await handleSelectSupplier(selectedSupplier);
      }
    } catch (err) {
      toastError(err?.message || "Failed to save rate");
    } finally {
      setSavingRate(null);
    }
  };

  // --- Delete rate card entry ---
  const handleDeleteConfirm = async () => {
    const { id, context, isRateCombination } = confirmDelete;
    setConfirmDelete({
      visible: false,
      id: null,
      context: null,
      isRateCombination: false,
    });
    if (!id) return;
    try {
      await rateCardService.delete(id, isRateCombination);
      toastSuccess("Rate entry deleted successfully");
      if (context === "product" && selectedProduct) {
        await fetchProductSuppliers(
          selectedProduct._id,
          selectedProductCombination === "base"
            ? null
            : selectedProductCombination,
        );
      } else if (context === "supplier" && selectedSupplier) {
        await handleSelectSupplier(selectedSupplier);
      }
    } catch (err) {
      toastError(err?.message || "Failed to delete rate entry");
    }
  };

  const handleRateChange = (key, value) => {
    setEditingRates((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRateWithGst = (amount, includeGst, gstPercentage) => {
    const base = formatCurrency(amount);
    if (includeGst && gstPercentage && Number(gstPercentage) > 0) {
      return `${base} + GST (${Number(gstPercentage)}%)`;
    }
    return base;
  };

  const dropdownPanelClass =
    "absolute left-0 right-0 top-full z-[1000] mt-1 overflow-hidden rounded-md border border-border bg-background shadow-lg";
  const dropdownItemClass =
    "flex cursor-pointer items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-muted";

  return (
    <div>
      <PageHeader
        title="Rate Card"
        description="Look up and manage product and supplier rates."
      />

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-2 w-full">
              <TabsTrigger value="product">Search by Product</TabsTrigger>
              <TabsTrigger value="supplier">Search by Supplier</TabsTrigger>
              <TabsTrigger value="addRate">
                <Plus className="h-4 w-4" />
                Add Rate
              </TabsTrigger>
            </TabsList>

            {/* ========== TAB 1: Search by Product ========== */}
            <TabsContent value="product">
              {/* Product Search */}
              <div
                ref={productDropdownRef}
                className="relative"
                style={{ maxWidth: 500 }}
              >
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 pr-9"
                    placeholder="Search product by name or SKU..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      if (!e.target.value.trim()) {
                        setSelectedProduct(null);
                        setProductSuppliers([]);
                        setProductInfo(null);
                      }
                    }}
                  />
                  {productSearching && (
                    <Spinner
                      size="sm"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                  )}
                </div>

                {/* Dropdown results */}
                {showProductDropdown && productResults.length > 0 && (
                  <div
                    className={dropdownPanelClass}
                    style={{ maxHeight: 250, overflowY: "auto" }}
                  >
                    {productResults.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => handleSelectProduct(p)}
                        className={dropdownItemClass}
                      >
                        <div>
                          <strong>{p.name}</strong>
                          {p.sku && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              SKU: {p.sku}
                            </span>
                          )}
                        </div>
                        {p.price > 0 && (
                          <Badge variant="secondary">
                            {formatCurrency(p.price)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {showProductDropdown &&
                  productResults.length === 0 &&
                  !productSearching &&
                  productSearch.trim() && (
                    <div className={dropdownPanelClass}>
                      <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                        No products found
                      </div>
                    </div>
                  )}
              </div>

              {/* Product info & suppliers table */}
              {selectedProduct && (
                <>
                  {productInfo && (
                    <div className="mb-3 rounded-md bg-muted p-3">
                      <h5 className="mb-1 text-lg font-semibold">
                        {productInfo.name}
                      </h5>
                      <div className="text-sm text-muted-foreground">
                        {productInfo.sku && (
                          <span className="mr-3">SKU: {productInfo.sku}</span>
                        )}
                        {productInfo.price > 0 && (
                          <span>
                            Base Price: {formatCurrency(productInfo.price)}
                          </span>
                        )}
                      </div>
                      {productInfo.description && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {productInfo.description}
                        </div>
                      )}
                    </div>
                  )}

                  {productDetail?.hasVariants &&
                    productDetail?.variantCombinations?.length > 0 && (
                      <div className="mb-3">
                        <h6 className="mb-2 font-semibold">
                          Filter by combination
                        </h6>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(120px, 1fr))",
                            gap: "0.5rem 1rem",
                          }}
                        >
                          <label className="mb-0 flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              className="h-4 w-4 accent-primary"
                              name="productCombo"
                              checked={selectedProductCombination === null}
                              onChange={() =>
                                handleSelectProductCombination(null)
                              }
                            />
                            <span>All (Product level)</span>
                          </label>
                          {productDetail.variantCombinations
                            .filter((c) => c?.isActive !== false)
                            .filter((c) => {
                              const uid = c._id;
                              return combinationIdsWithRates.includes(uid);
                            })
                            .map((c) => {
                              const uid = c._id;
                              return (
                                <label
                                  key={uid}
                                  className="mb-0 flex cursor-pointer items-center gap-2"
                                >
                                  <input
                                    type="radio"
                                    className="h-4 w-4 accent-primary"
                                    name="productCombo"
                                    checked={selectedProductCombination === uid}
                                    onChange={() =>
                                      handleSelectProductCombination(uid)
                                    }
                                  />
                                  <span>{getVariantComboDisplay(c)}</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  {loadingSuppliers ? (
                    <Loader message="Loading suppliers..." />
                  ) : (
                    <>
                      <h6 className="mb-3 font-semibold">
                        Suppliers ({productSuppliers.length})
                      </h6>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead style={{ width: 50 }}>S No</TableHead>
                              <TableHead>Supplier Name</TableHead>
                              <TableHead>Shop</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead style={{ width: 150 }}>
                                Current Rate
                              </TableHead>
                              <TableHead style={{ width: 150 }}>
                                New Rate
                              </TableHead>
                              <TableHead style={{ width: 100 }}>
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productSuppliers.map((entry, index) => {
                              const comboId =
                                entry.variantCombinationId ??
                                selectedProductCombination;
                              const key = comboId
                                ? `${selectedProduct._id}_${entry.supplier?._id}_${comboId}`
                                : `${selectedProduct._id}_${entry.supplier?._id}`;
                              const isComboEntry = !!entry.variantCombinationId;
                              return (
                                <TableRow
                                  key={entry._id}
                                  className={
                                    index === 0 && productSuppliers.length > 1
                                      ? "bg-success-muted/40"
                                      : undefined
                                  }
                                >
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>
                                    <strong>{entry.supplier?.name}</strong>
                                    {index === 0 &&
                                      productSuppliers.length > 1 && (
                                        <Badge
                                          variant="success"
                                          className="ml-2"
                                        >
                                          Lowest
                                        </Badge>
                                      )}
                                  </TableCell>
                                  <TableCell>
                                    {entry.supplier?.shopname || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {entry.supplier?.phone_1 || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <strong>
                                      {formatRateWithGst(
                                        entry.rate,
                                        entry.includeGst,
                                        entry.gstPercentage,
                                      )}
                                    </strong>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-8"
                                      placeholder="New rate"
                                      value={editingRates[key] ?? ""}
                                      onChange={(e) =>
                                        handleRateChange(key, e.target.value)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary!"
                                        disabled={
                                          !editingRates[key] ||
                                          editingRates[key] === "" ||
                                          savingRate === key
                                        }
                                        onClick={() =>
                                          handleSaveRate(
                                            selectedProduct._id,
                                            entry.supplier?._id,
                                            editingRates[key],
                                          )
                                        }
                                        aria-label="Save Rate"
                                      >
                                        {savingRate === key ? (
                                          <Spinner size="sm" />
                                        ) : (
                                          <Save className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() =>
                                          setConfirmDelete({
                                            visible: true,
                                            id: entry._id,
                                            context: "product",
                                            isRateCombination: isComboEntry,
                                          })
                                        }
                                        aria-label="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {productSuppliers.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center text-muted-foreground"
                                >
                                  No suppliers found for this product.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {productSuppliers.length > 1 && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          Sorted by rate (lowest first)
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* ========== TAB 2: Search by Supplier ========== */}
            <TabsContent value="supplier">
              {/* Supplier Search */}
              <div
                ref={supplierDropdownRef}
                className="relative"
                style={{ maxWidth: 500 }}
              >
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 pr-9"
                    placeholder="Search supplier by name, shop or phone..."
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      if (!e.target.value.trim()) {
                        setSelectedSupplier(null);
                        setSupplierProducts([]);
                        setSupplierInfo(null);
                      }
                    }}
                  />
                  {supplierSearching && (
                    <Spinner
                      size="sm"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                  )}
                </div>

                {/* Dropdown results */}
                {showSupplierDropdown && supplierResults.length > 0 && (
                  <div
                    className={dropdownPanelClass}
                    style={{ maxHeight: 250, overflowY: "auto" }}
                  >
                    {supplierResults.map((s) => (
                      <div
                        key={s._id}
                        onClick={() => handleSelectSupplier(s)}
                        className={dropdownItemClass}
                      >
                        <div>
                          <strong>{s.name}</strong>
                          {s.shopname && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({s.shopname})
                            </span>
                          )}
                        </div>
                        {s.phone_1 && (
                          <span className="text-sm text-muted-foreground">
                            {s.phone_1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {showSupplierDropdown &&
                  supplierResults.length === 0 &&
                  !supplierSearching &&
                  supplierSearch.trim() && (
                    <div className={dropdownPanelClass}>
                      <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                        No suppliers found
                      </div>
                    </div>
                  )}
              </div>

              {/* Supplier info & products table */}
              {selectedSupplier && (
                <>
                  {supplierInfo && (
                    <div className="mb-3 rounded-md bg-muted p-3">
                      <h5 className="mb-1 text-lg font-semibold">
                        {supplierInfo.name}
                      </h5>
                      <div className="text-sm text-muted-foreground">
                        {supplierInfo.shopname && (
                          <span className="mr-3">
                            Shop: {supplierInfo.shopname}
                          </span>
                        )}
                        {supplierInfo.phone_1 && (
                          <span className="mr-3">
                            Phone: {supplierInfo.phone_1}
                          </span>
                        )}
                        {supplierInfo.email && (
                          <span>Email: {supplierInfo.email}</span>
                        )}
                      </div>
                      {supplierInfo.address && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {supplierInfo.address}
                        </div>
                      )}
                    </div>
                  )}

                  {loadingProducts ? (
                    <Loader message="Loading products..." />
                  ) : (
                    <>
                      <h6 className="mb-3 font-semibold">
                        Products Supplied ({supplierProducts.length})
                      </h6>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead style={{ width: 50 }}>S No</TableHead>
                              <TableHead>Product Name</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead style={{ width: 150 }}>
                                Current Rate
                              </TableHead>
                              <TableHead style={{ width: 150 }}>
                                New Rate
                              </TableHead>
                              <TableHead style={{ width: 100 }}>
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplierProducts.map((entry, index) => {
                              const key = `${entry.product?._id}_${selectedSupplier._id}`;
                              return (
                                <TableRow key={entry._id}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>
                                    <strong>{entry.product?.name}</strong>
                                  </TableCell>
                                  <TableCell>
                                    {entry.product?.sku || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <strong>
                                      {formatRateWithGst(
                                        entry.rate,
                                        entry.includeGst,
                                        entry.gstPercentage,
                                      )}
                                    </strong>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-8"
                                      placeholder="New rate"
                                      value={editingRates[key] ?? ""}
                                      onChange={(e) =>
                                        handleRateChange(key, e.target.value)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary!"
                                        disabled={
                                          !editingRates[key] ||
                                          editingRates[key] === "" ||
                                          savingRate === key
                                        }
                                        onClick={() =>
                                          handleSaveRate(
                                            entry.product?._id,
                                            selectedSupplier._id,
                                            editingRates[key],
                                          )
                                        }
                                        aria-label="Save Rate"
                                      >
                                        {savingRate === key ? (
                                          <Spinner size="sm" />
                                        ) : (
                                          <Save className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() =>
                                          setConfirmDelete({
                                            visible: true,
                                            id: entry._id,
                                            context: "supplier",
                                          })
                                        }
                                        aria-label="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {supplierProducts.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-center text-muted-foreground"
                                >
                                  No products found for this supplier.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* ========== TAB 3: Add Rate ========== */}
            <TabsContent value="addRate">
              <div className="mb-3">
                <h6 className="font-semibold">
                  Add a new rate for a Product + Supplier
                </h6>
                <div className="text-sm text-muted-foreground">
                  First choose the product and supplier, then set the rate and
                  next due date.
                </div>
              </div>

              {/* Top two-column layout: Product (left) and Supplier (right) */}
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-full rounded-lg border border-border p-3">
                  <Label className="font-semibold">Product *</Label>
                  <div ref={addProductDropdownRef} className="relative mt-1.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8 pr-9"
                        placeholder="Search product by name or SKU..."
                        value={addProductSearch}
                        onChange={(e) => {
                          setAddProductSearch(e.target.value);
                          if (!e.target.value.trim()) {
                            handleClearAddProduct();
                          }
                        }}
                      />
                      {addProductSearching && (
                        <Spinner
                          size="sm"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Start typing to search products by name or SKU, then
                      choose from the dropdown.
                    </div>

                    {showAddProductDropdown && addProductResults.length > 0 && (
                      <div
                        className={dropdownPanelClass}
                        style={{ maxHeight: 200, overflowY: "auto" }}
                      >
                        {addProductResults.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => handleAddProductSelect(p)}
                            className={dropdownItemClass}
                          >
                            <div>
                              <strong>{p.name}</strong>
                              {p.sku && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  SKU: {p.sku}
                                </span>
                              )}
                            </div>
                            {p.price > 0 && (
                              <Badge variant="secondary">
                                {formatCurrency(p.price)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {showAddProductDropdown &&
                      addProductResults.length === 0 &&
                      !addProductSearching &&
                      addProductSearch.trim() && (
                        <div className={dropdownPanelClass}>
                          <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                            No products found
                          </div>
                        </div>
                      )}
                  </div>

                  {addSelectedProduct && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Selected</Badge>
                        <strong>{addSelectedProduct.name}</strong>
                        {addSelectedProduct.sku && (
                          <span className="text-sm text-muted-foreground">
                            (SKU: {addSelectedProduct.sku})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={handleClearAddProduct}
                        aria-label="Remove product"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {loadingProductDetail && (
                    <div className="mt-2 flex items-center">
                      <Spinner size="sm" className="mr-2" />
                      Loading combinations...
                    </div>
                  )}

                  {addProductDetail && !loadingProductDetail && (
                    <div className="mt-3 w-full">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <h6 className="font-semibold">Select combination</h6>
                        <div
                          className="relative flex-grow"
                          style={{ maxWidth: 280 }}
                        >
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="h-8 pl-8"
                            placeholder="Search combination..."
                            value={addCombinationSearch}
                            onChange={(e) =>
                              setAddCombinationSearch(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div
                        className="w-full rounded-md border border-border p-3"
                        style={{ minWidth: 0 }}
                      >
                        {addProductDetail?.hasVariants &&
                        addProductDetail?.variantCombinations?.length > 0 ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(120px, 1fr))",
                              gap: "0.5rem 1rem",
                              alignItems: "center",
                              width: "100%",
                            }}
                          >
                            {(() => {
                              const filtered =
                                addProductDetail.variantCombinations
                                  .filter((c) => c?.isActive !== false)
                                  .filter((c) => {
                                    const q = addCombinationSearch
                                      .trim()
                                      .toLowerCase();
                                    if (!q) return true;
                                    const comboText = (
                                      getVariantComboDisplay(c) +
                                      " " +
                                      (c.variantCode || "")
                                    ).toLowerCase();
                                    return comboText.includes(q);
                                  });
                              if (filtered.length === 0) {
                                return (
                                  <div
                                    className="py-2 text-sm text-muted-foreground"
                                    style={{ gridColumn: "1 / -1" }}
                                  >
                                    No combinations match your search. Try a
                                    different term.
                                  </div>
                                );
                              }
                              return filtered.map((c) => {
                                const uid = c._id;
                                const selected = addSelectedCombination === uid;
                                return (
                                  <label
                                    key={uid}
                                    htmlFor={`combo-${uid}`}
                                    className="mb-0 flex cursor-pointer items-center gap-2"
                                  >
                                    <input
                                      type="radio"
                                      className="h-4 w-4 accent-primary"
                                      id={`combo-${uid}`}
                                      name="addRateCombo"
                                      checked={selected}
                                      onChange={() =>
                                        setAddSelectedCombination(uid)
                                      }
                                    />
                                    <span>{getVariantComboDisplay(c)}</span>
                                  </label>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          <label
                            htmlFor="combo-base"
                            className="mb-0 flex cursor-pointer items-center gap-2"
                          >
                            <input
                              type="radio"
                              className="h-4 w-4 accent-primary"
                              id="combo-base"
                              name="addRateCombo"
                              checked={addSelectedCombination === "base"}
                              onChange={() => setAddSelectedCombination("base")}
                            />
                            <span>Base Product</span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-full rounded-lg border border-border p-3">
                  <Label className="font-semibold">Supplier *</Label>
                  <div ref={addSupplierDropdownRef} className="relative mt-1.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8 pr-9"
                        placeholder="Search supplier by name, shop or phone..."
                        value={addSupplierSearch}
                        onChange={(e) => {
                          setAddSupplierSearch(e.target.value);
                          if (!e.target.value.trim()) {
                            handleClearAddSupplier();
                          }
                        }}
                      />
                      {addSupplierSearching && (
                        <Spinner
                          size="sm"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Search by supplier name, shop or phone, then pick one from
                      the suggestions.
                    </div>

                    {showAddSupplierDropdown &&
                      addSupplierResults.length > 0 && (
                        <div
                          className={dropdownPanelClass}
                          style={{ maxHeight: 200, overflowY: "auto" }}
                        >
                          {addSupplierResults.map((s) => (
                            <div
                              key={s._id}
                              onClick={() => {
                                setAddSelectedSupplier(s);
                                setAddSupplierSearch(s.name);
                                setShowAddSupplierDropdown(false);
                              }}
                              className={dropdownItemClass}
                            >
                              <div>
                                {s.shop_location && (
                                  <span className="mr-2 text-sm text-muted-foreground">
                                    [{s.shop_location}]{" "}
                                  </span>
                                )}
                                <strong>{s.name}</strong>
                                {s.shopname && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({s.shopname})
                                  </span>
                                )}
                              </div>
                              {s.phone_1 && (
                                <span className="text-sm text-muted-foreground">
                                  {s.phone_1}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    {showAddSupplierDropdown &&
                      addSupplierResults.length === 0 &&
                      !addSupplierSearching &&
                      addSupplierSearch.trim() && (
                        <div className={dropdownPanelClass}>
                          <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                            No suppliers found
                          </div>
                        </div>
                      )}
                  </div>

                  {addSelectedSupplier && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Selected</Badge>
                        {addSelectedSupplier.shop_location && (
                          <span className="text-sm text-muted-foreground">
                            {addSelectedSupplier.shop_location} -{" "}
                          </span>
                        )}
                        <strong>{addSelectedSupplier.name}</strong>
                        {addSelectedSupplier.shopname && (
                          <span className="text-sm text-muted-foreground">
                            ({addSelectedSupplier.shopname})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={handleClearAddSupplier}
                        aria-label="Remove supplier"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom box: Rate and Next Due Date in two columns */}
              <div className="mb-4 rounded-lg border border-border p-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Rate (INR) *</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Enter rate e.g. 25000"
                      value={addRate}
                      onChange={(e) => setAddRate(e.target.value)}
                    />
                    <div className="text-sm text-muted-foreground">
                      Enter the agreed base rate in Indian Rupees for this
                      product and supplier.
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Next Due Date *</Label>
                    <Input
                      type="date"
                      value={addNextDueDate}
                      onChange={(e) => setAddNextDueDate(e.target.value)}
                      min={addNextDueDateMin}
                    />
                    <div className="text-sm text-muted-foreground">
                      Default is 3 months from today. You can move it forward,
                      but past dates are disabled.
                    </div>
                  </div>
                </div>

                {addSelectedProduct &&
                  addSelectedSupplier &&
                  addRate &&
                  addNextDueDate && (
                    <div className="mt-2 rounded-md bg-muted p-2">
                      <div className="mb-1 font-semibold">Summary</div>
                      <div className="text-sm text-muted-foreground">
                        You will add a rate of{" "}
                        <span className="font-bold">
                          ₹{Number(addRate).toLocaleString("en-IN")}
                        </span>{" "}
                        for{" "}
                        <span className="font-bold">
                          {addSelectedProduct.name}
                        </span>{" "}
                        from{" "}
                        <span className="font-bold">
                          {addSelectedSupplier.name}
                        </span>
                        , with next due date{" "}
                        <span className="font-bold">{addNextDueDate}</span>.
                      </div>
                    </div>
                  )}
              </div>

              <div>
                <Button
                  onClick={handleAddRate}
                  disabled={
                    addingRate ||
                    !addSelectedProduct ||
                    !addSelectedSupplier ||
                    !addRate ||
                    !addNextDueDate
                  }
                >
                  {addingRate ? (
                    <>
                      <Spinner size="sm" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Rate
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() =>
          setConfirmDelete({
            visible: false,
            id: null,
            context: null,
            isRateCombination: false,
          })
        }
        onConfirm={handleDeleteConfirm}
        title="Delete Rate Entry?"
        message="Are you sure you want to remove this rate entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default RateCardList;
