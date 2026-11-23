// One-Prompt Startup Launcher — Node tests (no dependencies, node:test).
// Run: node --test tests/run-tests.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const OPL = require('../generator.js');
const { CACHED, withLogos } = require('../launches.js');

test('slugify: spaces and punctuation become dashes', () => {
  assert.equal(OPL.slugify('Meal Planning App!'), 'meal-planning-app');
  assert.equal(OPL.slugify('  Hello   World  '), 'hello-world');
  assert.equal(OPL.slugify(''), 'startup');
});

test('hashString is deterministic', () => {
  assert.equal(OPL.hashString('mealwise'), OPL.hashString('mealwise'));
  assert.notEqual(OPL.hashString('mealwise'), OPL.hashString('shelfie'));
});

test('keywords drops stop-words and short words', () => {
  const kws = OPL.keywords('a meal-planning app for hostel students');
  assert.deepEqual(kws, ['meal', 'planning', 'hostel', 'students']);
});

test('offlineName maps known topics, falls back deterministically', () => {
  assert.equal(OPL.offlineName('a meal-planning app for hostel students'), 'Mealwise');
  assert.equal(OPL.offlineName('a pantry tracker'), 'Shelfie');
  assert.equal(OPL.offlineName('a place where college students find a senior'), 'Tutorloop');
  assert.equal(OPL.offlineName('a widget for left-handed golfers'), OPL.offlineName('a widget for left-handed golfers'));
  assert.equal(OPL.offlineName(''), 'Newloop');
});

test('offlineGenerate returns a valid launch', () => {
  const l = OPL.offlineGenerate('a meal-planning app for hostel students');
  assert.deepEqual(OPL.validateLaunch({ ...l, logo: OPL.makeLogoSVG(l.name, l.palette) }), []);
  assert.equal(l.name, 'Mealwise');
  assert.equal(l.slug, 'mealwise');
  assert.equal(l.features.length, 3);
  assert.equal(l.pricing.length, 3);
  assert.equal(l.faq.length, 3);
  assert.equal(l.source, 'offline');
  assert.equal(l.prompt, 'a meal-planning app for hostel students');
});

test('offlineGenerate differs by prompt (name, palette or template)', () => {
  const a = OPL.offlineGenerate('a meal-planning app for hostel students');
  const b = OPL.offlineGenerate('a pantry tracker that tells you what to cook');
  assert.notEqual(a.name, b.name);
});

test('offlineGenerate handles empty and very long prompts', () => {
  const empty = OPL.offlineGenerate('');
  assert.deepEqual(OPL.validateLaunch(empty), []);
  const long = OPL.offlineGenerate('a '.repeat(200) + 'meal app for students');
  assert.deepEqual(OPL.validateLaunch(long), []);
  assert.ok(long.name.length > 0);
});

test('makeLogoSVG is deterministic and honest about its source', () => {
  const p = OPL.PALETTES[0];
  const a = OPL.makeLogoSVG('Mealwise', p);
  const b = OPL.makeLogoSVG('Mealwise', p);
  assert.equal(a.svg, b.svg);
  assert.equal(a.source, 'svg-generator');
  assert.ok(a.svg.includes('<svg'));
  assert.ok(!a.svg.includes('<text'), 'mark only — no initials text overlapping the shape');
  assert.ok(a.svg.includes('<circle') || a.svg.includes('<rect') || a.svg.includes('<path'));
});

test('validateLaunch catches bad launches', () => {
  assert.ok(OPL.validateLaunch(null).length > 0);
  assert.ok(OPL.validateLaunch({}).includes('missing name'));
  assert.ok(OPL.validateLaunch({ name: 'X', tagline: 'y', features: [], pricing: [], faq: [], palette: {}, template: 'nope' }).length >= 4);
});

test('validateEmail accepts real addresses, rejects bad ones', () => {
  assert.equal(OPL.validateEmail('siva@example.com'), true);
  assert.equal(OPL.validateEmail('a@b.co'), true);
  assert.equal(OPL.validateEmail('not-an-email'), false);
  assert.equal(OPL.validateEmail('a@b'), false);
  assert.equal(OPL.validateEmail(''), false);
  assert.equal(OPL.validateEmail('a b@c.com'), false);
});

test('renderLaunchBody renders all three templates with real content', () => {
  for (const t of OPL.TEMPLATES) {
    const l = OPL.offlineGenerate('a meal-planning app for hostel students');
    l.template = t; l.logo = OPL.makeLogoSVG(l.name, l.palette);
    const html = OPL.renderLaunchBody(l);
    assert.ok(html.includes('Mealwise'), t);
    assert.ok(html.includes(OPL.escapeHtml(l.tagline)), t);
    assert.ok(html.includes('data-waitlist-form'), t);
    assert.ok(html.includes('Sample pricing'), t);
    assert.ok(!html.includes('lorem'), t);
  }
});

test('renderLaunchBody escapes HTML in user-derived text', () => {
  const l = OPL.offlineGenerate('a meal app');
  l.name = '<script>alert(1)</script>'; l.tagline = '<b>bold</b>';
  l.logo = OPL.makeLogoSVG('X', l.palette);
  const html = OPL.renderLaunchBody(l);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('standaloneHTML is a complete document with working waitlist script', () => {
  const l = OPL.offlineGenerate('a meal-planning app for hostel students');
  l.logo = OPL.makeLogoSVG(l.name, l.palette);
  const html = OPL.standaloneHTML(l);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<title>Mealwise'));
  assert.ok(html.includes('opl_waitlist_mealwise'));
  assert.ok(html.includes('data-waitlist-form'));
});

test('cached launches are all valid and distinct', () => {
  const list = withLogos();
  assert.equal(list.length, 3);
  const slugs = new Set();
  for (const l of list) {
    assert.deepEqual(OPL.validateLaunch(l), [], l.slug);
    assert.ok(l.logo && l.logo.source === 'svg-generator', l.slug);
    assert.equal(l.source, 'cached');
    assert.ok(!slugs.has(l.slug)); slugs.add(l.slug);
  }
  assert.deepEqual([...slugs].sort(), ['mealwise', 'shelfie', 'tutorloop']);
});

test('cached launches use three different templates', () => {
  const templates = new Set(withLogos().map((l) => l.template));
  assert.equal(templates.size, 3);
});

test('cached launches contain no cliché copy', () => {
  const banned = ['seamless', 'supercharge', 'elevate', 'unlock', 'revolutioni', 'AI-powered', 'lorem'];
  const text = JSON.stringify(CACHED).toLowerCase();
  for (const word of banned) assert.ok(!text.includes(word), word);
});

test('palettes are valid hex and distinct', () => {
  assert.equal(OPL.PALETTES.length, 3);
  for (const p of OPL.PALETTES) {
    for (const k of ['bg', 'ink', 'accent']) assert.match(p[k], /^#[0-9A-Fa-f]{6}$/, k);
  }
  assert.equal(new Set(OPL.PALETTES.map((p) => p.accent)).size, 3);
});
