/**
 * Sale / line-item units stored as a short string in the API (unchanged schema).
 * Use {@link PRODUCT_UNIT_OPTIONS} for dropdown labels; {@link PRODUCT_UNIT_CODES} for validation lists.
 */
export const PRODUCT_UNIT_OPTIONS = [
  { value: "NOS", label: "NOS (Numbers)" },
  { value: "PCS", label: "PCS (Pieces)" },
  { value: "PKT", label: "PKT (Packet)" },
  { value: "BOX", label: "BOX (Box)" },
  { value: "BAG", label: "BAG (Bag)" },
  { value: "SET", label: "SET (Set)" },
  { value: "PR", label: "PR (Pair)" },
  { value: "DOZ", label: "DOZ (Dozen)" },
  { value: "BDL", label: "BDL (Bundle)" },
  { value: "ROLL", label: "ROLL (Roll)" },
  { value: "STRIP", label: "STRIP (Strip)" },
  { value: "CAN", label: "CAN (Can)" },
  { value: "TIN", label: "TIN (Tin)" },
  { value: "JAR", label: "JAR (Jar)" },
  { value: "BTL", label: "BTL (Bottle)" },
  { value: "CTN", label: "CTN (Carton)" },
  { value: "TRAY", label: "TRAY (Tray)" },
  { value: "DRM", label: "DRM (Drum)" },
  { value: "TUB", label: "TUB (Tub)" },
  { value: "KG", label: "KG (Kilogram)" },
  { value: "GM", label: "GM (Gram)" },
  { value: "MG", label: "MG (Milligram)" },
  { value: "LTR", label: "LTR (Litre)" },
  { value: "ML", label: "ML (Millilitre)" },
  { value: "MTR", label: "MTR (Metre)" },
  { value: "CM", label: "CM (Centimetre)" },
  { value: "MM", label: "MM (Millimetre)" },
  { value: "KM", label: "KM (Kilometre)" },
  { value: "FT", label: "FT (Foot)" },
  { value: "IN", label: "IN (Inch)" },
  { value: "SQFT", label: "SQFT (Square Foot)" },
  { value: "SQM", label: "SQM (Square Metre)" },
];

export const PRODUCT_UNIT_CODES = PRODUCT_UNIT_OPTIONS.map((o) => o.value);

export const DEFAULT_PRODUCT_UNIT = "PCS";

/** @param {unknown} value */
export function isStandardProductUnit(value) {
  if (value == null || value === "") return false;
  return PRODUCT_UNIT_CODES.includes(String(value).trim());
}
