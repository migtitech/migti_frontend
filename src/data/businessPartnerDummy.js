/**
 * Frontend-only dummy data layer for the Business Partner module.
 *
 * IMPORTANT: This is NOT wired to any API/backend. It backs form fields that
 * the real Industry/Supplier models do not have a column for yet (Client
 * Code, business/address/financial info, attachments, branches) plus the
 * brand-new Contact Person entity. Everything here is persisted to
 * localStorage only, keyed by the real Industry/Supplier _id so it can be
 * "overlaid" on top of real records for display. Swap this module out for
 * real service calls whenever the backend adds support; nothing else needs
 * to change at the call sites beyond the import.
 */

const OVERLAY_KEY = "bp_dummy_overlay_v1";
const CONTACT_PERSONS_KEY = "bp_contact_persons_v1";
const CODES_KEY = "bp_codes_v1";
const CODE_COUNTERS_KEY = "bp_code_counters_v1";

const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors (quota, privacy mode, etc.)
  }
};

export const defaultOverlay = () => ({
  clientType: "",
  industrySector: "",
  registrationNumber: "",
  pan: "",
  hasBranches: false,
  branches: [],
  website: "",
  companyEmail: "",
  companyPhone: "",
  companyLogoBase64: "",
  numberOfEmployees: "",
  annualRevenue: "",
  registeredAddress: "",
  billingAddress: "",
  shippingAddress: "",
  country: "",
  state: "",
  city: "",
  pincode: "",
  currency: "",
  paymentTerms: "",
  creditLimit: "",
  attachments: [],
  remarks: "",
  internalComments: "",
  category: "",
});

const overlayKeyFor = (entityType, recordId) => `${entityType}:${recordId}`;

export function getOverlay(entityType, recordId) {
  if (!recordId) return defaultOverlay();
  const all = readJson(OVERLAY_KEY, {});
  const stored = all[overlayKeyFor(entityType, recordId)];
  return { ...defaultOverlay(), ...(stored || {}) };
}

export function saveOverlay(entityType, recordId, overlay) {
  if (!recordId) return;
  const all = readJson(OVERLAY_KEY, {});
  all[overlayKeyFor(entityType, recordId)] = {
    ...defaultOverlay(),
    ...(all[overlayKeyFor(entityType, recordId)] || {}),
    ...overlay,
  };
  writeJson(OVERLAY_KEY, all);
}

export function deleteOverlay(entityType, recordId) {
  if (!recordId) return;
  const all = readJson(OVERLAY_KEY, {});
  delete all[overlayKeyFor(entityType, recordId)];
  writeJson(OVERLAY_KEY, all);
}

const CODE_PREFIX = { industry: "CL", supplier: "SUP" };

export function getOrCreateCode(entityType, recordId) {
  if (!recordId) return "";
  const codes = readJson(CODES_KEY, {});
  const key = overlayKeyFor(entityType, recordId);
  if (codes[key]) return codes[key];

  const counters = readJson(CODE_COUNTERS_KEY, {});
  const next = (counters[entityType] || 0) + 1;
  counters[entityType] = next;
  writeJson(CODE_COUNTERS_KEY, counters);

  const prefix = CODE_PREFIX[entityType] || "BP";
  const code = `${prefix}-${String(next).padStart(4, "0")}`;
  codes[key] = code;
  writeJson(CODES_KEY, codes);
  return code;
}

export function listContactPersons(filter = {}) {
  const all = readJson(CONTACT_PERSONS_KEY, []);
  const list = Array.isArray(all) ? all : [];
  if (!filter.parentType) return list;
  return list.filter(
    (cp) =>
      cp.mappedType === filter.parentType ||
      (!cp.mappedType && filter.includeUnmapped),
  );
}

export function getContactPerson(id) {
  const all = readJson(CONTACT_PERSONS_KEY, []);
  return (Array.isArray(all) ? all : []).find((cp) => cp.id === id) || null;
}

export function saveContactPerson(record) {
  const all = readJson(CONTACT_PERSONS_KEY, []);
  const list = Array.isArray(all) ? all : [];
  const now = new Date().toISOString();

  if (record.id) {
    const idx = list.findIndex((cp) => cp.id === record.id);
    const updated = { ...list[idx], ...record, updatedAt: now };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    writeJson(CONTACT_PERSONS_KEY, list);
    return updated;
  }

  const created = {
    ...record,
    id: uid("cp"),
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  writeJson(CONTACT_PERSONS_KEY, list);
  return created;
}

export function deleteContactPerson(id) {
  const all = readJson(CONTACT_PERSONS_KEY, []);
  const list = (Array.isArray(all) ? all : []).filter((cp) => cp.id !== id);
  writeJson(CONTACT_PERSONS_KEY, list);
}

export function setContactPersonStatus(id, isActive) {
  const all = readJson(CONTACT_PERSONS_KEY, []);
  const list = Array.isArray(all) ? all : [];
  const idx = list.findIndex((cp) => cp.id === id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const updated = {
    ...list[idx],
    status: isActive ? "active" : "inactive",
    updatedAt: now,
  };
  if (!isActive) {
    updated.mappedType = "";
    updated.mappedId = "";
    updated.mappedName = "";
  }
  list[idx] = updated;
  writeJson(CONTACT_PERSONS_KEY, list);
  return updated;
}

export default {
  defaultOverlay,
  getOverlay,
  saveOverlay,
  deleteOverlay,
  getOrCreateCode,
  listContactPersons,
  getContactPerson,
  saveContactPerson,
  deleteContactPerson,
  setContactPersonStatus,
};
