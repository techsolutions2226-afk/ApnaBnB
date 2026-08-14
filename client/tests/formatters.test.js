// Client utility smoke tests — run with: npm test (node --test tests)
// Node's built-in test runner against the pure formatters module.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPrice,
  timeAgo,
  formatDate,
  formatLocation,
  formatCity,
} from '../src/utils/formatters.js';

test('formatPrice renders Cr / Lac / plain', () => {
  assert.equal(formatPrice(42000000, { prefix: true }), 'PKR 4.2 Cr');
  assert.equal(formatPrice(8500000), '85.0 Lac');
  assert.equal(formatPrice(5000), '5,000');
});

test('formatDate renders short date', () => {
  assert.equal(formatDate('2025-01-05T00:00:00Z'), 'Jan 5, 2025');
  assert.equal(formatDate(null), '—');
});

test('timeAgo maps recent dates', () => {
  assert.equal(timeAgo(undefined), '—');
  assert.equal(timeAgo(new Date().toISOString()), 'Today');
});

test('formatLocation joins area + city from object', () => {
  assert.equal(formatLocation({ area: 'Gulberg', city: 'Lahore' }), 'Gulberg, Lahore');
  assert.equal(formatLocation('Rawalpindi'), 'Rawalpindi');
});

test('formatCity extracts city from object or string', () => {
  assert.equal(formatCity({ city: 'Karachi' }), 'Karachi');
  assert.equal(formatCity('Islamabad, Pakistan'), 'Islamabad');
});
