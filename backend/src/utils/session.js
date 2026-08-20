import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';
import { generateAccessToken } from './jwt.js';

export const REFRESH_COOKIE_NAME = 'hs_refresh';

const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS || 30);

const SECURE = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
const SAME_SITE = (process.env.COOKIE_SAME_SITE || (SECURE ? 'none' : 'lax')).toLowerCase();

function randomTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: SECURE,
    sameSite: SAME_SITE,
    path: '/api/auth', 
    maxAge: maxAgeMs,
  };
}

export async function issueSession(req, res, payload, role) {
  const accessToken = generateAccessToken(payload);

  const refreshValue = randomTokenValue();
  const tokenHash = hashToken(refreshValue);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: payload._id,
    role,
    tokenHash,
    expiresAt,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshValue, cookieOptions(REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000));

  return accessToken;
}

// Rotates a refresh token: looks up the presented cookie value, atomically
// consumes it (only if it is still unrevoked and unexpired), and returns the
// pre-consumption record so the caller can look up the user and issue a new
// access+refresh pair. Returns null if the presented token is missing,
// expired, or already consumed (caller should 401 and clear the cookie).
//
// The consume step is a single findOneAndUpdate keyed on tokenHash +
// revokedAt:null + an unexpired condition - only the one request whose
// update actually flips revokedAt from null to a timestamp "wins" the
// token. This closes a race where two concurrent refresh requests using the
// same refresh cookie could both read the token as still-valid (via a plain
// findOne) before either one revoked it, letting both mint a valid
// replacement session from what should be a one-time-use credential.
//
// If a token that was already revoked (i.e. already consumed by a prior
// rotation, concurrent or not) is presented again, that's a signal of

export async function rotateRefreshToken(req, res) {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const now = new Date();

  const consumed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, lastUsedAt: now } },
    { new: false } 
  );

  if (consumed) {
    return consumed;
  }

  
  
  
  
  
  
  
  const existing = await RefreshToken.findOne({ tokenHash });
  if (existing?.revokedAt) {
    await RefreshToken.updateMany(
      { userId: existing.userId, revokedAt: null },
      { revokedAt: now }
    );
    clearSessionCookie(res);
  }

  return null;
}

export async function revokeRefreshRecord(record, newHash = null) {
  record.revokedAt = new Date();
  if (newHash) record.replacedByHash = newHash;
  await record.save();
}

export function clearSessionCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

export { randomTokenValue };
