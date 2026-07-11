export const getOptionValuesKey = (optionValues = []) =>
  [...(optionValues || [])]
    .map((option) => `${option.variantName}:${option.variantValue}`)
    .sort()
    .join("|");

/** First character of each variant value, e.g. Size=1 + Grade=Red → "1R". */
export const getVariantCodeSuffix = (optionValues = []) =>
  (optionValues || [])
    .map((option) => String(option.variantValue || "").trim())
    .filter(Boolean)
    .map((value) => {
      const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
      if (!cleaned) return "X";
      const first = cleaned[0];
      return /[0-9]/.test(first) ? first : first.toUpperCase();
    })
    .join("");

export const buildVariantCode = (productCode, optionValues = []) => {
  const suffix = getVariantCodeSuffix(optionValues);
  if (!productCode) return suffix ? `PRD-???-${suffix}` : "";
  return suffix ? `${productCode}-${suffix}` : productCode;
};
