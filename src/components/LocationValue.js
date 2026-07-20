import { MapPin } from "lucide-react";
import { toastError } from "../utils/toast";

/**
 * Detects whether a location string is actually a URL (e.g. a Google Maps link).
 */
export const isLocationUrl = (value) => {
  const s = String(value ?? "").trim();
  if (!s) return false;
  return /^https?:\/\//i.test(s) || /^www\./i.test(s);
};

/**
 * Normalises a location URL so it can be opened in a new tab.
 */
export const toOpenableLocationUrl = (value) => {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (/^www\./i.test(s)) return `https://${s}`;
  return s;
};

export const openLocationInNewTab = (value) => {
  const url = toOpenableLocationUrl(value);
  if (!url) return;
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    toastError("Pop-up blocked. Allow pop-ups to open this location.");
  }
};

/**
 * Renders a location value.
 * - When the value is a URL (map link), shows a clickable location pin icon and
 *   opens the map in a new tab — the raw URL is never shown to the user.
 * - Otherwise shows the plain text (with the pin as a subtle prefix).
 */
export default function LocationValue({
  value,
  label = "Location",
  placeholder = "-",
  showIcon = true,
  className = "",
}) {
  const raw = value == null ? "" : String(value).trim();

  if (!raw) {
    return <span className={className}>{placeholder}</span>;
  }

  if (isLocationUrl(raw)) {
    const href = toOpenableLocationUrl(raw);
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${label.toLowerCase()} on map`}
        aria-label={`Open ${label.toLowerCase()} on map`}
        className={`inline-flex items-center gap-1.5 text-primary! hover:underline ${className}`}
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span>View on map</span>
      </a>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showIcon && (
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span>{raw}</span>
    </span>
  );
}
