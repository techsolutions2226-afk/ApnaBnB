/* Translation integrity.
 *
 * The failure mode for i18n is not a crash — it is a key that exists in
 * English and quietly falls back to English on the Urdu page, so the bug ships
 * looking "mostly translated". These tests compare the two locales key by key
 * so a missed string fails the build instead of the user finding it.
 *
 * Run with: node --test tests/i18n.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const LOCALES = path.join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const BASE = 'en';

const read = (lang, ns) =>
  JSON.parse(fs.readFileSync(path.join(LOCALES, lang, `${ns}.json`), 'utf8'));

const languages = fs.readdirSync(LOCALES).filter((entry) =>
  fs.statSync(path.join(LOCALES, entry)).isDirectory(),
);

const namespaces = fs
  .readdirSync(path.join(LOCALES, BASE))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

/* Flattens { a: { b: "x" } } to ["a.b"] so two locales can be diffed as sets
   rather than compared structurally. */
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value, full)
      : [full];
  });

test('every language has every namespace file', () => {
  for (const lang of languages) {
    for (const ns of namespaces) {
      const file = path.join(LOCALES, lang, `${ns}.json`);
      assert.ok(fs.existsSync(file), `${lang}/${ns}.json is missing`);
    }
  }
});

test('no language is missing a key that English has', () => {
  for (const ns of namespaces) {
    const expected = flatten(read(BASE, ns)).sort();

    for (const lang of languages) {
      if (lang === BASE) continue;
      const actual = flatten(read(lang, ns)).sort();

      const missing = expected.filter((key) => !actual.includes(key));
      assert.deepEqual(
        missing, [],
        `${lang}/${ns}.json is missing: ${missing.join(', ')}`,
      );
    }
  }
});

test('no language has a key English does not (a typo or a dead string)', () => {
  for (const ns of namespaces) {
    const expected = flatten(read(BASE, ns));

    for (const lang of languages) {
      if (lang === BASE) continue;
      const extra = flatten(read(lang, ns)).filter((key) => !expected.includes(key));
      assert.deepEqual(
        extra, [],
        `${lang}/${ns}.json has keys English does not: ${extra.join(', ')}`,
      );
    }
  }
});

test('no translated value is empty or left as English placeholder text', () => {
  const values = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([key, value]) => {
      const full = prefix ? `${prefix}.${key}` : key;
      return value && typeof value === 'object' && !Array.isArray(value)
        ? values(value, full)
        : [[full, value]];
    });

  for (const ns of namespaces) {
    for (const lang of languages) {
      for (const [key, value] of values(read(lang, ns))) {
        assert.ok(
          typeof value === 'string' && value.trim().length > 0,
          `${lang}/${ns}.json ${key} is empty`,
        );
        assert.ok(
          !/^TODO/i.test(value),
          `${lang}/${ns}.json ${key} is still a placeholder`,
        );
      }
    }
  }
});

test('interpolation placeholders match across languages', () => {
  const placeholders = (value) =>
    [...String(value).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

  const entries = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([key, value]) => {
      const full = prefix ? `${prefix}.${key}` : key;
      return value && typeof value === 'object' && !Array.isArray(value)
        ? entries(value, full)
        : [[full, value]];
    });

  for (const ns of namespaces) {
    const base = Object.fromEntries(entries(read(BASE, ns)));

    for (const lang of languages) {
      if (lang === BASE) continue;
      for (const [key, value] of entries(read(lang, ns))) {
        // A dropped {{year}} renders as literal text; a renamed one renders
        // the raw braces. Both look broken and neither throws.
        assert.deepEqual(
          placeholders(value), placeholders(base[key] ?? ''),
          `${lang}/${ns}.json ${key} has different placeholders to English`,
        );
      }
    }
  }
});

test('the lazy bundle map covers every non-default language', () => {
  const src = fs.readFileSync(
    path.join(import.meta.dirname, '..', 'src', 'i18n', 'index.js'), 'utf8',
  );

  for (const lang of languages) {
    if (lang === BASE) continue;
    // Without an entry here the language silently renders as English.
    assert.match(
      src, new RegExp(`${lang}:\\s*\\(\\)\\s*=>`),
      `LAZY_BUNDLES has no loader for "${lang}"`,
    );
    for (const ns of namespaces) {
      assert.ok(
        src.includes(`./locales/${lang}/${ns}.json`),
        `LAZY_BUNDLES for "${lang}" does not import ${ns}.json`,
      );
    }
  }
});

/* Guards against two mechanical mistakes that a bulk find-and-replace makes
   when swapping English literals for t() calls. Both produce either a syntax
   error or — worse — a string that renders the raw call to the user. */
test('no t() call was pasted inside a string literal', () => {
  const SRC_DIR = path.join(import.meta.dirname, '..', 'src');
  const offenders = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.jsx?$/.test(entry.name)) continue;
      const src = fs.readFileSync(full, 'utf8');
      const rel = path.relative(SRC_DIR, full).split(path.sep).join('/');

      // "{t("key")}" — a JSX expression trapped in a JS string.
      if (/["'`]\{t\(/.test(src)) offenders.push(`${rel} (t() inside a string literal)`);
      // placeholder=t("key") — a JSX attribute missing its braces.
      if (/\w+=t\(/.test(src)) offenders.push(`${rel} (JSX attribute missing braces)`);
    }
  };
  walk(SRC_DIR);

  assert.deepEqual(offenders, [], `malformed t() usage:\n  ${offenders.join('\n  ')}`);
});
