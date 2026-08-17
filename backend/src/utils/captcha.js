import crypto from 'crypto';

// The previous captcha (utils/simpleCaptcha.js on the frontend) generated
// its code AND checked it entirely in the browser - a direct API call could
// just skip the form and post straight to the endpoint, making it a UX
// speed bump rather than a security control. This version generates the
// code here, renders it as an SVG image (so the plaintext code is never
// present anywhere in the API response), and verifies + consumes it
// server-side, single-use, before the protected action runs.
//
// Storage: in-memory Map, same trade-off noted in middleware/rateLimit.js -
// fine for one instance, would need a shared store (Redis) for a
// multi-instance deployment so a challenge issued by instance A can still be
// verified by instance B.
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
const CAPTCHA_TTL_MS = 2 * 60 * 1000; // 2 minutes to solve it
const MAX_STORE_SIZE = 5000; // crude memory-growth guard, see cleanup below

const challenges = new Map(); // id -> { codeHash, expiresAt }

function randomCode(length = 5) {
  return Array.from(
    { length },
    () => CAPTCHA_CHARS[crypto.randomInt(0, CAPTCHA_CHARS.length)]
  ).join('');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

function cleanupExpired() {
  const now = Date.now();
  for (const [id, entry] of challenges) {
    if (entry.expiresAt < now) challenges.delete(id);
  }
  // If something's gone wrong and expired cleanup isn't keeping up (e.g. a
  // burst of abandoned challenges), hard-cap total memory use by dropping
  // the oldest entries rather than growing unbounded.
  if (challenges.size > MAX_STORE_SIZE) {
    const excess = challenges.size - MAX_STORE_SIZE;
    const ids = [...challenges.keys()].slice(0, excess);
    ids.forEach((id) => challenges.delete(id));
  }
}

// Renders the code as a simple distorted SVG - random per-character
// rotation/offset plus noise lines, enough to defeat trivial text scraping
// without pulling in an image-processing dependency.
function renderCaptchaSvg(code) {
  const width = 150;
  const height = 50;
  const chars = code
    .split('')
    .map((ch, i) => {
      const x = 15 + i * 26;
      const y = 32 + (crypto.randomInt(-6, 7));
      const rotate = crypto.randomInt(-25, 26);
      const gray = 40 + crypto.randomInt(0, 40);
      return `<text x="${x}" y="${y}" font-family="monospace" font-size="26" font-weight="bold" fill="rgb(${gray},${gray},${gray})" transform="rotate(${rotate} ${x} ${y})">${ch}</text>`;
    })
    .join('');

  const noiseLines = Array.from({ length: 5 }, () => {
    const x1 = crypto.randomInt(0, width);
    const y1 = crypto.randomInt(0, height);
    const x2 = crypto.randomInt(0, width);
    const y2 = crypto.randomInt(0, height);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(15,31,61,0.15)" stroke-width="1.5"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#f1f5f9"/>${noiseLines}${chars}</svg>`;
}

// Issues a new challenge: generates the code, stores only its hash (so even
// reading this server's memory doesn't hand over the plaintext), returns an
// id + the rendered SVG for the client to display.
export function issueCaptcha() {
  cleanupExpired();

  const id = crypto.randomUUID();
  const code = randomCode();
  challenges.set(id, { codeHash: hashCode(code), expiresAt: Date.now() + CAPTCHA_TTL_MS });

  return { id, svg: renderCaptchaSvg(code) };
}

// Verifies and CONSUMES (single-use, regardless of outcome) a challenge.
// Returns true/false.
export function verifyCaptcha(id, answer) {
  if (!id || !answer) return false;
  const entry = challenges.get(id);
  challenges.delete(id); // single-use no matter what happens below
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) return false;
  return entry.codeHash === hashCode(String(answer).trim());
}
