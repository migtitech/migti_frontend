/**
 * Static dummy/sample catalog powering the Product Sale List UI only.
 *
 * IMPORTANT: This is frontend presentational sample data — it is NOT wired
 * to any API/service and does not read or write real records. It exists so
 * sales employees can preview product rates, discounts and availability at a
 * glance. Swap for real service calls when this screen is connected to the
 * backend; the components read only from the shapes defined here.
 *
 * Money is in INR. Each product has one or more variants; every variant
 * carries its own price / selling price / discount / stock so a rep can quote
 * a customer directly.
 */

/** availability: "in_stock" | "low_stock" | "out_of_stock" | "made_to_order" */

export const productSaleCatalog = [
  {
    id: "PSL-1001",
    name: "Industrial Ball Bearing",
    brand: "SKF",
    category: "Bearings",
    hsnNumber: "84821011",
    unit: "PCS",
    warranty: "12 months",
    leadTime: "Ships in 1–2 days",
    description:
      "Deep-groove sealed ball bearings for high-speed rotary equipment. Low friction, long service life, suitable for motors, pumps and gearboxes.",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=60",
    variants: [
      {
        sku: "BRG-6203-ZZ",
        label: "6203-ZZ (17mm bore)",
        mrp: 420,
        sellingPrice: 349,
        discountPct: 17,
        availability: "in_stock",
        stock: 240,
        moq: 10,
      },
      {
        sku: "BRG-6205-2RS",
        label: "6205-2RS (25mm bore)",
        mrp: 610,
        sellingPrice: 520,
        discountPct: 15,
        availability: "in_stock",
        stock: 128,
        moq: 10,
      },
      {
        sku: "BRG-6305-C3",
        label: "6305-C3 (25mm bore, heavy duty)",
        mrp: 940,
        sellingPrice: 799,
        discountPct: 15,
        availability: "low_stock",
        stock: 12,
        moq: 5,
      },
    ],
  },
  {
    id: "PSL-1002",
    name: "Hydraulic Gear Pump",
    brand: "Bosch Rexroth",
    category: "Hydraulics",
    hsnNumber: "84131900",
    unit: "PCS",
    warranty: "18 months",
    leadTime: "Ships in 3–5 days",
    description:
      "Cast-iron external gear pumps for hydraulic power packs. Consistent flow under high pressure, rebuildable, field-proven design.",
    image:
      "https://images.unsplash.com/photo-1580983218765-f663bec07b37?auto=format&fit=crop&w=400&q=60",
    variants: [
      {
        sku: "HYD-GP-8CC",
        label: "8 cc/rev",
        mrp: 8600,
        sellingPrice: 7480,
        discountPct: 13,
        availability: "in_stock",
        stock: 34,
        moq: 1,
      },
      {
        sku: "HYD-GP-16CC",
        label: "16 cc/rev",
        mrp: 11200,
        sellingPrice: 9950,
        discountPct: 11,
        availability: "made_to_order",
        stock: 0,
        moq: 1,
      },
    ],
  },
  {
    id: "PSL-1003",
    name: "V-Belt Drive",
    brand: "Fenner",
    category: "Power Transmission",
    hsnNumber: "40103500",
    unit: "PCS",
    warranty: "6 months",
    leadTime: "Ships same day",
    description:
      "Wrapped V-belts for industrial drives. Oil and heat resistant, anti-static, matched-set available for multi-groove pulleys.",
    image:
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=400&q=60",
    variants: [
      {
        sku: "VB-A42",
        label: "A-42 (1067mm)",
        mrp: 260,
        sellingPrice: 199,
        discountPct: 23,
        availability: "in_stock",
        stock: 500,
        moq: 5,
      },
      {
        sku: "VB-B56",
        label: "B-56 (1422mm)",
        mrp: 340,
        sellingPrice: 289,
        discountPct: 15,
        availability: "in_stock",
        stock: 320,
        moq: 5,
      },
      {
        sku: "VB-C90",
        label: "C-90 (2286mm)",
        mrp: 690,
        sellingPrice: 585,
        discountPct: 15,
        availability: "low_stock",
        stock: 8,
        moq: 2,
      },
    ],
  },
  {
    id: "PSL-1004",
    name: "Three-Phase Induction Motor",
    brand: "Crompton",
    category: "Electricals",
    hsnNumber: "85015210",
    unit: "PCS",
    warranty: "24 months",
    leadTime: "Ships in 2–4 days",
    description:
      "TEFC squirrel-cage motors, IE3 efficiency, foot-mounted. Class F insulation, suitable for pumps, compressors and conveyors.",
    image:
      "https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=400&q=60",
    variants: [
      {
        sku: "MTR-1HP-1440",
        label: "1 HP / 1440 RPM",
        mrp: 6400,
        sellingPrice: 5560,
        discountPct: 13,
        availability: "in_stock",
        stock: 46,
        moq: 1,
      },
      {
        sku: "MTR-3HP-1440",
        label: "3 HP / 1440 RPM",
        mrp: 11800,
        sellingPrice: 10400,
        discountPct: 12,
        availability: "in_stock",
        stock: 22,
        moq: 1,
      },
      {
        sku: "MTR-5HP-2880",
        label: "5 HP / 2880 RPM",
        mrp: 16900,
        sellingPrice: 14990,
        discountPct: 11,
        availability: "out_of_stock",
        stock: 0,
        moq: 1,
      },
    ],
  },
  {
    id: "PSL-1005",
    name: "Cast Iron Ball Valve",
    brand: "Zoloto",
    category: "Valves",
    hsnNumber: "84818030",
    unit: "PCS",
    warranty: "12 months",
    leadTime: "Ships in 1–2 days",
    description:
      "Full-bore two-piece ball valves, screwed ends, PTFE seats. Rated for water, oil, air and steam service lines.",
    image:
      "https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?auto=format&fit=crop&w=400&q=60",
    variants: [
      {
        sku: "VLV-BV-15",
        label: '1/2" (15mm)',
        mrp: 380,
        sellingPrice: 299,
        discountPct: 21,
        availability: "in_stock",
        stock: 210,
        moq: 5,
      },
      {
        sku: "VLV-BV-25",
        label: '1" (25mm)',
        mrp: 640,
        sellingPrice: 540,
        discountPct: 16,
        availability: "in_stock",
        stock: 96,
        moq: 5,
      },
      {
        sku: "VLV-BV-50",
        label: '2" (50mm)',
        mrp: 1450,
        sellingPrice: 1249,
        discountPct: 14,
        availability: "low_stock",
        stock: 6,
        moq: 2,
      },
    ],
  },
  {
    id: "PSL-1006",
    name: "Helical Gearbox",
    brand: "Elecon",
    category: "Gearboxes",
    hsnNumber: "84834000",
    unit: "PCS",
    warranty: "18 months",
    leadTime: "Made to order (10–14 days)",
    description:
      "Inline helical gear reducers, foot-mounted, hardened & ground gears. Wide ratio range for conveyors, mixers and crushers.",
    image:
      "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=400&q=60",
    variants: [
      {
        sku: "GBX-i15",
        label: "Ratio 1:15",
        mrp: 24500,
        sellingPrice: 21900,
        discountPct: 11,
        availability: "made_to_order",
        stock: 0,
        moq: 1,
      },
      {
        sku: "GBX-i30",
        label: "Ratio 1:30",
        mrp: 27800,
        sellingPrice: 24600,
        discountPct: 12,
        availability: "made_to_order",
        stock: 0,
        moq: 1,
      },
    ],
  },
];

