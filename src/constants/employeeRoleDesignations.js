/** Role → allowed designation labels (employee create/edit form). */
export const ROLE_DESIGNATION_MAP = {
  head_of_department: ["Head Of Department ( HOD )"],
  sales_manager: ["Sales Manager ( SM )"],
  sales_exicutive: ["Sales Exicutive ( SE )"],
  purchase_exicutive: ["Purchase Exicutive  ( PE )"],
  procurement: ["Procurement Exicutive  ( PRC )"],
  localprocurement: ["Local Procurement  ( LP )"],
  localpurchase: ["Local Purchase  ( LPU )"],
  back_office_exicutive: ["Back Office Exicutive ( BOE )"],
  administrator: ["Administrator ( ADMIN )"],
  finance: ["Finance"],
  inventry_manager: ["Inventry Manager"],
  dispatch_manager: ["Dispatch Manager"],
};

export const EMPLOYEE_ROLE_OPTIONS = Object.keys(ROLE_DESIGNATION_MAP);

export const ALL_EMPLOYEE_DESIGNATIONS = [
  ...new Set(Object.values(ROLE_DESIGNATION_MAP).flat()),
];

export const getDesignationsForRole = (role) =>
  ROLE_DESIGNATION_MAP[String(role || "").trim()] ?? [];
