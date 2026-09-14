/* The visitor's real IP behind a proxy.
 *
 * Without `trust proxy`, Express reports the PROXY's address for every
 * request, so every visitor is located in the same place — this is what made
 * a Lahore visitor see Islamabad rows first. These tests pin the setting and
 * the diagnostics that make a wrong IP visible.
 *
 * Run with: npm test (node --test tests)
 */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { describeRequestIp } = require('../utils/ipGeolocation');

const LAHORE = '39.45.0.1';
const savedEnv = { ...process.env };

/* index.js' rule, kept in step with it. */
const trustProxySetting = () => {
  const raw = String(process.env.TRUST_PROXY ?? '').trim().toLowerCase();
  if (raw === '') return process.env.NODE_ENV === 'production' ? 1 : 0;
  if (['0', 'false', 'off', 'no'].includes(raw)) return 0;
  if (['1', 'true', 'on', 'yes'].includes(raw)) return 1;
  const hops = Number.parseInt(raw, 10);
  return Number.isFinite(hops) && hops > 0 ? hops : 1;
};

/* Start a tiny app configured like index.js and ask it what IP it sees. */
const seenIp = async () => {
  const app = express();
  const trust = trustProxySetting();
  if (trust) app.set('trust proxy', trust);
  app.get('/ip', (req, res) => res.json({ ip: req.ip, diagnostics: describeRequestIp(req) }));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/ip`, {
      headers: { 'X-Forwarded-For': LAHORE },
    });
    return await res.json();
  } finally {
    server.close();
  }
};

beforeEach(() => {
  delete process.env.TRUST_PROXY;
  delete process.env.GEO_DEV_IP;
  process.env.NODE_ENV = 'development';
});

afterEach(() => {
  process.env = { ...savedEnv };
});

test('production trusts one proxy hop: the visitor IP is used, not the proxy', async () => {
  process.env.NODE_ENV = 'production';
  const { ip, diagnostics } = await seenIp();
  assert.equal(ip, LAHORE);
  assert.equal(diagnostics.publicIp, true);
  assert.equal(diagnostics.proxyTrusted, true);
});

test('TRUST_PROXY=1 fixes a proxied non-production deploy (the reported bug)', async () => {
  const before = await seenIp();
  assert.notEqual(before.ip, LAHORE, 'without trust proxy req.ip is the proxy address');
  assert.equal(before.diagnostics.forwardedHeader, true, 'the real IP was in the header all along');
  // Location reads the forwarded header itself, so it works even so.
  assert.equal(before.diagnostics.publicIp, true);

  process.env.TRUST_PROXY = '1';
  const after = await seenIp();
  assert.equal(after.ip, LAHORE);
  assert.equal(after.diagnostics.publicIp, true);
});

test('TRUST_PROXY accepts hop counts and can be forced off in production', async () => {
  process.env.TRUST_PROXY = '2';
  assert.equal(trustProxySetting(), 2);

  process.env.NODE_ENV = 'production';
  process.env.TRUST_PROXY = 'false';
  assert.equal(trustProxySetting(), 0);
  const { ip } = await seenIp();
  assert.notEqual(ip, LAHORE, 'explicitly disabled: header ignored');
});

test('diagnostics never expose the address itself', async () => {
  process.env.TRUST_PROXY = '1';
  const { diagnostics } = await seenIp();
  const text = JSON.stringify(diagnostics);
  assert.ok(!text.includes(LAHORE), 'diagnostics must not contain the IP');
  assert.deepEqual(Object.keys(diagnostics).sort(), [
    'forwardedHeader', 'nodeEnv', 'proxyTrusted', 'publicIp', 'usingDevIp', 'usingMachineIp',
  ]);
});