export const AVAILABILITY_META = {
  in_stock: { label: "In stock", variant: "success" },
  low_stock: { label: "Low stock", variant: "warning" },
  out_of_stock: { label: "Out of stock", variant: "destructive" },
  made_to_order: { label: "Made to order", variant: "info" },
};

/** Distinct category list for the filter dropdown. */
export const productSaleCategories = Array.from(
  new Set(productSaleCatalog.map((p) => p.category)),
).sort();

/** Format an INR amount for display. */
export const formatINR = (value) =>
  value == null || Number.isNaN(Number(value))
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })}`;

/**
 * Roll a product's variants up into a price range + best availability so the
 * list row can summarise "from ₹X" and one status chip.
 */
export const summarizeProduct = (product) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const prices = variants.map((v) => Number(v.sellingPrice)).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const maxDiscount = variants.reduce(
    (m, v) => Math.max(m, Number(v.discountPct) || 0),
    0,
  );
  const inStockCount = variants.filter(
    (v) => v.availability === "in_stock" || v.availability === "low_stock",
  ).length;
  // Best availability across variants (in_stock wins, then low, then MTO, then out).
  const order = ["in_stock", "low_stock", "made_to_order", "out_of_stock"];
  const best =
    order.find((a) => variants.some((v) => v.availability === a)) ||
    "out_of_stock";
  const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  return {
    minPrice,
    maxPrice,
    maxDiscount,
    inStockCount,
    variantCount: variants.length,
    bestAvailability: best,
    totalStock,
  };
};
