import * as yup from "yup";
import { PRODUCT_UNIT_CODES } from "../constants/productUnits";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const optionalNumber = (label, { integer = false, defaultValue = 0 } = {}) => {
  let schema = yup
    .number()
    .typeError(`"${label}" must be a number`)
    .min(0, `"${label}" must be greater than or equal to 0`)
    .transform((value, original) => (original === "" ? undefined : value));

  if (integer) {
    schema = schema.integer(`"${label}" must be an integer`);
  }

  return schema.notRequired().default(defaultValue);
};

const variantOptionValueSchema = yup.object({
  variantName: yup.string().required('"variantName" is required'),
  variantValue: yup.string().required('"variantValue" is required'),
});

const variantDimensionsSchema = yup.object({
  length: optionalNumber("length"),
  width: optionalNumber("width"),
  height: optionalNumber("height"),
});

export const variantCombinationSchema = yup.object({
  _id: yup.string().matches(OBJECT_ID_PATTERN).optional(),
  variantCode: yup.string().max(100).nullable().optional(),
  optionValues: yup
    .array()
    .of(variantOptionValueSchema)
    .min(1, '"optionValues" must contain at least 1 items')
    .required(),
  price: yup
    .number()
    .typeError('"price" must be a number')
    .min(0, '"price" must be greater than or equal to 0')
    .required('"price" (selling price) is required')
    .transform((value, original) => (original === "" ? undefined : value)),
  mrp: optionalNumber("mrp"),
  costPrice: yup
    .number()
    .typeError('"costPrice" must be a number')
    .min(0, '"costPrice" must be greater than or equal to 0')
    .required('"costPrice" (purchase price) is required')
    .transform((value, original) => (original === "" ? undefined : value)),
  quantity: optionalNumber("quantity", { integer: true }),
  weight: optionalNumber("weight"),
  weightUnit: yup
    .string()
    .oneOf(["g", "kg", "lb", "oz"])
    .optional()
    .default("g"),
  dimensions: variantDimensionsSchema.optional(),
  dimensionUnit: yup.string().oneOf(["cm", "in", "m"]).optional().default("cm"),
  images: yup
    .array()
    .of(yup.string().matches(OBJECT_ID_PATTERN))
    .min(1, "At least one image is required")
    .required("At least one image is required"),
  queryQuotationImageId: yup
    .string()
    .matches(OBJECT_ID_PATTERN)
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  modelNumber: yup
    .string()
    .trim()
    .required("Model number is required")
    .min(1, "Model number is required")
    .max(100, "Model number must be at most 100 characters"),
  hsnNumber: yup.string().max(25).nullable().optional().default(""),
  gstPercentage: yup
    .number()
    .min(0)
    .max(100)
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  isActive: yup.boolean().optional().default(true),
  timeline: yup
    .number()
    .integer()
    .min(0, "Procurement timeline cannot be negative")
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  timelineValue: yup
    .number()
    .min(0, "Procurement timeline cannot be negative")
    .transform((value, original) => (original === "" ? undefined : value))
    .optional(),
  timelineUnit: yup
    .string()
    .oneOf(["day", "week", "month", "year"])
    .optional()
    .default("day"),
  nextTimelineDate: yup
    .string()
    .nullable()
    .optional()
    .test(
      "future-date",
      "Next review date must be a future date",
      (value) => {
        if (!value) return true;
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d > today;
      },
    ),
  procurementReviewStatus: yup
    .string()
    .oneOf(["idle", "overdue", "activated", "active"])
    .optional()
    .default("idle"),
}).test(
  "selling-gt-purchase",
  "Selling price must be greater than purchase price",
  function (combo) {
    if (!combo) return true;
    const selling = Number(combo.price);
    const purchase = Number(combo.costPrice);
    if (!Number.isFinite(selling) || !Number.isFinite(purchase)) return true;
    return selling > purchase;
  },
);

export const variantSchema = yup.object({
  name: yup.string().required('"name" is required'),
  options: yup
    .array()
    .of(yup.string())
    .min(1, '"options" must contain at least 1 items')
    .required(),
});

const dimensionsSchema = yup.object({
  length: optionalNumber("length"),
  width: optionalNumber("width"),
  height: optionalNumber("height"),
});

export const companyProductCodeSchema = yup.object({
  industry: yup
    .string()
    .matches(OBJECT_ID_PATTERN, '"industry" must be a valid id')
    .required('"industry" is required'),
  code: yup
    .string()
    .trim()
    .required('"code" is required')
    .min(1, '"code" is not allowed to be empty')
    .max(100, '"code" must be at most 100 characters'),
});

export const companyProductCodeFormRowSchema = yup
  .object({
    industryId: yup.string().optional().default(""),
    code: yup.string().trim().optional().default(""),
  })
  .test(
    "complete-row",
    "Each company vs client row must have both client and product code.",
    (row) => {
      const hasIndustry = Boolean(row?.industryId?.trim());
      const hasCode = Boolean(row?.code?.trim());
      return (!hasIndustry && !hasCode) || (hasIndustry && hasCode);
    },
  );

