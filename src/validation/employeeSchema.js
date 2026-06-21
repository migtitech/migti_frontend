/**
 * Employee form validation — mirrors backend Joi rules (employee.validator.js)
 * and UI/business logic (sub-zone requires single zone, branch when selectable).
 */
import * as yup from "yup";
import {
  phoneRequired,
  phoneOptional,
  emailRequired,
  emailOptional,
  stringRequired,
  stringOptional,
  MSG,
  OBJECT_ID_PATTERN,
} from "../utils/validation";

const objectIdOptional = (label = "id") =>
  yup
    .string()
    .nullable()
    .transform((value, original) => (original === "" ? null : value))
    .test(
      "objectId",
      `Invalid ${label}`,
      (value) => !value || OBJECT_ID_PATTERN.test(value),
    );

const optionalBankField = () =>
  yup
    .string()
    .nullable()
    .transform((value, original) => (original === "" ? null : value));

const bankDetailsSchema = yup.object({
  accountNumber: optionalBankField(),
  ifscCode: optionalBankField(),
  bankName: optionalBankField(),
  accountHolderName: optionalBankField(),
  upiDetails: optionalBankField(),
});

const assetItemSchema = yup.object({
  enabled: yup.boolean().default(false),
  model: yup.string().trim().optional(),
  modelNumber: yup.string().trim().optional(),
  companyName: yup.string().trim().optional(),
  vehicleNumber: yup.string().trim().optional(),
  configurationRam: yup.string().trim().optional(),
  configurationRom: yup.string().trim().optional(),
  storageType: yup.string().oneOf(["ssd", "hdd", ""]).optional().default(""),
  phoneType: yup
    .string()
    .oneOf(["android", "keypad", ""])
    .optional()
    .default(""),
  imeiNumber: yup.string().trim().optional(),
  number: yup.string().trim().optional(),
  providedDate: yup.string().trim().optional(),
});

const assetsSchema = yup.object({
  bike: assetItemSchema,
  laptop: assetItemSchema,
  mobile: assetItemSchema,
  simCard: assetItemSchema,
});

const sharedEmployeeFields = () => ({
  name: stringRequired(2, 100).label("Name"),
  email: emailRequired().label("Email"),
  phone: phoneRequired().label("Phone"),
  fatherName: stringOptional(100).label("Father's name"),
  motherName: stringOptional(100).label("Mother's name"),
  pincode: yup
    .string()
    .trim()
    .optional()
    .max(20, MSG.maxLength(20))
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  hasBike: yup
    .string()
    .oneOf(["yes", "no", ""], "Please select an option")
    .optional()
    .default("no"),
  hasDrivingLicense: yup
    .string()
    .oneOf(["yes", "no", ""], "Please select an option")
    .optional()
    .default("no"),
  companyEmail: emailOptional(),
  companyPhone: phoneOptional("Company phone"),
  role: yup
    .string()
    .required("Role is required")
    .min(2, MSG.minLength(2))
    .max(50, MSG.maxLength(50)),
  designation: stringRequired(2, 100).label("Designation"),
  address: stringRequired(2, 500).label("Address"),
  idnumber: stringRequired(2, 50).label("ID number"),
  salaryType: yup.string().optional().max(50).default("monthly"),
  salary: yup
    .number()
    .typeError("Salary must be a number")
    .min(0, "Salary must be 0 or more")
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  bankDetails: bankDetailsSchema.optional().default({}),
  branchId: yup.string().optional(),
  zoneIds: yup
    .array()
    .of(yup.string())
    .optional()
    .default([])
    .test(
      "zoneIds",
      "Invalid zone id",
      (zoneIds) =>
        !zoneIds?.length ||
        zoneIds.every((zoneId) => !zoneId || OBJECT_ID_PATTERN.test(zoneId)),
    ),
  subZoneId: objectIdOptional("sub-zone id"),
  categories: yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),
  assigned_groups: yup
    .array()
    .of(yup.string())
    .optional()
    .default([])
    .test(
      "assigned_groups",
      "Invalid group id",
      (groupIds) =>
        !groupIds?.length ||
        groupIds.every(
          (groupId) => !groupId || OBJECT_ID_PATTERN.test(groupId),
        ),
    ),
  assets: assetsSchema.optional().default({}),
});

export const getCreateEmployeeSchema = () =>
  yup.object({
    ...sharedEmployeeFields(),
    password: yup
      .string()
      .required("Password is required")
      .min(6, "Password must be at least 6 characters"),
  });

export const getUpdateEmployeeSchema = () => yup.object(sharedEmployeeFields());

export const getEmployeeSchema = ({ isEdit = false } = {}) =>
  isEdit ? getUpdateEmployeeSchema() : getCreateEmployeeSchema();

export const EMPLOYEE_FORM_DEFAULT_VALUES = {
  name: "",
  email: "",
  phone: "",
  fatherName: "",
  motherName: "",
  pincode: "",
  hasBike: "no",
  hasDrivingLicense: "no",
  companyEmail: "",
  companyPhone: "",
  role: "",
  branchId: "",
  zoneIds: [],
  subZoneId: "",
  categories: "",
  assigned_groups: [],
  designation: "",
  address: "",
  idnumber: "",
  salaryType: "monthly",
  salary: "",
  password: "",
  bankDetails: {
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    accountHolderName: "",
    upiDetails: "",
  },
  assets: {
    bike: {
      enabled: false,
      model: "",
      vehicleNumber: "",
      providedDate: "",
    },
    laptop: {
      enabled: false,
      modelNumber: "",
      companyName: "",
      configurationRam: "",
      configurationRom: "",
      storageType: "",
      providedDate: "",
    },
    mobile: {
      enabled: false,
      companyName: "",
      phoneType: "",
      imeiNumber: "",
      modelNumber: "",
      providedDate: "",
    },
    simCard: {
      enabled: false,
      companyName: "",
      number: "",
      providedDate: "",
    },
  },
};
