import { parseNotificationDescription } from "./notificationDescription";

export const NOTIFICATION_GRID_COLUMNS = 3;
export const NOTIFICATION_GRID_COL_SIZE = Math.floor(
  12 / NOTIFICATION_GRID_COLUMNS,
);

const normalizeField = (field) => {
  if (!field?.label) return null;
  return {
    label: String(field.label).trim(),
    value: String(field.value ?? "—").trim() || "—",
  };
};

/**
 * Parse structured notification description from the single `description` field.
 * Supports JSON payload from backend; falls back to legacy plain-text parsing.
 */
export const parseStructuredNotificationDescription = (description) => {
  const raw = String(description || "").trim();
  if (!raw || !raw.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.fields)
    ) {
      return null;
    }

    const lines = parsed.fields.map(normalizeField).filter(Boolean);
    return {
      intro: String(parsed.intro || "").trim(),
      lines,
    };
  } catch {
    return null;
  }
};

/**
 * Central display model for any notification (list, flash, socket payload).
 * Reads only `notification.description` — one field for all notification types.
 */
export const getNotificationDisplayContent = (notification = {}) => {
  const description = notification?.description || "";

  const structured = parseStructuredNotificationDescription(description);
  if (structured?.lines?.length) {
    return structured;
  }

  const parsed = parseNotificationDescription(description);
  if (parsed.lines.length) {
    return parsed;
  }

  const text = String(description || "").trim();
  return {
    intro: parsed.intro || "",
    lines: text ? [{ label: "", value: text }] : [],
  };
};
