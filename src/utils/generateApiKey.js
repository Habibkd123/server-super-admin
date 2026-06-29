// ─── src/utils/generateApiKey.js ─────────────────────────────────────────────
// Generates a cryptographically secure random API key using nanoid
// nanoid v3 uses CommonJS — import with require

const { nanoid } = require('nanoid');

/**
 * Generates a random API key string.
 * Format: tk_<40 random chars>
 * This is the PLAIN TEXT key — shown to admin only once.
 * Caller must bcrypt hash it before storing.
 */
const generateApiKey = () => {
  return `tk_${nanoid(40)}`;
};

module.exports = { generateApiKey };
