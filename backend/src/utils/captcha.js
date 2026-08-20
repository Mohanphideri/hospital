import crypto from 'crypto';

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
const CAPTCHA_TTL_MS = 2 * 60 * 1000; 
const MAX_STORE_SIZE = 5000; 

const challenges = new Map(); 

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
  
  
  
  if (challenges.size > MAX_STORE_SIZE) {
    const excess = challenges.size - MAX_STORE_SIZE;
    const ids = [...challenges.keys()].slice(0, excess);
    ids.forEach((id) => challenges.delete(id));
  }
}

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

export function issueCaptcha() {
  cleanupExpired();

  const id = crypto.randomUUID();
  const code = randomCode();
  challenges.set(id, { codeHash: hashCode(code), expiresAt: Date.now() + CAPTCHA_TTL_MS });

  return { id, svg: renderCaptchaSvg(code) };
}

export function verifyCaptcha(id, answer) {
  if (!id || !answer) return false;
  const entry = challenges.get(id);
  challenges.delete(id); 
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) return false;
  return entry.codeHash === hashCode(String(answer).trim());
}
