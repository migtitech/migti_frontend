/**
 * JS-side mirror of the CSS custom properties in src/scss/_tokens.scss.
 * Use these instead of hardcoded hex values wherever a color is needed as
 * a JS value (e.g. inline `style` props) rather than a CSS class.
 * Keep in sync with src/scss/_tokens.scss.
 */
export const DESIGN_TOKENS = {
  primary: {
    50: "#eff4ff",
    100: "#d1e0ff",
    500: "#2970ff",
    600: "#2563eb",
    700: "#1849a9",
  },
  gray: {
    25: "#fcfcfd",
    50: "#f9fafb",
    100: "#f2f4f7",
    200: "#eaecf0",
    300: "#d0d5dd",
    400: "#98a2b3",
    500: "#667085",
    600: "#475467",
    700: "#344054",
    800: "#1d2939",
    900: "#101828",
  },
  success: { 50: "#ecfdf3", 500: "#12b76a", 600: "#027a48" },
  warning: { 50: "#fffaeb", 500: "#f79009", 600: "#b54708" },
  danger: { 50: "#fef3f2", 500: "#f04438", 600: "#d92d20" },
  info: { 50: "#eff8ff", 500: "#2e90fa", 600: "#175cd3" },
};

// Shared style object for sidebar count badges (was previously duplicated
// as a local const in AppSidebar.js).
export const SIDEBAR_BADGE_STYLE_NEUTRAL = {
  backgroundColor: DESIGN_TOKENS.primary[600],
  color: "#ffffff",
};

export const SIDEBAR_BADGE_STYLE_URGENT = {
  backgroundColor: DESIGN_TOKENS.danger[500],
  color: "#ffffff",
};
