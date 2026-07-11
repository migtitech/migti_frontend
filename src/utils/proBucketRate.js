/** Round currency-style amounts to 2 decimal places. */
const roundAmount = (value) => Math.round(value * 100) / 100;

/**
 * Final procurement rate per unit:
 * (base rate + GST% of base) then minus discount% of that amount.
 */
export const computeProBucketFinalAmount = (
  rate,
  gstPercentage = 0,
  discountPercentage = 0,
) => {
  const base = Number(rate) || 0;
  const gstPct = Math.max(0, Number(gstPercentage) || 0);
  const discountPct = Math.max(0, Number(discountPercentage) || 0);
  const afterGst = base + base * (gstPct / 100);
  const finalAmount = afterGst - afterGst * (discountPct / 100);
  return Math.max(0, roundAmount(finalAmount));
};

/** Effective rate for display; supports legacy rows without finalAmount. */
export const resolveProBucketEffectiveRate = (rateEntry) => {
  if (!rateEntry || typeof rateEntry !== "object") return null;
  const stored = rateEntry.finalAmount;
  if (typeof stored === "number" && !Number.isNaN(stored)) {
    return stored;
  }
  if (typeof rateEntry.rate !== "number" || Number.isNaN(rateEntry.rate)) {
    return null;
  }
  return computeProBucketFinalAmount(
    rateEntry.rate,
    rateEntry.gstPercentage,
    rateEntry.discountPercentage,
  );
};

export const formatProBucketRateAmount = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
