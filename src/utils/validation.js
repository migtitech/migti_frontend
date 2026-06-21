/**
 * Reusable frontend validation utilities mirroring backend API rules (Joi).
 * Use with yup in forms so invalid requests are caught before submission.
 */

import * as yup from "yup";

// --- Patterns (match backend) ---
/** Phone: 5–20 digits only (backend: /^\d{5,20}$/) */
export const PHONE_PATTERN = /^\d{5,20}$/;
/** Indian GSTIN: 15 chars (backend pattern) */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
/** GSTIN optional (empty or 15 chars) */
export const GSTIN_OPTIONAL_PATTERN =
  /^(|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])$/;
/** IFSC: 4 letters + 0 + 6 alphanumeric */
export const IFSC_PATTERN = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
/** Mongo ObjectId 24 hex */
export const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

// --- Messages (clear, user-facing) ---
export const MSG = {
  required: "This field is required",
  email: "Enter a valid email address",
  phone: "Phone must contain only digits (5–20 digits)",
  phoneShort: "Phone must be 5–20 digits",
  gstin: "Enter a valid 15-character GSTIN (e.g. 22AABCU9603R1ZX)",
  ifsc: "Enter a valid IFSC code",
  url: "Enter a valid URL",
  minLength: (min) => `Must be at least ${min} characters`,
  maxLength: (max) => `Must be at most ${max} characters`,
  numberMin: (min) => `Must be ${min} or more`,
  numberMax: (max) => `Must be ${max} or less`,
};

// --- Yup helpers (reusable) ---

/** Required string, min/max length */
export const stringRequired = (min = 1, max = 255) =>
  yup
    .string()
    .trim()
    .required(MSG.required)
    .min(min, MSG.minLength(min))
    .max(max, MSG.maxLength(max));

/** Optional string, max length */
export const stringOptional = (max = 255) =>
  yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .max(max, MSG.maxLength(max));

/** Email required */
export const emailRequired = () =>
  yup.string().trim().required(MSG.required).email(MSG.email);

/** Email optional (allow empty) */
export const emailOptional = () =>
  yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .email(MSG.email);

/** Phone required: 5–20 digits (backend employee phone) */
export const phoneRequired = () =>
  yup
    .string()
    .trim()
    .required(MSG.required)
    .matches(PHONE_PATTERN, "Phone must contain only digits (5–20 digits)");

/** Phone optional: if provided, 5–20 digits (backend companyPhone) */
export const phoneOptional = (fieldLabel = "Phone") =>
  yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test(
      "phone",
      `${fieldLabel} must contain only digits (5–20 digits)`,
      (v) => !v || PHONE_PATTERN.test(v),
    );

/** GSTIN required (15 chars) */
export const gstinRequired = () =>
  yup
    .string()
    .trim()
    .required(MSG.required)
    .transform((v) => (typeof v === "string" ? v.toUpperCase() : v || ""))
    .matches(GSTIN_PATTERN, MSG.gstin);

/** GSTIN optional (empty or 15 chars) */
export const gstinOptional = () =>
  yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (typeof v === "string" ? v.toUpperCase() : v || ""))
    .test("gstin", MSG.gstin, (v) => !v || v === "" || GSTIN_PATTERN.test(v));

/** URL optional, max length */
export const urlOptional = (max = 500) =>
  yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test("url", MSG.url, (v) => !v || v === "" || /^https?:\/\/.+/.test(v))
    .max(max, MSG.maxLength(max));

/** Number min/max, optional */
export const numberMinMax = (min, max, opts = {}) => {
  let s = yup
    .number()
    .typeError(opts.typeError || "Must be a number")
    .min(min, opts.minMsg || MSG.numberMin(min));
  if (max != null) s = s.max(max, opts.maxMsg || MSG.numberMax(max));
  return s
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v));
};

/** Integer >= 0, required (e.g. quantity) */
export const quantityRequired = () =>
  yup
    .number()
    .typeError("Quantity must be a number")
    .integer("Quantity must be a whole number")
    .min(0, "Quantity must be 0 or more")
    .required("Quantity is required");

/** Integer >= 0, optional */
export const quantityOptional = () =>
  yup
    .number()
    .typeError("Must be a number")
    .integer("Must be a whole number")
    .min(0, "Must be 0 or more")
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v));

/** Employee login role enum (backend loginEmployeeSchema) */
export const EMPLOYEE_LOGIN_ROLES = [
  "head_of_department",
  "sales_manager",
  "sales_exicutive",
  "purchase_exicutive",
  "procurement",
  "back_office_exicutive",
  "administrator",
  "hod",
  "sm",
  "se",
  "pe",
  "boe",
  "admin",
  "sales",
  "purchase",
  "finance",
  "delivery",
  "inventry_manager",
  "dispatch_manager",
  "localprocurement",
  "localpurchase",
];

export default {
  PHONE_PATTERN,
  GSTIN_PATTERN,
  GSTIN_OPTIONAL_PATTERN,
  IFSC_PATTERN,
  OBJECT_ID_PATTERN,
  MSG,
  stringRequired,
  stringOptional,
  emailRequired,
  emailOptional,
  phoneRequired,
  phoneOptional,
  gstinRequired,
  gstinOptional,
  urlOptional,
  numberMinMax,
  quantityRequired,
  quantityOptional,
  EMPLOYEE_LOGIN_ROLES,
};
