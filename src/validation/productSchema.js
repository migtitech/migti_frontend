import * as yup from "yup";
import {
  PRODUCT_UNIT_CODES,
  DEFAULT_PRODUCT_UNIT,
} from "../constants/productUnits";

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
  uniqueId: yup.string().optional(),
  variantCode: yup.string().max(50).nullable().optional(),
  optionValues: yup
    .array()
    .of(variantOptionValueSchema)
    .min(1, '"optionValues" must contain at least 1 items')
    .required(),
  sku: yup.string().required('"sku" is required'),
  price: yup
    .number()
    .typeError('"price" must be a number')
    .min(0, '"price" must be greater than or equal to 0')
    .required('"price" is required'),
  mrp: optionalNumber("mrp"),
  costPrice: optionalNumber("costPrice"),
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
    .optional()
    .default([]),
  modelNumber: yup.string().max(100).nullable().optional().default(""),
  hsnNumber: yup.string().max(50).nullable().optional().default(""),
  gstPercentage: yup
    .number()
    .min(0)
    .max(100)
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? null : value)),
  isActive: yup.boolean().optional().default(true),
});

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
    "Each company product code row must have both company and code.",
    (row) => {
      const hasIndustry = Boolean(row?.industryId?.trim());
      const hasCode = Boolean(row?.code?.trim());
      return (!hasIndustry && !hasCode) || (hasIndustry && hasCode);
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
      200,
      '"name" length must be less than or equal to 200 characters long',
    ),
  description: yup.string().optional().default(""),
  shortDescription: yup.string().optional().default(""),
  sku: yup
    .string()
    .trim()
    .required('"sku" is required')
    .min(1, '"sku" is not allowed to be empty')
    .max(50, '"sku" length must be less than or equal to 50 characters long'),
  category: yup.string().required('"category" is required'),
  subcategory: yup.string().nullable().optional(),
  brand: yup.string().nullable().optional(),
  group: yup.string().nullable().optional(),
  hsnNumber: yup.string().max(50).optional().default(""),
  gstPercentage: yup.number().min(0).max(100).optional().default(0),
  defaultModelNumber: yup.string().max(100).optional().default(""),
  price: optionalNumber("price"),
  mrp: optionalNumber("mrp"),
  costPrice: optionalNumber("costPrice"),
  quantity: optionalNumber("quantity", { integer: true }),
  hasVariants: yup.boolean().optional().default(false),
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
    .default("draft"),
  unit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"unit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .optional()
    .default(DEFAULT_PRODUCT_UNIT),
  companyProductCodes: yup
    .array()
    .of(companyProductCodeSchema)
    .optional()
    .default([]),
});

/** React-hook-form schema (form fields before payload transform). */
export const productFormSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('"name" is required')
    .min(2, '"name" length must be at least 2 characters long')
    .max(
      200,
      '"name" length must be less than or equal to 200 characters long',
    ),
  sku: yup
    .string()
    .trim()
    .required('"sku" is required')
    .min(1, '"sku" is not allowed to be empty')
    .max(50, '"sku" length must be less than or equal to 50 characters long'),
  shortDescription: yup.string().trim().optional().default(""),
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
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  hsnNumber: yup
    .string()
    .trim()
    .max(
      50,
      '"hsnNumber" length must be less than or equal to 50 characters long',
    )
    .optional()
    .default(""),
  gstPercentage: yup
    .number()
    .typeError('"gstPercentage" must be a number')
    .min(0, '"gstPercentage" must be greater than or equal to 0')
    .max(100, '"gstPercentage" must be less than or equal to 100')
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? undefined : value)),
  defaultModelNumber: yup
    .string()
    .trim()
    .max(
      100,
      '"defaultModelNumber" length must be less than or equal to 100 characters long',
    )
    .optional()
    .default(""),
  hasVariants: yup.boolean().optional().default(false),
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
    .default("draft"),
  unit: yup
    .string()
    .oneOf(
      [...PRODUCT_UNIT_CODES],
      `"unit" must be one of [${PRODUCT_UNIT_CODES.join(", ")}]`,
    )
    .optional()
    .default(DEFAULT_PRODUCT_UNIT),
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

export const validateProductPayload = async (payload) => {
  try {
    await createProductPayloadSchema.validate(payload, { abortEarly: false });
    return [];
  } catch (err) {
    return collectYupErrors(err);
  }
};
