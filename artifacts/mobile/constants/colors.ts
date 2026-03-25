// ============================================================
// THE DODGE CLUB — Brand Colours
// Replace the placeholder hex codes below with your actual brand colours.
// ============================================================

// [INSERT BRAND PRIMARY]   — used for buttons, highlights, active states
const PRIMARY = "#E63946";

// [INSERT BRAND SECONDARY] — used for accents, cards, secondary elements
const SECONDARY = "#F4A261";

// [INSERT BRAND BACKGROUND] — main background colour
const BACKGROUND = "#0D0D0D";

// [INSERT BRAND ACCENT] — used for badges, medals, special elements
const ACCENT = "#FFD700";

// Supporting colours (derived from brand palette)
const SURFACE = "#1A1A1A";        // card backgrounds
const SURFACE_2 = "#242424";      // elevated surface
const BORDER = "#2E2E2E";         // borders and dividers
const TEXT_PRIMARY = "#FFFFFF";   // main text
const TEXT_SECONDARY = "#A0A0A0"; // secondary / muted text
const TEXT_MUTED = "#666666";     // very muted text
const SUCCESS = "#22C55E";        // success states
const WARNING = "#F59E0B";        // warning states
const ERROR = "#EF4444";          // error states

export default {
  // Brand
  primary: PRIMARY,
  secondary: SECONDARY,
  background: BACKGROUND,
  accent: ACCENT,

  // Surfaces
  surface: SURFACE,
  surface2: SURFACE_2,
  border: BORDER,

  // Text
  text: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,

  // Feedback
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,

  // Tab bar
  tabIconDefault: TEXT_MUTED,
  tabIconSelected: PRIMARY,
  tint: PRIMARY,
};
