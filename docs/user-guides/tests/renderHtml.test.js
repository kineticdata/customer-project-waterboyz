// docs/user-guides/tests/renderHtml.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { renderHtml } = require('../lib/renderHtml.js');

const guide = {
  role: 'swat-leaders',
  title: 'SWAT Leadership Guide',
  sections: [
    {
      slug: 'quick-start',
      title: 'Quick Start',
      purpose: 'Get oriented in 5 minutes.',
      howToGetThere: null,
      steps: [
        { heading: 'Step A', body: 'Do the thing.', screenshot: null },
      ],
      fields: [],
      tips: ['Watch for the Admin menu.'],
      comingSoon: false,
    },
  ],
};

test('renderHtml produces a complete HTML document', () => {
  const html = renderHtml(guide);
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /SWAT Leadership Guide/);
  assert.match(html, /Quick Start/);
  assert.match(html, /Step A/);
  assert.match(html, /Watch for the Admin menu/);
});

test('renderHtml renders Coming Soon callout', () => {
  const g = {
    ...guide,
    sections: [{ ...guide.sections[0], comingSoon: true }],
  };
  const html = renderHtml(g);
  assert.match(html, /Coming Soon/);
});

test('renderHtml includes a sidebar TOC with anchor links', () => {
  const html = renderHtml(guide);
  assert.match(html, /<nav[^>]*class="[^"]*toc/);
  assert.match(html, /#quick-start/);
});
