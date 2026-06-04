/**
 * Sale / line-item units stored as a short string in the API (unchanged schema).
 * Use {@link PRODUCT_UNIT_OPTIONS} for dropdown labels; {@link PRODUCT_UNIT_CODES} for validation lists.
 */
export const PRODUCT_UNIT_OPTIONS = [
  { value: "NOS", label: "NOS" },
  { value: "PCS", label: "PCS" },
  { value: "PKT", label: "PKT (packet)" },
  { value: "BOX", label: "BOX" },
  { value: "BAG", label: "BAG" },
  { value: "SET", label: "SET" },
  { value: "PR", label: "PR (pair)" },
  { value: "DOZ", label: "DOZ (dozen)" },
  { value: "BDL", label: "BDL (bundle)" },
  { value: "ROLL", label: "ROLL" },
  { value: "STRIP", label: "STRIP" },
  { value: "CAN", label: "CAN" },
  { value: "TIN", label: "TIN" },
  { value: "JAR", label: "JAR" },
  { value: "BTL", label: "BTL (bottle)" },
  { value: "CTN", label: "CTN (carton)" },
  { value: "TRAY", label: "TRAY" },
  { value: "DRM", label: "DRM (drum)" },
  { value: "TUB", label: "TUB" },
  { value: "KG", label: "KG" },
  { value: "GM", label: "GM (gram)" },
  { value: "MG", label: "MG (milligram)" },
  { value: "LTR", label: "LTR (litre)" },
  { value: "ML", label: "ML (millilitre)" },
  { value: "MTR", label: "MTR (meter)" },
  { value: "CM", label: "CM (centimeter)" },
  { value: "MM", label: "MM (millimeter)" },
  { value: "KM", label: "KM (kilometer)" },
  { value: "FT", label: "FT (feet)" },
  { value: "IN", label: "IN (inch)" },
  { value: "SQFT", label: "SQFT (square feet)" },
  { value: "SQM", label: "SQM (square meter)" },
];

export const PRODUCT_UNIT_CODES = PRODUCT_UNIT_OPTIONS.map((o) => o.value);

/** @param {unknown} value */
export function isStandardProductUnit(value) {
  if (value == null || value === "") return false;
  return PRODUCT_UNIT_CODES.includes(String(value).trim());
}
