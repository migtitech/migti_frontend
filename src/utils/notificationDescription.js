/**
 * Fallback parser for legacy/plain notification description strings.
 * Prefer structured metadata.displayFields from the backend when available.
 * @see getNotificationDisplayContent in notificationDisplay.js
 */
export const parseNotificationDescription = (description) => {
  const text = String(description || "").trim();
  if (!text) return { intro: "", lines: [] };

  const segments = text
    .split(/\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const lines = [];
  let intro = "";

  for (const segment of segments) {
    const normalized = segment.replace(/\.$/, "").trim();
    const colonIndex = normalized.indexOf(":");

    const isKeyValue =
      colonIndex > 0 &&
      colonIndex <= 48 &&
      !normalized.slice(0, colonIndex).includes("(");

    if (isKeyValue) {
      const label = normalized.slice(0, colonIndex).trim();
      const value = normalized.slice(colonIndex + 1).trim();
      if (label && value) {
        lines.push({ label, value });
        continue;
      }
    }

    if (!intro) {
      intro = normalized;
    } else {
      lines.push({ label: "", value: normalized });
    }
  }

  if (!lines.length && intro) {
    return { intro: "", lines: [{ label: "", value: intro }] };
  }

  return { intro, lines };
};
