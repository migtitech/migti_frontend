import { useSyncExternalStore } from "react";
import { dateMediumFormatter } from "../../utils/dateFormatter";

/**
 * In-memory mock data store for the Master > Rate Master demo screens.
 * No backend calls — data lives only for the current browser session and
 * is shared between the product-list page and the variants page so edits
 * made in the variant popup are visible when you navigate back.
 */

export const GST_OPTIONS = [0, 5, 12, 18, 28];

const CATEGORIES = [
  "Hand Tools",
  "Electricals",
  "Safety Equipment",
  "Fasteners",
  "Hydraulics",
  "Office Supplies",
];

const VARIANT_LABELS = [
  ["Small", "Medium", "Large"],
  ["Red", "Blue", "Black"],
  ["250ml", "500ml", "1L"],
  ["10mm", "12mm", "16mm"],
  ["Pack of 5", "Pack of 10"],
];

/**
 * Pool of dummy suppliers used to build the submitted-rate quotes. Each carries
 * a stable id + display code so a quote row can link straight to the supplier
 * view page (`/suppliers/:id`). Code format mirrors the real `SUP-XXXX` codes.
 */
const SUPPLIER_POOL = [
  {
    id: "SPL-201",
    code: "SUP-0201",
    name: "Sharma Traders",
    contact: "Rakesh Sharma",
    city: "Delhi",
  },
  {
    id: "SPL-202",
    code: "SUP-0202",
    name: "Kumar Industrial",
    contact: "Anil Kumar",
    city: "Ludhiana",
  },
  {
    id: "SPL-203",
    code: "SUP-0203",
    name: "Metro Supplies Co.",
    contact: "Priya Mehta",
    city: "Mumbai",
  },
  {
    id: "SPL-204",
    code: "SUP-0204",
    name: "National Hardware",
    contact: "Suresh Patel",
    city: "Ahmedabad",
  },
  {
    id: "SPL-205",
    code: "SUP-0205",
    name: "Bharat Tools & Co.",
    contact: "Vikram Singh",
    city: "Jaipur",
  },
  {
    id: "SPL-206",
    code: "SUP-0206",
    name: "Sunrise Enterprises",
    contact: "Deepak Verma",
    city: "Kanpur",
  },
  {
    id: "SPL-207",
    code: "SUP-0207",
    name: "Ganesh Trading",
    contact: "Manoj Gupta",
    city: "Nagpur",
  },
];

const PROCUREMENT_OFFICERS = [
  "Amit Joshi",
  "Neha Kapoor",
  "Rohan Desai",
  "Sneha Iyer",
];

export const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const formatDate = (date) => dateMediumFormatter(date);

export const daysUntil = (date) =>
  Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

/** Build 24 dummy products, each with 2-3 variants in varying rate states. */
const buildDummyProducts = () => {
  const products = [];
  for (let i = 0; i < 24; i += 1) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const variantLabels = VARIANT_LABELS[i % VARIANT_LABELS.length];
    const inSalesList = i % 3 !== 0;

    const variants = variantLabels.map((label, vIdx) => {
      const seed = i * 7 + vIdx * 3;
      // Rotate through: priced (fresh), priced (expiring soon), not priced yet
      const bucket = seed % 5;
      let rate = null;
      let discount = 0;
      let gst = GST_OPTIONS[seed % GST_OPTIONS.length];
      let validDays = null;
      let expiryDate = null;
      let status = "pending";

      if (bucket === 0) {
        // expiring soon (within 5 days)
        rate = 150 + seed * 8;
        discount = seed % 10;
        validDays = 30;
        expiryDate = addDays((seed % 5) + 1);
        status = "expiring";
      } else if (bucket === 1) {
        // healthy priced
        rate = 200 + seed * 6;
        discount = seed % 15;
        validDays = 60;
        expiryDate = addDays(45 + (seed % 20));
        status = "priced";
      } else if (bucket === 2) {
        rate = 90 + seed * 4;
        discount = 0;
        validDays = 90;
        expiryDate = addDays(70 + (seed % 15));
        status = "priced";
      } else {
        // pending — no rate yet, sitting with procurement
        status = "pending";
      }

      // Build 2-3 supplier quotes for this variant. Even pending variants
      // have submitted quotes — that's what procurement is choosing from.
      const quoteCount = 2 + (seed % 2); // 2 or 3 suppliers
      const baseRate = rate ?? 100 + seed * 5;
      const supplierQuotes = Array.from({ length: quoteCount }).map(
        (_, qIdx) => {
          const supplier = SUPPLIER_POOL[(seed + qIdx) % SUPPLIER_POOL.length];
          // Spread quoted rates around the base so ranking is meaningful.
          const quotedRate = Math.round(
            baseRate * (0.92 + qIdx * 0.09) + qIdx * 7,
          );
          return {
            id: `${i}-${vIdx}-Q${qIdx + 1}`,
            supplierId: supplier.id,
            supplierCode: supplier.code,
            supplier: supplier.name,
            contact: supplier.contact,
            city: supplier.city,
            quotedRate,
            gst: GST_OPTIONS[(seed + qIdx) % GST_OPTIONS.length],
            submittedBy:
              PROCUREMENT_OFFICERS[(seed + qIdx) % PROCUREMENT_OFFICERS.length],
            submittedAt: addDays(-((seed % 12) + qIdx + 1)),
          };
        },
      );

      return {
        id: `${i}-${vIdx}`,
        code: `VR-${1000 + i}-${vIdx + 1}`,
        name: label,
        rate,
        discount,
        gst,
        validDays,
        expiryDate,
        status,
        assignedTo: status === "pending" ? "Procurement Team" : "Sales",
        supplierQuotes,
        // Sales-master access controls (set from Rate Master):
        //  - visibleToSales: is this variant shown in the sales master at all
        //  - markupType/markupValue: how the base rate is adjusted for sales
        //    (percent → +/-% of base, amount → +/-₹ flat). Value may be negative.
        visibleToSales: status !== "pending",
        markupType: "percent",
        markupValue: 0,
      };
    });

    products.push({
      id: `PRD-${1000 + i}`,
      name: `Seed Product ${i + 1}`,
      sku: `SKU-${1000 + i}`,
      category,
      inSalesList,
      variants,
    });
  }
  return products;
};

