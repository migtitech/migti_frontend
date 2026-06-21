export const MONGO_OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export const isMongoObjectId = (value) => {
  const normalized = String(value ?? "").trim();
  return MONGO_OBJECT_ID_RE.test(normalized);
};

export const getAreaId = (area) => {
  if (area == null || area === "") return "";
  if (typeof area === "object") {
    return String(area._id || area.id || "").trim();
  }
  return String(area).trim();
};

export const buildAreaNameLookup = (areas = []) => {
  const lookup = new Map();
  areas.forEach((area) => {
    const areaId = getAreaId(area);
    const areaName = String(area?.name ?? "").trim();
    if (areaId && areaName) {
      lookup.set(areaId, areaName);
    }
  });
  return lookup;
};

/**
 * Resolve area/zone for display. Never returns a raw MongoDB ObjectId.
 */
export const formatAreaDisplay = (area, areaLookup) => {
  if (area == null || area === "") return "";

  if (typeof area === "object" && area !== null) {
    const areaName = String(area.name ?? "").trim();
    if (areaName) return areaName;

    const areaId = getAreaId(area);
    if (areaId && areaLookup instanceof Map && areaLookup.has(areaId)) {
      return areaLookup.get(areaId);
    }
    return areaId && isMongoObjectId(areaId) ? "" : areaId;
  }

  const areaValue = String(area).trim();
  if (!areaValue) return "";

  if (areaLookup instanceof Map && areaLookup.has(areaValue)) {
    return areaLookup.get(areaValue);
  }

  if (isMongoObjectId(areaValue)) return "";

  return areaValue;
};

export const formatAreaDisplayOrDash = (area, areaLookup, fallback = "—") => {
  const formatted = formatAreaDisplay(area, areaLookup);
  return formatted || fallback;
};

export const formatAreaLocation = (
  area,
  location,
  areaLookup,
  separator = ", ",
) => {
  const areaLabel = formatAreaDisplay(area, areaLookup);
  return [areaLabel, location]
    .filter((part) => part != null && String(part).trim() !== "")
    .join(separator);
};
