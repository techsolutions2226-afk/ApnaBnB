/* Tenant stay model — Hourly / Nightly / Few nights / Monthly / Yearly.
 *
 * Run with: node --test tests/stay.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STAY,
  selectStayPeriod,
  selectStayDay,
  selectStayHour,
  setStayTime,
  setStayDuration,
  clearStayDates,
  formatStay,
  formatHour,
  stayHours,
  stayNights,
  stayLeaseMonths,
  stayToParams,
  stayFromParams,
} from '../src/utils/stay.js';
import { addMonthsClamped, nextRange, toDateKey } from '../src/utils/dateRange.js';

const d = (y, m, day) => new Date(y, m - 1, day);
const params = (pairs) => new URLSearchParams(pairs);
const LATER = d(2026, 9, 1); // "now" before every date used below
const pick = (id) => selectStayPeriod(EMPTY_STAY, id);

test('choosing a period sets its default count', () => {
  assert.equal(pick('monthly').duration, 1);
  assert.equal(pick('yearly').duration, 0, 'yearly waits for a number to be picked');
  assert.equal(pick('hourly').duration, 0);
  assert.equal(selectStayPeriod(EMPTY_STAY, 'bogus'), EMPTY_STAY);
});

test('shared range rule: allowSame=false ignores a second click on the start', () => {
  assert.deepEqual(nextRange(5, null, 5, { allowSame: false }), { start: 5, end: null });
  assert.deepEqual(nextRange(5, null, 10, { allowSame: false }), { start: 5, end: 10 });
  assert.deepEqual(nextRange(5, 10, 7), { start: 7, end: null });
  assert.deepEqual(nextRange(5, null, 5), { start: 5, end: 5 });
});

test('nightly picks a check-in / check-out range of at least one night', () => {
  let s = selectStayDay(pick('nightly'), d(2026, 10, 5), LATER);
  s = selectStayDay(s, d(2026, 10, 5), LATER);
  assert.equal(s.checkOut, '', 'same day is not a night');
  s = selectStayDay(s, d(2026, 10, 8), LATER);
  assert.equal(formatStay(s), 'Oct 5 – Oct 8');
  assert.equal(stayNights(s), 3);
  assert.equal(stayLeaseMonths(s), null);
});

test('few nights = date range + check-in time + check-out time', () => {
  let s = selectStayDay(pick('few-nights'), d(2026, 10, 5), LATER);
  s = setStayTime(s, 'startHour', 14);
  assert.equal(formatStay(s), 'Oct 5, 2 PM');
  s = selectStayDay(s, d(2026, 10, 8), LATER);
  s = setStayTime(s, 'endHour', 11);
  assert.equal(formatStay(s), 'Oct 5, 2 PM – Oct 8, 11 AM');
  assert.equal(formatStay(s, { compact: true }), 'Oct 5 – Oct 8', 'search bar shows dates only');
  assert.equal(setStayTime(s, 'endHour', 11).endHour, null, 'clicking the chosen time again clears it');
  assert.equal(setStayTime(s, 'nope', 3), s);
});

test('hourly = one day + start → end hour range', () => {
  let s = selectStayDay(pick('hourly'), d(2026, 10, 5), LATER);
  s = selectStayHour(s, 17);
  assert.equal(formatStay(s), 'Oct 5 · from 5 PM');
  s = selectStayHour(s, 22);
  assert.equal(formatStay(s), 'Oct 5 · 5 PM – 10 PM');
  assert.equal(stayHours(s), 5);
  s = selectStayHour(s, 9);
  assert.deepEqual([s.startHour, s.endHour], [9, null], 'click after a full range restarts');
  assert.equal(formatHour(24), '12 AM');
});

test('picking today drops a start time that has already begun', () => {
  const now = d(2026, 10, 5);
  now.setHours(15);
  let s = selectStayHour(selectStayHour(selectStayDay(pick('hourly'), d(2026, 10, 6), now), 10), 12);
  s = selectStayDay(s, d(2026, 10, 5), now);
  assert.deepEqual([s.startHour, s.endHour], [null, null]);
  let f = setStayTime(setStayTime(selectStayDay(pick('few-nights'), d(2026, 10, 6), now), 'startHour', 9), 'endHour', 11);
  f = selectStayDay(selectStayDay(f, d(2026, 10, 7), now), d(2026, 10, 5), now);
  assert.deepEqual([f.startHour, f.endHour], [null, 11], 'check-out time is kept');
});

test('monthly derives the move-out date from move-in + months', () => {
  let s = setStayDuration(selectStayDay(pick('monthly'), d(2026, 10, 5), LATER), 3);
  assert.equal(s.checkOut, '2027-01-05');
  assert.equal(formatStay(s), 'Oct 5 · 3 months');
  assert.equal(stayLeaseMonths(s), 3);
  assert.equal(setStayDuration(s, 99).duration, 11);
  assert.equal(setStayDuration(s, 0).duration, 1);
});

test('yearly is just a number of years — no dates', () => {
  let s = selectStayPeriod(selectStayDay(pick('monthly'), d(2026, 10, 5), LATER), 'yearly');
  assert.equal(s.checkIn, '', 'yearly drops the move-in day');
  assert.equal(formatStay(s), '');
  s = setStayDuration(s, 3);
  assert.equal(formatStay(s), '3 years');
  assert.equal(stayLeaseMonths(s), 36);
  assert.equal(selectStayDay(s, d(2026, 10, 5), LATER), s, 'no calendar');
});

test('switching keeps what still applies; clearing keeps the period', () => {
  let s = selectStayDay(selectStayDay(pick('nightly'), d(2026, 10, 5), LATER), d(2026, 10, 8), LATER);
  const few = selectStayPeriod(s, 'few-nights');
  assert.deepEqual([few.checkIn, few.checkOut], ['2026-10-05', '2026-10-08'], 'range → range keeps both days');
  const monthly = selectStayPeriod(s, 'monthly');
  assert.deepEqual([monthly.checkIn, monthly.checkOut], ['2026-10-05', '2026-11-05']);
  const cleared = clearStayDates(few);
  assert.deepEqual([cleared.period, cleared.checkIn, cleared.checkOut], ['few-nights', '', '']);
});

test('every period round-trips through the URL', () => {
  const stays = [
    selectStayHour(selectStayHour(selectStayDay(pick('hourly'), d(2026, 10, 5), LATER), 17), 24),
    selectStayDay(selectStayDay(pick('nightly'), d(2026, 10, 5), LATER), d(2026, 10, 8), LATER),
    setStayTime(setStayTime(selectStayDay(selectStayDay(pick('few-nights'), d(2026, 10, 5), LATER), d(2026, 10, 8), LATER), 'startHour', 14), 'endHour', 11),
    setStayDuration(selectStayDay(pick('monthly'), d(2026, 1, 31), LATER), 1),
    setStayDuration(pick('yearly'), 4),
  ];
  for (const s of stays) assert.deepEqual(stayFromParams(params(stayToParams(s))), s, s.period);
  assert.deepEqual(stayToParams(EMPTY_STAY), []);
});

test('tampered or legacy URLs are handled', () => {
  assert.deepEqual(stayFromParams(params({ stay: 'weekly' })), EMPTY_STAY);
  const m = stayFromParams(params({ stay: 'monthly', checkIn: 'nope', duration: '500' }));
  assert.deepEqual([m.checkIn, m.duration], ['', 1]);
  const h = stayFromParams(params({ stay: 'hourly', checkIn: '2026-10-05', startHour: '20', endHour: '19' }));
  assert.deepEqual([h.startHour, h.endHour], [20, null], 'end must be after start');
  const n = stayFromParams(params({ stay: 'nightly', checkIn: '2026-10-08', checkOut: '2026-10-05' }));
  assert.equal(n.checkOut, '', 'check-out must be after check-in');
  const y = stayFromParams(params({ stay: 'yearly', checkIn: '2026-10-05', duration: '2' }));
  assert.deepEqual([y.checkIn, y.duration], ['', 2]);
  const legacy = stayFromParams(params({ checkIn: '2026-10-05', checkOut: '2026-10-20' }));
  assert.deepEqual([legacy.period, legacy.checkOut], ['nightly', '2026-10-20']);
});

test('month math clamps to the end of short months', () => {
  assert.equal(toDateKey(addMonthsClamped(d(2026, 1, 31), 1)), '2026-02-28');
  assert.equal(toDateKey(addMonthsClamped(d(2028, 2, 29), 12)), '2029-02-28');
});
