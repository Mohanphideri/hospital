import rateLimit from 'express-rate-limit';

// Section 5: every public/unauthenticated endpoint gets an IP-keyed sliding-
// window rate limit. This is on TOP OF (not instead of) the per-phone/email
// limiting already built into authController's OTP flows - IP limiting stops
// one attacker hammering the endpoint regardless of which victim they target;
// phone/email limiting stops targeting one specific victim from many IPs.
// Both are needed.
//
// NOTE on scaling: express-rate-limit's default store is in-memory, same as
// this app's other in-memory limiters (chatbot, OTP buckets). That's fine for
// a single server instance. If this deployment ever runs more than one
// instance behind a load balancer, swap the store for a Redis-backed one
// (`rate-limit-redis`) so limits are shared across instances - otherwise an
// attacker just gets N times the allowance by hitting different instances.
// Flagging this now per the directive's own suggestion; not implemented here
// since it needs a Redis connection this environment doesn't have configured.

const standardHandler = (req, res) => {
  res.status(429).json({ error: 'Too many requests - please slow down and try again shortly.' });
};

// Login attempts (staff username/password): 20 attempts / 15 min per IP.
// Deliberately looser than the per-account lockout (5 attempts -> 15 min
// lock, see authController.staffLogin) - this layer exists to stop
// credential-stuffing across many different usernames from one IP, not to
// duplicate the per-account lockout.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

// OTP send/verify (patient login, ambulance phone verification): 10 / 10 min per IP.
export const otpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

// Password reset request/verify: 10 / hour per IP.
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

// Emergency ambulance request: intentionally the most generous limit here -
// a real mass-casualty event could mean several legitimate requests from the
// same network (a office, a building) in a short window, and the whole point
// of this form is that it must never block a genuine emergency. Still capped
// well above any plausible legitimate burst so it isn't a wide-open spam vector.
export const ambulanceRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

// Public chatbot "ask a question": 30 / min per IP. Replaces the ad-hoc
// in-memory limiter that used to live inside chatbotController.js with the
// same standard middleware used everywhere else.
export const chatbotRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

// New captcha challenge issuance: cheap to abuse (fills memory with unused
// challenges) if unlimited - 30/min per IP is generous for real usage.
export const captchaRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});
