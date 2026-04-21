// docs/user-guides/tests/contentLoader.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadGuide } = require('../lib/contentLoader.js');

test('loadGuide returns sections in filename order', () => {
  const guide = loadGuide({
    role: 'test-role',
    contentDir: path.join(__dirname, 'fixtures'),
  });
  assert.strictEqual(guide.role, 'test-role');
  assert.strictEqual(guide.sections.length, 2);
  assert.strictEqual(guide.sections[0].slug, 'intro');
  assert.strictEqual(guide.sections[0].title, 'Intro');
  assert.strictEqual(guide.sections[1].slug, 'section');
});

test('loadGuide marks comingSoon sections', () => {
  const guide = loadGuide({
    role: 'test-role',
    contentDir: path.join(__dirname, 'fixtures'),
  });
  assert.strictEqual(guide.sections[1].comingSoon, true);
});

test('loadGuide throws when content dir missing', () => {
  assert.throws(
    () => loadGuide({ role: 'nonexistent', contentDir: '/tmp/nope' }),
    /content directory not found/,
  );
});
