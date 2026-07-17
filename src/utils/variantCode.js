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
  if (!productCode || String(productCode).includes("?")) {
    return "";
  }
  return suffix ? `${productCode}-${suffix}` : productCode;
};

/** Keep only attribute names/options that appear in selected combinations. */
export const deriveVariantsFromSelectedCombinations = (
  selectedCombinations = [],
  sourceVariants = [],
) => {
  if (!selectedCombinations.length) return [];

  const valueSetsByName = new Map();
  selectedCombinations.forEach((combo) => {
    (combo.optionValues || []).forEach(({ variantName, variantValue }) => {
      const name = String(variantName || "").trim();
      const value = String(variantValue || "").trim();
      if (!name || !value) return;
      if (!valueSetsByName.has(name)) valueSetsByName.set(name, new Set());
      valueSetsByName.get(name).add(value);
    });
  });

  const orderedNames = (sourceVariants || [])
    .map((variant) => String(variant?.name || "").trim())
    .filter((name) => name && valueSetsByName.has(name));

  valueSetsByName.forEach((_, name) => {
    if (!orderedNames.includes(name)) orderedNames.push(name);
  });

  return orderedNames.map((name) => {
    const usedValues = valueSetsByName.get(name);
    const sourceVariant = (sourceVariants || []).find(
      (variant) => String(variant?.name || "").trim() === name,
    );
    const sourceOptions = (sourceVariant?.options || [])
      .map((option) => String(option).trim())
      .filter((option) => option && usedValues.has(option));
    const remainingValues = Array.from(usedValues).filter(
      (value) => !sourceOptions.includes(value),
    );

    return {
      name,
      options: [...sourceOptions, ...remainingValues],
    };
  });
};
