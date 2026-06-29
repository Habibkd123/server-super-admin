// ─── src/utils/validators.js ──────────────────────────────────────────────────
// Centralised validation helpers used across controllers
// Rules 7, 10, 12, 16, 27

// ─── Section ID Allowlist (Rule 12) ──────────────────────────────────────────
// Only these section IDs are valid in homepageSections
const ALLOWED_SECTION_IDS = new Set([
  'hero',
  'welcome',
  'principal-msg',
  'director-msg',
  'vice-principal-msg',
  'stats',
  'highlights',
  'about',
  'why-us',
  'why-choose-us',
  'academics',
  'curriculum',
  'facilities',
  'achievements',
  'student-life',
  'gallery',
  'video-gallery',
  'testimonials',
  'admissions',
  'news-events',
  'notice-board',
  'news',
  'faq',
  'contact',
  'events',
  'announcements',
  'downloads',
  'mandatory-disclosure',
]);

// ─── Approved Font Families (Rule 10) ────────────────────────────────────────
// Curated list of safe, commonly used Google/system fonts
const ALLOWED_FONT_FAMILIES = new Set([
  // System stack
  'system-ui, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  // Google Fonts — body
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Nunito, sans-serif',
  'Poppins, sans-serif',
  'Raleway, sans-serif',
  'Outfit, sans-serif',
  'DM Sans, sans-serif',
  'Source Sans 3, sans-serif',
  'Mulish, sans-serif',
  'Manrope, sans-serif',
  // Google Fonts — serif / display
  'Playfair Display, serif',
  'Merriweather, serif',
  'Lora, serif',
  'PT Serif, serif',
  // Monospace
  'JetBrains Mono, monospace',
  'Source Code Pro, monospace',
]);

// ─── Color Validation (Rule 8) ───────────────────────────────────────────────
// Accepts: #RGB, #RRGGBB, #RRGGBBAA, rgb(...), rgba(...), hsl(...), hsla(...)
const COLOR_REGEX = /^(#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%(\s*,\s*[\d.]+)?\s*\))$/;

const isValidColor = (value) => {
  if (!value || typeof value !== 'string') return false;
  return COLOR_REGEX.test(value.trim());
};

// ─── Section ID Validation (Rule 12) ─────────────────────────────────────────
const validateSectionIds = (sections) => {
  if (!Array.isArray(sections)) return null;
  const invalid = sections
    .map((s) => s.id)
    .filter((id) => !ALLOWED_SECTION_IDS.has(id) && !id.startsWith('section_'));
  if (invalid.length > 0) {
    return `Invalid section ID(s): ${invalid.join(', ')}. Use only supported section templates.`;
  }
  return null;
};

// ─── Order Uniqueness Validation (Rule 16) ────────────────────────────────────
const validateOrderUniqueness = (items, label = 'items') => {
  if (!Array.isArray(items)) return null;
  const orders = items.map((i) => i.order);
  const seen = new Set();
  const duplicates = [];
  for (const o of orders) {
    if (seen.has(o)) duplicates.push(o);
    seen.add(o);
  }
  if (duplicates.length > 0) {
    return `Duplicate order values found in ${label}: ${[...new Set(duplicates)].join(', ')}. Each item must have a unique display order.`;
  }
  return null;
};

// ─── Font Family Validation (Rule 10) ────────────────────────────────────────
const validateFontFamily = (font) => {
  if (!font) return null; // optional field
  if (!ALLOWED_FONT_FAMILIES.has(font)) {
    return `Font family "${font}" is not approved. Choose from the supported font list.`;
  }
  return null;
};

// ─── String Sanitisation (Rule 27) ───────────────────────────────────────────
// Strip MongoDB operator injection chars ($, .) from plain string fields
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  // Remove leading $ and dots that could be MongoDB operator injections
  return value.replace(/^\$/, '').replace(/\.\$/g, '');
};

// ─── Deep sanitise a request body object (Rule 27) ───────────────────────────
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    // Reject keys that start with $ (MongoDB operators)
    const safeKey = key.startsWith('$') ? `_blocked_${key}` : key;
    const val = obj[key];
    if (typeof val === 'string') {
      clean[safeKey] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      clean[safeKey] = sanitizeObject(val);
    } else if (Array.isArray(val)) {
      clean[safeKey] = val.map((v) =>
        typeof v === 'object' ? sanitizeObject(v) : v
      );
    } else {
      clean[safeKey] = val;
    }
  }
  return clean;
};

module.exports = {
  ALLOWED_SECTION_IDS,
  ALLOWED_FONT_FAMILIES,
  isValidColor,
  validateSectionIds,
  validateOrderUniqueness,
  validateFontFamily,
  sanitizeString,
  sanitizeObject,
};
