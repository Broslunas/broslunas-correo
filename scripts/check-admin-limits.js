const assert = require('assert');

// 1. Quota calculation test
function calculatePercentUsed(usedBytes, storageLimitMB) {
  if (!storageLimitMB || storageLimitMB <= 0) return null;
  const limitBytes = storageLimitMB * 1024 * 1024;
  return Math.min(100, Number(((usedBytes / limitBytes) * 100).toFixed(1)));
}

// 50MB used out of 100MB limit => 50%
assert.strictEqual(calculatePercentUsed(50 * 1024 * 1024, 100), 50.0);
// Unlimited => null
assert.strictEqual(calculatePercentUsed(50 * 1024 * 1024, 0), null);
// Over limit capped at 100%
assert.strictEqual(calculatePercentUsed(150 * 1024 * 1024, 100), 100.0);

// 2. Daily send limit enforcement test
function isSendAllowed(sentToday, dailySendLimit, status) {
  if (status === 'suspended') return { allowed: false, status: 403 };
  if (dailySendLimit > 0 && sentToday >= dailySendLimit) return { allowed: false, status: 429 };
  return { allowed: true, status: 200 };
}

assert.deepStrictEqual(isSendAllowed(10, 10, 'active'), { allowed: false, status: 429 });
assert.deepStrictEqual(isSendAllowed(5, 10, 'active'), { allowed: true, status: 200 });
assert.deepStrictEqual(isSendAllowed(0, 0, 'suspended'), { allowed: false, status: 403 });
assert.deepStrictEqual(isSendAllowed(100, 0, 'active'), { allowed: true, status: 200 });

console.log('All admin storage & limits logic self-checks passed.');