export const supplierProductCodeSchema = yup.object({
  supplier: yup
    .string()
    .matches(OBJECT_ID_PATTERN, '"supplier" must be a valid id')
    .required('"supplier" is required'),
  code: yup
    .string()
    .trim()
    .required('"code" is required')
    .min(1, '"code" is not allowed to be empty')
    .max(100, '"code" must be at most 100 characters'),
});

export const supplierProductCodeFormRowSchema = yup
  .object({
    supplierId: yup.string().optional().default(""),
    code: yup.string().trim().optional().default(""),
  })
  .test(
    "complete-row",
    "Each company vs supplier row must have both supplier and product code.",
    (row) => {
      const hasSupplier = Boolean(row?.supplierId?.trim());
      const hasCode = Boolean(row?.code?.trim());
      return (!hasSupplier && !hasCode) || (hasSupplier && hasCode);
    },
  );

/** Mirrors backend createProductSchema (product.validator.js). */
export const createProductPayloadSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('"name" is required')
    .min(2, '"name" length must be at least 2 characters long')
    .max(
      100,
      '"name" length must be less than or equal to 100 characters long',
    ),
  description: yup.string().optional().default(""),
  shortDescription: yup.string().optional().default(""),
  sku: yup.string().trim().max(50).optional(),
  category: yup.string().required('"category" is required'),
  subcategory: yup.string().nullable().optional(),
  brand: yup.string().nullable().optional(),
  group: yup.string().required('"group" is required'),
  hsnNumber: yup
    .string()
    .trim()
    .required('"hsnNumber" is required')
    .min(1, '"hsnNumber" is not allowed to be empty')
    .max(
      25,
      '"hsnNumber" length must be less than or equal to 25 characters long',
    ),
  taxClause: yup.string().trim().optional().default(""),
  gstPercentage: yup
    .number()
    .transform((value, original) => (original === "" || original == null ? undefined : value))
    .typeError("GST is required")
    .required("GST is required")
    .min(0, "GST must be greater than or equal to 0")
    .max(100, "GST must be less than or equal to 100"),
  defaultModelNumber: yup.string().max(100).optional().default(""),
  price: optionalNumber("price"),
  mrp: optionalNumber("mrp"),
  costPrice: optionalNumber("costPrice"),
  quantity: optionalNumber("quantity", { integer: true }),
  hasVariants: yup.boolean().optional().default(true),
  variants: yup.array().of(variantSchema).optional().default([]),
  variantCombinations: yup
    .array()
    .of(variantCombinationSchema)
    .optional()
    .default([]),
  images: yup
    .array()
    .of(yup.string().matches(OBJECT_ID_PATTERN))
    .optional()
    .default([]),
  weight: optionalNumber("weight"),
  weightUnit: yup
    .string()
    .oneOf(
      ["g", "kg", "lb", "oz"],
      '"weightUnit" must be one of [g, kg, lb, oz]',
    )
    .optional()
    .default("g"),
  dimensions: dimensionsSchema.optional(),
  dimensionUnit: yup
    .string()
    .oneOf(["cm", "in", "m"], '"dimensionUnit" must be one of [cm, in, m]')
    .optional()
    .default("cm"),
  tags: yup.array().of(yup.string()).optional().default([]),
  status: yup
    .string()
    .oneOf(
      ["active", "inactive", "draft", "hod_approved"],
      '"status" must be one of [active, inactive, draft, hod_approved]',
    )
    .optional()
    .default("active"),
  unit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"unit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .required('"unit" is required'),
  purchaseUnit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"purchaseUnit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  salesUnit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"salesUnit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  minStock: yup
    .number()
    .typeError("Min stock must be a number")
    .integer("Min stock must be an integer")
    .min(0, "Min stock cannot be negative")
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  maxStock: yup
    .number()
    .typeError("Max stock must be a number")
    .integer("Max stock must be an integer")
    .min(0, "Max stock cannot be negative")
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  expiry: yup
    .string()
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value))
    .test(
      "not-past-expiry",
      "Expiry cannot be earlier than the current date",
      (value) => {
        if (!value) return true;
        const d = new Date(
          typeof value === "string" && value.length <= 10
            ? `${value}T00:00:00`
            : value,
        );
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d >= today;
      },
    ),
  companyProductCodes: yup
    .array()
    .of(companyProductCodeSchema)
    .optional()
    .default([]),
  supplierProductCodes: yup
    .array()
    .of(supplierProductCodeSchema)
    .optional()
    .default([]),
  timeline: yup
    .number()
    .integer()
    .min(1)
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  nextTimelineDate: yup.string().nullable().optional(),
  procurementReviewStatus: yup
    .string()
    .oneOf(
      ["idle", "overdue", "activated", "active"],
      '"procurementReviewStatus" must be one of [idle, overdue, activated, active]',
    )
    .optional()
    .default("idle"),
});

