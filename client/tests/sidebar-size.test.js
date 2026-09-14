/* Dashboard sidebar sizing — limits, drag snapping and remembered state.
 *
 * Run with: node --test tests/sidebar-size.test.js
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_RAIL_WIDTH,
  clampSidebarWidth,
  resolveSidebarDrag,
  sidebarRenderWidth,
  readSidebarPref,
  writeSidebarPref,
} = await import('../src/utils/sidebarSize.js');

beforeEach(() => store.clear());

test('limits: 220-420 px, rail narrower than the minimum', () => {
  assert.equal(SIDEBAR_MIN_WIDTH, 220);
  assert.equal(SIDEBAR_MAX_WIDTH, 420);
  assert.ok(SIDEBAR_RAIL_WIDTH < SIDEBAR_MIN_WIDTH);
});

test('clampSidebarWidth keeps widths in range and falls back on junk', () => {
  assert.equal(clampSidebarWidth(300, 288), 300);
  assert.equal(clampSidebarWidth(100, 288), 220);
  assert.equal(clampSidebarWidth(900, 288), 420);
  assert.equal(clampSidebarWidth(250.6, 288), 251);
  assert.equal(clampSidebarWidth('abc', 288), 288);
  assert.equal(clampSidebarWidth(undefined, 250), 250);
});

test('dragging below the minimum snaps to the rail and keeps the old width', () => {
  const pref = { width: 330, collapsed: false };
  assert.deepEqual(resolveSidebarDrag(219, pref), { width: 330, collapsed: true });
  assert.deepEqual(resolveSidebarDrag(40, pref), { width: 330, collapsed: true });
});

test('dragging within or past the range opens at the clamped width', () => {
  const railed = { width: 288, collapsed: true };
  assert.deepEqual(resolveSidebarDrag(220, railed), { width: 220, collapsed: false });
  assert.deepEqual(resolveSidebarDrag(360, railed), { width: 360, collapsed: false });
  assert.deepEqual(resolveSidebarDrag(1200, railed), { width: 420, collapsed: false });
});

test('render width is the rail when collapsed', () => {
  assert.equal(sidebarRenderWidth({ width: 300, collapsed: false }), 300);
  assert.equal(sidebarRenderWidth({ width: 300, collapsed: true }), SIDEBAR_RAIL_WIDTH);
});

test('preferences round-trip and are sanitised on read', () => {
  assert.deepEqual(readSidebarPref('k', 288), { width: 288, collapsed: false });
  writeSidebarPref('k', { width: 333, collapsed: true });
  assert.deepEqual(readSidebarPref('k', 288), { width: 333, collapsed: true });
  store.set('k', JSON.stringify({ width: 9999, collapsed: 'yes' }));
  assert.deepEqual(readSidebarPref('k', 288), { width: 420, collapsed: false });
  store.set('k', '{broken');
  assert.deepEqual(readSidebarPref('k', 250), { width: 250, collapsed: false });
});

test('blocked storage never throws', () => {
  const saved = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  try {
    assert.deepEqual(readSidebarPref('k', 288), { width: 288, collapsed: false });
    assert.doesNotThrow(() => writeSidebarPref('k', { width: 300, collapsed: false }));
  } finally {
    globalThis.localStorage = saved;
  }
});
