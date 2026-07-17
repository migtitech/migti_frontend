import { useSyncExternalStore } from "react";

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

export const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const formatDate = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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

      return {
        id: `${i}-${vIdx}`,
        name: label,
        rate,
        discount,
        gst,
        validDays,
        expiryDate,
        status,
        assignedTo: status === "pending" ? "Procurement Team" : "Sales",
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