export const productStatus = (product) => {
  if (product.variants.some((v) => v.status === "expiring")) return "expiring";
  if (product.variants.every((v) => v.status === "priced")) return "priced";
  if (product.variants.some((v) => v.status === "pending")) return "pending";
  return "priced";
};

let products = buildDummyProducts();
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Live-updating hook — re-renders the caller whenever the store changes. */
export const useRateMasterProducts = () =>
  useSyncExternalStore(subscribe, () => products);

export const getProduct = (productId) =>
  products.find((p) => p.id === productId) || null;

export const getVariant = (productId, variantId) => {
  const product = getProduct(productId);
  if (!product) return { product: null, variant: null };
  const variant = product.variants.find((v) => v.id === variantId) || null;
  return { product, variant };
};

/**
 * Rank a variant's supplier quotes cheapest-first and tag each with an L1/L2/L3
 * label. Ranking is done on the effective (GST-inclusive) rate so the cheapest
 * landed cost wins. Returns a new array; does not mutate the input.
 */
export const rankQuotes = (quotes = []) => {
  const withEffective = quotes.map((q) => ({
    ...q,
    effectiveRate: Math.round(q.quotedRate * (1 + (q.gst || 0) / 100)),
  }));
  withEffective.sort((a, b) => a.effectiveRate - b.effectiveRate);
  return withEffective.map((q, idx) => ({ ...q, rank: `L${idx + 1}` }));
};

/**
 * Sales-facing rate for a variant: its base rate adjusted by the configured
 * markup. `percent` adds markupValue% of the base; `amount` adds a flat ₹.
 * markupValue can be negative to show a lower rate. Never returns below 0.
 * Returns null when the variant has no base rate yet.
 */
export const salesRate = (variant) => {
  if (!variant || variant.rate == null) return null;
  const value = Number(variant.markupValue) || 0;
  const adjusted =
    variant.markupType === "amount"
      ? variant.rate + value
      : variant.rate * (1 + value / 100);
  return Math.max(0, Math.round(adjusted));
};

/** A product is visible to sales when at least one variant is shown to sales. */
export const productVisibleToSales = (product) =>
  !!product && product.variants.some((v) => v.visibleToSales);

/** Toggle whether a variant is shown in the sales master. */
export const setVariantSalesVisibility = (productId, variantId, visible) => {
  products = products.map((p) => {
    if (p.id !== productId) return p;
    return {
      ...p,
      variants: p.variants.map((v) =>
        v.id === variantId ? { ...v, visibleToSales: !!visible } : v,
      ),
    };
  });
  emit();
};

/** Hide (or show) every variant of a product from the sales master at once. */
export const setProductSalesVisibility = (productId, visible) => {
  products = products.map((p) => {
    if (p.id !== productId) return p;
    return {
      ...p,
      variants: p.variants.map((v) => ({ ...v, visibleToSales: !!visible })),
    };
  });
  emit();
};

/** Set the sales markup (type + value) applied to a variant's base rate. */
export const setVariantMarkup = (productId, variantId, { type, value }) => {
  products = products.map((p) => {
    if (p.id !== productId) return p;
    return {
      ...p,
      variants: p.variants.map((v) =>
        v.id === variantId
          ? {
              ...v,
              markupType: type === "amount" ? "amount" : "percent",
              markupValue: Number(value) || 0,
            }
          : v,
      ),
    };
  });
  emit();
};

export const setVariantRate = (
  productId,
  variantId,
  { rate, discount, gst, validDays },
) => {
  products = products.map((p) => {
    if (p.id !== productId) return p;
    return {
      ...p,
      variants: p.variants.map((v) =>
        v.id === variantId
          ? {
              ...v,
              rate,
              discount,
              gst,
              validDays,
              expiryDate: addDays(validDays),
              status: validDays <= 5 ? "expiring" : "priced",
              assignedTo: "Sales",
            }
          : v,
      ),
    };
  });
  emit();
};

export const reassignVariantToProcurement = (productId, variantId) => {
  products = products.map((p) => {
    if (p.id !== productId) return p;
    return {
      ...p,
      variants: p.variants.map((v) =>
        v.id === variantId
          ? { ...v, status: "pending", assignedTo: "Procurement Team" }
          : v,
      ),
    };
  });
  emit();
};
