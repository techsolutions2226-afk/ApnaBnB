/* Date-range helpers behind the Tenant "When" picker and the reservation
 * calendars.
 *
 * Run with: node --test tests/date-range.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextDateRange, toDateKey, fromDateKey } from '../src/utils/dateRange.js';

const d = (y, m, day) => new Date(y, m - 1, day);

test('first click starts a range', () => {
  assert.deepEqual(nextDateRange(null, null, d(2026, 9, 20)), { start: d(2026, 9, 20), end: null });
});

test('second click after start sets the end', () => {
  assert.deepEqual(nextDateRange(d(2026, 9, 20), null, d(2026, 10, 5)), {
    start: d(2026, 9, 20),
    end: d(2026, 10, 5),
  });
});

test('click before start restarts; click after a full range restarts', () => {
  assert.deepEqual(nextDateRange(d(2026, 9, 20), null, d(2026, 9, 10)), { start: d(2026, 9, 10), end: null });
  assert.deepEqual(nextDateRange(d(2026, 9, 20), d(2026, 9, 25), d(2026, 9, 30)), {
    start: d(2026, 9, 30),
    end: null,
  });
});

test('date keys round-trip in local time', () => {
  assert.equal(toDateKey(d(2026, 1, 5)), '2026-01-05');
  assert.equal(toDateKey(null), '');
  assert.deepEqual(fromDateKey('2026-01-05'), d(2026, 1, 5));
  assert.equal(fromDateKey(''), null);
  assert.equal(fromDateKey('05/01/2026'), null);
});
