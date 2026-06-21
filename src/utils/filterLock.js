const lockedStorageKey = (pageKey) => `migti_${pageKey}_filters_locked`;
const fieldStorageKey = (pageKey, field) => `migti_${pageKey}_filters_${field}`;

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const readFiltersLocked = (pageKey, legacyLockedKey = null) => {
  if (safeGet(lockedStorageKey(pageKey)) === "1") return true;
  if (legacyLockedKey && safeGet(legacyLockedKey) === "1") return true;
  return false;
};

export const sanitizeDateRangeInValues = (values) => {
  const next = { ...values };
  const fromKey = ["dateFrom", "from"].find((key) => key in next);
  const toKey = ["dateTo", "to"].find((key) => key in next);
  if (!fromKey || !toKey) return next;
  const from = next[fromKey] ?? "";
  const to = next[toKey] ?? "";
  if (from && to && to < from) next[toKey] = "";
  return next;
};

export const readPersistedFilterValues = (
  pageKey,
  defaults,
  legacyKeys = {},
) => {
  if (!readFiltersLocked(pageKey, legacyKeys.lockedKey)) {
    return { ...defaults };
  }
  try {
    const values = { ...defaults };
    for (const field of Object.keys(defaults)) {
      const legacyKey = legacyKeys[field];
      const stored =
        safeGet(fieldStorageKey(pageKey, field)) ??
        (legacyKey ? safeGet(legacyKey) : null);
      values[field] =
        stored !== null && stored !== undefined ? stored : defaults[field];
    }
    return sanitizeDateRangeInValues(values);
  } catch {
    return { ...defaults };
  }
};

export const clearPersistedFilters = (pageKey, fields, legacyKeys = {}) => {
  safeRemove(lockedStorageKey(pageKey));
  if (legacyKeys.lockedKey) safeRemove(legacyKeys.lockedKey);
  for (const field of fields) {
    safeRemove(fieldStorageKey(pageKey, field));
    if (legacyKeys[field]) safeRemove(legacyKeys[field]);
  }
};

export const persistLockedFilters = (pageKey, values) => {
  safeSet(lockedStorageKey(pageKey), "1");
  for (const [field, value] of Object.entries(values)) {
    safeSet(fieldStorageKey(pageKey, field), value ?? "");
  }
};

export const getInitialFilterLockState = (
  pageKey,
  defaults,
  legacyKeys = {},
) => {
  const filtersLocked = readFiltersLocked(pageKey, legacyKeys.lockedKey);
  const values = readPersistedFilterValues(pageKey, defaults, legacyKeys);
  return { filtersLocked, values };
};