/** React-hook-form schema (form fields before payload transform). */
export const productFormSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('"name" is required')
    .min(2, '"name" length must be at least 2 characters long')
    .max(
      100,
      '"name" length must be less than or equal to 100 characters long',
    ),
  description: yup.string().trim().optional().default(""),
  category: yup.string().required('"category" is required'),
  subcategory: yup
    .string()
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  brand: yup
    .string()
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  group: yup
    .string()
    .required('"group" is required')
    .transform((value, original) => (original === "" ? undefined : value)),
  hsnNumber: yup
    .string()
    .trim()
    .required('"hsnNumber" is required')
    .min(1, '"hsnNumber" is not allowed to be empty')
    .max(
      25,
      '"hsnNumber" length must be less than or equal to 25 characters long',
    ),
  taxClause: yup.string().trim().optional().default(""),
  gstPercentage: yup
    .number()
    .transform((value, original) => (original === "" || original == null ? undefined : value))
    .typeError("GST is required")
    .required("GST is required")
    .min(0, "GST must be greater than or equal to 0")
    .max(100, "GST must be less than or equal to 100"),
  defaultModelNumber: yup
    .string()
    .trim()
    .max(
      100,
      '"defaultModelNumber" length must be less than or equal to 100 characters long',
    )
    .optional()
    .default(""),
  hasVariants: yup.boolean().optional().default(true),
  weight: yup
    .number()
    .typeError('"weight" must be a number')
    .min(0, '"weight" must be greater than or equal to 0')
    .transform((value, original) => (original === "" ? undefined : value))
    .optional(),
  weightUnit: yup
    .string()
    .oneOf(
      ["g", "kg", "lb", "oz"],
      '"weightUnit" must be one of [g, kg, lb, oz]',
    )
    .optional()
    .default("g"),
  dimensions: yup.object({
    length: yup
      .number()
      .typeError('"length" must be a number')
      .min(0, '"length" must be greater than or equal to 0')
      .transform((value, original) => (original === "" ? undefined : value))
      .optional(),
    width: yup
      .number()
      .typeError('"width" must be a number')
      .min(0, '"width" must be greater than or equal to 0')
      .transform((value, original) => (original === "" ? undefined : value))
      .optional(),
    height: yup
      .number()
      .typeError('"height" must be a number')
      .min(0, '"height" must be greater than or equal to 0')
      .transform((value, original) => (original === "" ? undefined : value))
      .optional(),
  }),
  dimensionUnit: yup
    .string()
    .oneOf(["cm", "in", "m"], '"dimensionUnit" must be one of [cm, in, m]')
    .optional()
    .default("cm"),
  tags: yup.string().optional().default(""),
  status: yup
    .string()
    .oneOf(
      ["active", "inactive", "draft", "hod_approved"],
      '"status" must be one of [active, inactive, draft, hod_approved]',
    )
    .optional()
    .default("active"),
  unit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"unit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .required('"unit" is required'),
  purchaseUnit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"purchaseUnit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  salesUnit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"salesUnit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  minStock: yup
    .number()
    .typeError("Min stock must be a number")
    .integer("Min stock must be an integer")
    .min(0, "Min stock cannot be negative")
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  maxStock: yup
    .number()
    .typeError("Max stock must be a number")
    .integer("Max stock must be an integer")
    .min(0, "Max stock cannot be negative")
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  expiry: yup
    .string()
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value))
    .test(
      "not-past-expiry",
      "Expiry cannot be earlier than the current date",
      (value) => {
        if (!value) return true;
        const d = new Date(
          typeof value === "string" && value.length <= 10
            ? `${value}T00:00:00`
            : value,
        );
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d >= today;
      },
    ),
});

export const collectYupErrors = (err) => {
  if (err?.inner?.length) {
    return [...new Set(err.inner.map((item) => item.message))];
  }
  if (err?.message) return [err.message];
  return ["Validation failed"];
};

export const validateCompanyProductCodeRows = async (rows = []) => {
  try {
    await yup
      .array()
      .of(companyProductCodeFormRowSchema)
      .validate(rows, { abortEarly: false });
    return [];
  } catch (err) {
    return collectYupErrors(err);
  }
};

export const validateSupplierProductCodeRows = async (rows = []) => {
  try {
    await yup
      .array()
      .of(supplierProductCodeFormRowSchema)
      .validate(rows, { abortEarly: false });
    return [];
  } catch (err) {
    return collectYupErrors(err);
  }
};

export const validateProductPayload = async (payload) => {
  try {
    await createProductPayloadSchema.validate(payload, { abortEarly: false });
    return [];
  } catch (err) {
    return collectYupErrors(err);
  }
};
