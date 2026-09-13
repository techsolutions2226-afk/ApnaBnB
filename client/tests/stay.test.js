/* Tenant stay model — Hourly / Nightly / Monthly / Yearly.
 *
 * Run with: node --test tests/stay.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STAY,
  selectStayPeriod,
  selectStayDay,
  setStayDuration,
  setStayStartHour,
  clearStayDates,
  formatStay,
  formatHour,
  stayLeaseMonths,
  stayToParams,
  stayFromParams,
} from '../src/utils/stay.js';
import { addMonthsClamped, toDateKey } from '../src/utils/dateRange.js';

const d = (y, m, day) => new Date(y, m - 1, day);
const params = (pairs) => new URLSearchParams(pairs);

test('choosing a period sets its default duration', () => {
  assert.equal(selectStayPeriod(EMPTY_STAY, 'hourly').duration, 2);
  assert.equal(selectStayPeriod(EMPTY_STAY, 'nightly').duration, 0);
  assert.equal(selectStayPeriod(EMPTY_STAY, 'yearly').duration, 1);
  assert.equal(selectStayPeriod(EMPTY_STAY, 'bogus'), EMPTY_STAY);
});

test('nightly picks a check-in / check-out range', () => {
  let s = selectStayPeriod(EMPTY_STAY, 'nightly');
  s = selectStayDay(s, d(2026, 10, 5));
  s = selectStayDay(s, d(2026, 10, 20));
  assert.equal(s.checkIn, '2026-10-05');
  assert.equal(s.checkOut, '2026-10-20');
  assert.equal(formatStay(s), 'Oct 5 – Oct 20');
  assert.equal(stayLeaseMonths(s), null);
});

test('monthly derives the move-out date from move-in + months', () => {
  let s = selectStayPeriod(EMPTY_STAY, 'monthly');
  s = selectStayDay(s, d(2026, 10, 5));
  s = setStayDuration(s, 3);
  assert.equal(s.checkOut, '2027-01-05');
  assert.equal(formatStay(s), 'Oct 5 · 3 months');
  assert.equal(stayLeaseMonths(s), 3);
  assert.equal(setStayDuration(s, 99).duration, 11, 'clamped to max');
  assert.equal(setStayDuration(s, 0).duration, 1, 'clamped to min');
});

test('yearly counts years and compares in months', () => {
  let s = selectStayPeriod(EMPTY_STAY, 'yearly');
  s = setStayDuration(selectStayDay(s, d(2026, 10, 5)), 2);
  assert.equal(s.checkOut, '2028-10-05');
  assert.equal(formatStay(s), 'Oct 5 · 2 years');
  assert.equal(stayLeaseMonths(s), 24);
});

test('hourly = one date + start hour + hours', () => {
  let s = selectStayPeriod(EMPTY_STAY, 'hourly');
  s = selectStayDay(s, d(2026, 10, 5));
  assert.equal(formatStay(s), 'Oct 5');
  s = setStayStartHour(s, 10);
  assert.equal(formatStay(s), 'Oct 5 · 10 AM – 12 PM');
  assert.equal(s.checkOut, '');
  assert.equal(formatHour(0), '12 AM');
  assert.equal(formatHour(23 + 2), '1 AM');
});

test('switching period keeps move-in, clearing keeps period', () => {
  let s = selectStayDay(selectStayPeriod(EMPTY_STAY, 'nightly'), d(2026, 10, 5));
  s = selectStayPeriod(s, 'monthly');
  assert.equal(s.checkIn, '2026-10-05');
  assert.equal(s.checkOut, '2026-11-05');
  const cleared = clearStayDates(s);
  assert.equal(cleared.period, 'monthly');
  assert.equal(cleared.checkIn, '');
});

test('stay round-trips through the URL', () => {
  let s = setStayStartHour(selectStayDay(selectStayPeriod(EMPTY_STAY, 'hourly'), d(2026, 10, 5)), 9);
  assert.deepEqual(stayFromParams(params(stayToParams(s))), s);
  s = setStayDuration(selectStayDay(selectStayPeriod(EMPTY_STAY, 'monthly'), d(2026, 1, 31)), 1);
  assert.deepEqual(stayFromParams(params(stayToParams(s))), s);
  assert.deepEqual(stayToParams(EMPTY_STAY), []);
});

test('tampered or legacy URLs are handled', () => {
  assert.deepEqual(stayFromParams(params({ stay: 'weekly' })), EMPTY_STAY);
  const s = stayFromParams(params({ stay: 'monthly', checkIn: 'nope', duration: '500' }));
  assert.equal(s.checkIn, '');
  assert.equal(s.duration, 11);
  const legacy = stayFromParams(params({ checkIn: '2026-10-05', checkOut: '2026-10-20' }));
  assert.equal(legacy.period, 'nightly');
  assert.equal(legacy.checkOut, '2026-10-20');
});

test('month math clamps to the end of short months', () => {
  assert.equal(toDateKey(addMonthsClamped(d(2026, 1, 31), 1)), '2026-02-28');
  assert.equal(toDateKey(addMonthsClamped(d(2028, 2, 29), 12)), '2029-02-28');
});
