// docs/user-guides/tests/renderReact.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { renderReact } = require('../lib/renderReact.js');

const guide = {
  role: 'swat-leaders',
  title: 'SWAT Leadership Guide',
  sections: [
    {
      slug: 'quick-start',
      title: 'Quick Start',
      purpose: 'Get oriented.',
      howToGetThere: null,
      steps: [
        { heading: 'Open menu', body: 'Click the hamburger icon.', screenshot: 'leaders/menu.png' },
      ],
      fields: [],
      tips: [],
      comingSoon: false,
    },
  ],
};

test('renderReact produces a JSX module', () => {
  const jsx = renderReact(guide);
  assert.match(jsx, /import\s+\w+\s+from\s+['"]\.\.\/assets\/leaders-menu\.png['"]/);
  assert.match(jsx, /export default function SwatLeadersGuideContent/);
  assert.match(jsx, /Quick Start/);
});

test('renderReact slugifies section ids', () => {
  const jsx = renderReact(guide);
  assert.match(jsx, /id="quick-start"/);
});
