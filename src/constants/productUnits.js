/**
 * Sale / line-item units stored as a short string in the API (unchanged schema).
 * Use {@link PRODUCT_UNIT_OPTIONS} for dropdown labels; {@link PRODUCT_UNIT_CODES} for validation lists.
 */
export const PRODUCT_UNIT_OPTIONS = [
  { value: "NOS", label: "NOS" },
  { value: "PCS", label: "PCS" },
  { value: "KG", label: "KG" },
  { value: "LTR", label: "LTR" },
  { value: "BOX", label: "BOX" },
  { value: "BAG", label: "BAG" },
  { value: "PKT", label: "PKT (packet)" },
  { value: "CTN", label: "CTN (carton)" },
  { value: "SET", label: "SET" },
  { value: "MTR", label: "MTR (meter)" },
];

export const PRODUCT_UNIT_CODES = PRODUCT_UNIT_OPTIONS.map((o) => o.value);

/** @param {unknown} value */
export function isStandardProductUnit(value) {
  if (value == null || value === "") return false;
  return PRODUCT_UNIT_CODES.includes(String(value).trim());
}
