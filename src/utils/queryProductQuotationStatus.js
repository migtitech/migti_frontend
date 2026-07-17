export const QUERY_PRODUCT_QUOTATION_STATUS = {
  PENDING: "pending",
  READY_FOR_QUOTATION: "ready_for_quotation",
};

export const QUERY_PRODUCT_SUB_STATUS = {
  DRAFT: "draft",
  CONVERTED_TO_QUOTATION: "converted_to_quotation",
};

export const getProductQuotationStatus = (product) =>
  product?.quotation_status || QUERY_PRODUCT_QUOTATION_STATUS.PENDING;

export const getProductSubStatus = (product) =>
  product?.sub_status || QUERY_PRODUCT_SUB_STATUS.DRAFT;

export const isProductReadyForQuotation = (product) =>
  getProductQuotationStatus(product) ===
  QUERY_PRODUCT_QUOTATION_STATUS.READY_FOR_QUOTATION;

export const isProductConvertedToQuotation = (product) =>
  getProductSubStatus(product) ===
  QUERY_PRODUCT_SUB_STATUS.CONVERTED_TO_QUOTATION;

export const getProductSubStatusLabel = (product) => {
  const subStatus = getProductSubStatus(product);
  if (subStatus === QUERY_PRODUCT_SUB_STATUS.CONVERTED_TO_QUOTATION) {
    return "Converted to quotation";
  }
  return "Draft";
};

export const filterProductsReadyForQuotation = (products = []) =>
  (Array.isArray(products) ? products : []).filter(isProductReadyForQuotation);

/** Same key as backend `queryProductLineKey` for matching query lines to quotation lines. */
export const queryProductLineKey = (line) => {
  const code = String(line?.rawProductCode || "")
    .trim()
    .toLowerCase();
  if (code) return `code:${code}`;
  const name = String(line?.productName || "")
    .trim()
    .toLowerCase();
  return `name:${name}`;
};

export const getQuotationProductLineKeys = (quotationProducts = []) => {
  const keys = new Set();
  (Array.isArray(quotationProducts) ? quotationProducts : []).forEach((p) => {
    keys.add(queryProductLineKey(p));
  });
  return keys;
};

/** Query lines marked ready for quotation that are not on the current quotation. */
export const getReadyQueryProductsMissingFromQuotation = (
  queryProducts = [],
  quotationProducts = [],
) => {
  const quotationKeys = getQuotationProductLineKeys(quotationProducts);
  return filterProductsReadyForQuotation(queryProducts).filter(
    (product) => !quotationKeys.has(queryProductLineKey(product)),
  );
};
