export const QUERY_REFERENCE_BY = {
  DIRECTLY_RECEIVED: "directly_received",
  HEAD_OF_DEPARTMENT: "head_of_department",
};

export const QUERY_REFERENCE_BY_LABELS = {
  [QUERY_REFERENCE_BY.DIRECTLY_RECEIVED]: "Directly received",
  [QUERY_REFERENCE_BY.HEAD_OF_DEPARTMENT]: "Head of department",
};

export const formatQueryReferenceByDisplay = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "—";
  if (QUERY_REFERENCE_BY_LABELS[trimmed]) {
    return QUERY_REFERENCE_BY_LABELS[trimmed];
  }
  return trimmed;
};

export const employeeMatchesZone = (employee, zoneId) => {
  if (!zoneId || !employee) return false;
  const target = String(zoneId);
  const zoneIds = Array.isArray(employee.zoneIds) ? employee.zoneIds : [];
  if (
    zoneIds.some((zoneEntry) => String(zoneEntry?._id || zoneEntry) === target)
  ) {
    return true;
  }
  const legacyZoneId = employee.zoneId;
  if (legacyZoneId && String(legacyZoneId?._id || legacyZoneId) === target) {
    return true;
  }
  return false;
};
