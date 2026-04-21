# User Guides Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build branded, comprehensive user guides for SWAT Leadership and Team Captains, delivered as both standalone HTML and authenticated in-portal React pages, with Playwright screenshot capture against production.

**Architecture:** A build pipeline in `docs/user-guides/` (modeled on `email-templates/`) loads structured content files and screenshots, then emits two outputs: standalone HTML in `dist/`, and React component bundles in `portal/src/pages/help/generated/`. Screenshots are bundled via Vite imports so they're not publicly reachable. Hamburger menu gets a role-aware Help entry.

**Tech Stack:** Node.js (build script, CJS), Playwright (capture), React + Vite (portal), Tailwind/DaisyUI (portal styling), self-contained CSS (standalone HTML).

**Spec:** [docs/superpowers/specs/2026-04-20-user-guides-documentation-design.md](../specs/2026-04-20-user-guides-documentation-design.md)

---

## File Structure

**New files (build pipeline):**
- `docs/user-guides/package.json` — declares `playwright`, `dotenv` deps
- `docs/user-guides/README.md` — usage instructions
- `docs/user-guides/.env.example` — credential template
- `docs/user-guides/.gitignore` — ignores `.env` and `node_modules/`
- `docs/user-guides/brand.js` — shared brand tokens
- `docs/user-guides/lib/contentLoader.js` — walks `content/<role>/*.js`
- `docs/user-guides/lib/renderHtml.js` — standalone HTML generator
- `docs/user-guides/lib/renderReact.js` — React component generator
- `docs/user-guides/lib/sectionTemplate.js` — section HTML helper (purpose/steps/tips)
- `docs/user-guides/build.js` — orchestrates the build
- `docs/user-guides/capture.ts` — Playwright script
- `docs/user-guides/capture-helpers.ts` — login + redaction helpers
- `docs/user-guides/tests/contentLoader.test.js` — unit test (Node `node:test`)

**New files (content) — 16 total:**
- `docs/user-guides/content/swat-leaders/00-quick-start.js`
- `docs/user-guides/content/swat-leaders/01-home.js`
- `docs/user-guides/content/swat-leaders/02-nominations.js`
- `docs/user-guides/content/swat-leaders/03-volunteer-management.js`
- `docs/user-guides/content/swat-leaders/04-reports.js`
- `docs/user-guides/content/swat-leaders/05-events.js`
- `docs/user-guides/content/swat-leaders/06-volunteer-notifications.js`
- `docs/user-guides/content/swat-leaders/07-captain-management.js`
- `docs/user-guides/content/swat-leaders/08-settings.js`
- `docs/user-guides/content/team-captains/00-quick-start.js`
- `docs/user-guides/content/team-captains/01-my-projects.js`
- `docs/user-guides/content/team-captains/02-project-details.js`
- `docs/user-guides/content/team-captains/03-volunteers.js`
- `docs/user-guides/content/team-captains/04-tasks.js`
- `docs/user-guides/content/team-captains/05-expenses.js` (Coming Soon)
- `docs/user-guides/content/team-captains/06-photos-notes.js`
- `docs/user-guides/content/team-captains/07-requesting-help.js`

**New files (portal):**
- `portal/src/pages/help/HelpLayout.jsx` — sidebar TOC + section renderer
- `portal/src/pages/help/SwatLeadersGuide.jsx` — route component (imports generated)
- `portal/src/pages/help/TeamCaptainsGuide.jsx` — route component (imports generated)
- `portal/src/pages/help/HelpRouting.jsx` — nested router for `/help/*`
- `portal/src/pages/help/generated/swat-leaders.jsx` — generated
- `portal/src/pages/help/generated/team-captains.jsx` — generated
- `portal/src/pages/help/assets/*.png` — screenshots (generated, committed)

**Modified files:**
- `portal/src/pages/PrivateRoutes.jsx:79-106` — register `<Route path="/help/*" element={<HelpRouting />} />`
- `portal/src/components/header/Header.jsx:199-236` — add Help menu entry in `getMenuItems`
- `package.json` (root) — add `help:build` and `help:capture` scripts

**Generated (committed) outputs:**
- `docs/user-guides/dist/swat-leaders.html`
- `docs/user-guides/dist/team-captains.html`
- `docs/user-guides/screenshots/**/*.png`

---

## Phase 1 — Build Pipeline Scaffolding

### Task 1: Initialize `docs/user-guides/` package

**Files:**
- Create: `docs/user-guides/package.json`
- Create: `docs/user-guides/.gitignore`
- Create: `docs/user-guides/README.md`
- Create: `docs/user-guides/.env.example`

- [ ] **Step 1: Create `docs/user-guides/package.json`**

```json
{
  "name": "@waterboyz/user-guides",
  "version": "0.1.0",
  "private": true,
  "description": "Branded user guides for SWAT Leadership and Team Captains.",
  "scripts": {
    "build": "node build.js",
    "capture": "tsx capture.ts",
    "preview:leaders": "node build.js --preview swat-leaders",
    "preview:captains": "node build.js --preview team-captains",
    "test": "node --test tests/"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "dotenv": "^16.4.5",
    "tsx": "^4.19.1"
  }
}
```

- [ ] **Step 2: Create `docs/user-guides/.gitignore`**

```
node_modules/
.env
```

- [ ] **Step 3: Create `docs/user-guides/.env.example`**

```
# Playwright capture credentials
PW_BASE_URL=https://waterboyz.kinops.io
PW_LEADER_USERNAME=
PW_LEADER_PASSWORD=
PW_CAPTAIN_USERNAME=
PW_CAPTAIN_PASSWORD=

# Sample record IDs for screenshots (create these in production first)
SAMPLE_PROJECT_ID=
SAMPLE_VOLUNTEER_ID=
SAMPLE_EVENT_ID=
SAMPLE_NOMINATION_ID=
SAMPLE_FAMILY_ID=
```

- [ ] **Step 4: Create `docs/user-guides/README.md`**

```markdown
# Waterboyz User Guides

Branded user-facing documentation for SWAT Leadership and Team Captains.

## Outputs

- **Standalone HTML:** `dist/swat-leaders.html`, `dist/team-captains.html` (shareable, printable)
- **In-portal React pages:** generated into `portal/src/pages/help/generated/` and rendered at `/help/swat-leaders` and `/help/team-captains` inside the authenticated portal

## Usage

```bash
cd docs/user-guides
yarn install                 # one time
cp .env.example .env          # then fill in credentials + sample IDs
yarn capture                  # run Playwright against production
yarn build                    # regenerate both outputs
yarn preview:leaders          # open standalone HTML in browser
```

## Content

Edit sections under `content/<role>/*.js`. Filename prefixes (`00-`, `01-`, ...) control section order. After editing content or capturing new screenshots, run `yarn build` and commit both the source and the generated output under `portal/src/pages/help/generated/`.
```

- [ ] **Step 5: Install deps**

Run: `cd docs/user-guides && yarn install`
Expected: `node_modules/` populated, `yarn.lock` created.

- [ ] **Step 6: Commit**

```bash
git add docs/user-guides/package.json docs/user-guides/.gitignore docs/user-guides/README.md docs/user-guides/.env.example docs/user-guides/yarn.lock
git commit -m "chore: scaffold docs/user-guides package"
```

---

### Task 2: Brand tokens

**Files:**
- Create: `docs/user-guides/brand.js`

- [ ] **Step 1: Create `docs/user-guides/brand.js`**

Mirror the email-templates brand object so both pipelines look identical.

```js
// docs/user-guides/brand.js
// Shared brand tokens for both standalone HTML and React-rendered guides.
module.exports = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  accent: '#0ea5e9',
  dark: '#1e293b',
  text: '#334155',
  textLight: '#64748b',
  border: '#e2e8f0',
  bgPage: '#f1f5f9',
  bgCard: '#ffffff',
  bgFooter: '#1e293b',
  radius: '8px',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  logoUrl: 'https://waterboyz.kinops.io/app/spa/logo.png',
  orgName: 'Waterboyz',
  siteUrl: 'https://waterboyz.kinops.io',
};
```

- [ ] **Step 2: Commit**

```bash
git add docs/user-guides/brand.js
git commit -m "chore: add shared brand tokens for user guides"
```

---

### Task 3: Content loader (with test)

**Files:**
- Create: `docs/user-guides/lib/contentLoader.js`
- Create: `docs/user-guides/tests/contentLoader.test.js`
- Create: `docs/user-guides/tests/fixtures/test-role/00-intro.js`
- Create: `docs/user-guides/tests/fixtures/test-role/01-section.js`

- [ ] **Step 1: Write failing test**

```js
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
```

- [ ] **Step 2: Create fixtures**

```js
// docs/user-guides/tests/fixtures/test-role/00-intro.js
module.exports = {
  slug: 'intro',
  title: 'Intro',
  purpose: 'Intro purpose',
  steps: [],
  comingSoon: false,
};
```

```js
// docs/user-guides/tests/fixtures/test-role/01-section.js
module.exports = {
  slug: 'section',
  title: 'Section',
  purpose: 'Section purpose',
  steps: [],
  comingSoon: true,
};
```

- [ ] **Step 3: Run test — should fail**

Run: `cd docs/user-guides && node --test tests/contentLoader.test.js`
Expected: FAIL with "Cannot find module '../lib/contentLoader.js'"

- [ ] **Step 4: Implement `contentLoader.js`**

```js
// docs/user-guides/lib/contentLoader.js
const fs = require('fs');
const path = require('path');

/**
 * Walks content/<role>/ and returns structured guide data.
 *
 * @param {object} opts
 * @param {string} opts.role - e.g. 'swat-leaders' or 'team-captains'
 * @param {string} opts.contentDir - parent directory that contains `<role>/` subdir
 * @returns {{ role: string, sections: Section[] }}
 */
function loadGuide({ role, contentDir }) {
  const dir = path.join(contentDir, role);
  if (!fs.existsSync(dir)) {
    throw new Error(`content directory not found: ${dir}`);
  }
  const files = fs
    .readdirSync(dir)
    .filter(f => /^\d{2}-.+\.js$/.test(f))
    .sort();

  const sections = files.map(file => {
    const mod = require(path.join(dir, file));
    return {
      slug: mod.slug,
      title: mod.title,
      purpose: mod.purpose || '',
      howToGetThere: mod.howToGetThere || null,
      steps: mod.steps || [],
      fields: mod.fields || [],
      tips: mod.tips || [],
      comingSoon: !!mod.comingSoon,
    };
  });

  return { role, sections };
}

module.exports = { loadGuide };
```

- [ ] **Step 5: Run test — should pass**

Run: `cd docs/user-guides && node --test tests/contentLoader.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add docs/user-guides/lib/contentLoader.js docs/user-guides/tests/
git commit -m "feat(user-guides): add content loader"
```

---

### Task 4: HTML renderer (standalone)

**Files:**
- Create: `docs/user-guides/lib/renderHtml.js`
- Create: `docs/user-guides/lib/sectionTemplate.js`
- Modify (add test): `docs/user-guides/tests/renderHtml.test.js`

- [ ] **Step 1: Write failing test**

```js
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
```

- [ ] **Step 2: Run test — expect failure**

Run: `cd docs/user-guides && node --test tests/renderHtml.test.js`
Expected: FAIL with "Cannot find module '../lib/renderHtml.js'"

- [ ] **Step 3: Create `lib/sectionTemplate.js`**

```js
// docs/user-guides/lib/sectionTemplate.js
const { escape } = require('./escape.js');

function renderStep(step, { screenshotPrefix = '' } = {}) {
  const img = step.screenshot
    ? `<figure class="screenshot"><img src="${screenshotPrefix}${step.screenshot}" alt="${escape(step.heading || '')}" /></figure>`
    : '';
  return `
    <div class="step">
      <h3>${escape(step.heading || '')}</h3>
      <div class="step-body">${step.body || ''}</div>
      ${img}
    </div>
  `;
}

function renderSection(section, opts = {}) {
  if (section.comingSoon) {
    return `
      <section id="${section.slug}" class="guide-section coming-soon">
        <h2>${escape(section.title)}</h2>
        <div class="callout callout-coming-soon">
          <strong>Coming Soon</strong>
          <p>${escape(section.purpose || '')}</p>
        </div>
      </section>
    `;
  }

  const howTo = section.howToGetThere
    ? `
      <div class="how-to-get-there">
        <h3>How to get there</h3>
        <p>${section.howToGetThere.text}</p>
        ${section.howToGetThere.screenshot ? `<figure class="screenshot"><img src="${opts.screenshotPrefix || ''}${section.howToGetThere.screenshot}" alt="${escape(section.title)} — entry point" /></figure>` : ''}
      </div>`
    : '';

  const fields = section.fields.length
    ? `
      <div class="field-reference">
        <h3>Field reference</h3>
        <dl>
          ${section.fields.map(f => `<dt>${escape(f.name)}</dt><dd>${escape(f.description)}</dd>`).join('')}
        </dl>
      </div>`
    : '';

  const tips = section.tips.length
    ? `
      <aside class="callout callout-tip">
        <strong>Tips</strong>
        <ul>${section.tips.map(t => `<li>${escape(t)}</li>`).join('')}</ul>
      </aside>`
    : '';

  const steps = section.steps.map(s => renderStep(s, opts)).join('\n');

  return `
    <section id="${section.slug}" class="guide-section">
      <h2>${escape(section.title)}</h2>
      ${section.purpose ? `<p class="section-purpose">${escape(section.purpose)}</p>` : ''}
      ${howTo}
      ${steps ? `<div class="walkthrough">${steps}</div>` : ''}
      ${fields}
      ${tips}
    </section>
  `;
}

module.exports = { renderSection };
```

- [ ] **Step 4: Create tiny escape helper**

```js
// docs/user-guides/lib/escape.js
function escape(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
module.exports = { escape };
```

- [ ] **Step 5: Create `lib/renderHtml.js`**

```js
// docs/user-guides/lib/renderHtml.js
const brand = require('../brand.js');
const { renderSection } = require('./sectionTemplate.js');
const { escape } = require('./escape.js');

function renderToc(sections) {
  const items = sections
    .map(s => `<li><a href="#${s.slug}">${escape(s.title)}${s.comingSoon ? ' <span class="badge">Coming Soon</span>' : ''}</a></li>`)
    .join('');
  return `<nav class="toc"><ol>${items}</ol></nav>`;
}

function renderStyles() {
  return `
    :root {
      --primary: ${brand.primary};
      --primary-dark: ${brand.primaryDark};
      --accent: ${brand.accent};
      --dark: ${brand.dark};
      --text: ${brand.text};
      --text-light: ${brand.textLight};
      --border: ${brand.border};
      --bg-page: ${brand.bgPage};
      --bg-card: ${brand.bgCard};
      --radius: ${brand.radius};
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ${brand.fontFamily}; background: var(--bg-page); color: var(--text); line-height: 1.6; }
    header.site-header { background: var(--dark); color: #fff; padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
    header.site-header img { height: 40px; }
    header.site-header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    header.site-header .role-badge { background: var(--primary); color: #fff; border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 600; margin-left: auto; }
    main.layout { display: grid; grid-template-columns: 260px 1fr; gap: 32px; max-width: 1200px; margin: 0 auto; padding: 32px; }
    nav.toc { position: sticky; top: 16px; align-self: start; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
    nav.toc ol { list-style: decimal; padding-left: 20px; margin: 0; }
    nav.toc li { margin: 4px 0; }
    nav.toc a { color: var(--text); text-decoration: none; }
    nav.toc a:hover { color: var(--primary); }
    nav.toc .badge { background: var(--accent); color: #fff; border-radius: 4px; font-size: 10px; padding: 2px 6px; margin-left: 4px; }
    section.guide-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 32px; margin-bottom: 24px; }
    section.guide-section h2 { margin-top: 0; color: var(--dark); border-bottom: 2px solid var(--primary); padding-bottom: 8px; }
    .section-purpose { font-size: 16px; color: var(--text-light); font-style: italic; }
    .step { padding: 16px 0; border-bottom: 1px dashed var(--border); }
    .step:last-child { border-bottom: 0; }
    .step h3 { margin: 0 0 8px 0; color: var(--primary-dark); }
    .screenshot { margin: 16px 0; text-align: center; }
    .screenshot img { max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .callout { border-left: 4px solid var(--accent); background: #eff6ff; border-radius: 4px; padding: 12px 16px; margin: 16px 0; }
    .callout-coming-soon { border-left-color: var(--accent); background: #fef3c7; }
    .callout-tip { border-left-color: var(--primary); background: #eff6ff; }
    .callout ul { margin: 8px 0 0 0; padding-left: 20px; }
    .how-to-get-there h3, .field-reference h3 { color: var(--primary-dark); }
    .field-reference dl { display: grid; grid-template-columns: 180px 1fr; gap: 8px 16px; }
    .field-reference dt { font-weight: 600; }
    footer.site-footer { background: var(--dark); color: #cbd5e1; padding: 24px 32px; text-align: center; font-size: 13px; }
    @media (max-width: 768px) {
      main.layout { grid-template-columns: 1fr; }
      nav.toc { position: relative; }
    }
    @media print {
      nav.toc, header.site-header .role-badge { display: none; }
      header.site-header { background: #fff; color: var(--dark); border-bottom: 2px solid var(--primary); }
      main.layout { grid-template-columns: 1fr; padding: 0; max-width: none; }
      section.guide-section { page-break-inside: avoid; box-shadow: none; border: none; padding: 16px 0; }
      .screenshot { page-break-inside: avoid; }
      body { background: #fff; }
    }
  `;
}

/**
 * Generates a complete, self-contained HTML document for a guide.
 *
 * @param {object} guide - from contentLoader
 * @returns {string} HTML
 */
function renderHtml(guide) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escape(guide.title)} — ${brand.orgName}</title>
<style>${renderStyles()}</style>
</head>
<body>
  <header class="site-header">
    <img src="${brand.logoUrl}" alt="${brand.orgName} logo" />
    <h1>${escape(guide.title)}</h1>
    <span class="role-badge">${escape(guide.role)}</span>
  </header>
  <main class="layout">
    ${renderToc(guide.sections)}
    <div class="content">
      ${guide.sections.map(s => renderSection(s, { screenshotPrefix: '../screenshots/' })).join('\n')}
    </div>
  </main>
  <footer class="site-footer">
    ${brand.orgName} · <a href="${brand.siteUrl}" style="color: #60a5fa;">${brand.siteUrl}</a>
  </footer>
</body>
</html>`;
}

module.exports = { renderHtml };
```

- [ ] **Step 6: Run tests — should pass**

Run: `cd docs/user-guides && node --test tests/renderHtml.test.js`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add docs/user-guides/lib/ docs/user-guides/tests/renderHtml.test.js
git commit -m "feat(user-guides): add standalone HTML renderer"
```

---

### Task 5: React renderer (bundled output)

**Files:**
- Create: `docs/user-guides/lib/renderReact.js`
- Create: `docs/user-guides/tests/renderReact.test.js`

- [ ] **Step 1: Write failing test**

```js
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
```

- [ ] **Step 2: Run — expect failure**

Run: `cd docs/user-guides && node --test tests/renderReact.test.js`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement `lib/renderReact.js`**

```js
// docs/user-guides/lib/renderReact.js
const { escape } = require('./escape.js');

/**
 * Convert a screenshot path like "leaders/menu.png" into a safe JS import name.
 * e.g. leaders/menu.png -> leadersMenu, svgAltSlug -> assetLeadersMenu
 */
function importName(screenshotPath) {
  return (
    'asset_' +
    screenshotPath
      .replace(/\.png$/i, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

function assetFileName(screenshotPath) {
  // Flatten "leaders/menu.png" -> "leaders-menu.png" for the assets/ dir
  return screenshotPath.replace(/\//g, '-');
}

function componentName(role) {
  return (
    role
      .split('-')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('') + 'GuideContent'
  );
}

function jsxStep(step) {
  const img = step.screenshot
    ? `<figure className="screenshot"><img src={${importName(step.screenshot)}} alt=${JSON.stringify(step.heading || '')} /></figure>`
    : '';
  return `
        <div className="help-step">
          <h3>${escape(step.heading || '')}</h3>
          <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(step.body || '')} }} />
          ${img}
        </div>`;
}

function jsxSection(section) {
  if (section.comingSoon) {
    return `
      <section id="${section.slug}" className="help-section help-coming-soon">
        <h2>${escape(section.title)}</h2>
        <div className="help-callout help-callout-coming-soon">
          <strong>Coming Soon</strong>
          <p>${escape(section.purpose || '')}</p>
        </div>
      </section>`;
  }
  const howTo =
    section.howToGetThere &&
    `
        <div className="help-how-to">
          <h3>How to get there</h3>
          <p>${escape(section.howToGetThere.text)}</p>
          ${section.howToGetThere.screenshot ? `<figure className="screenshot"><img src={${importName(section.howToGetThere.screenshot)}} alt=${JSON.stringify(section.title + ' entry point')} /></figure>` : ''}
        </div>`;
  const fields = section.fields.length
    ? `
        <div className="help-fields">
          <h3>Field reference</h3>
          <dl>
            ${section.fields.map(f => `<dt>${escape(f.name)}</dt><dd>${escape(f.description)}</dd>`).join('')}
          </dl>
        </div>`
    : '';
  const tips = section.tips.length
    ? `
        <aside className="help-callout help-callout-tip">
          <strong>Tips</strong>
          <ul>${section.tips.map(t => `<li>${escape(t)}</li>`).join('')}</ul>
        </aside>`
    : '';
  const steps = section.steps.map(jsxStep).join('\n');
  return `
      <section id="${section.slug}" className="help-section">
        <h2>${escape(section.title)}</h2>
        ${section.purpose ? `<p className="help-section-purpose">${escape(section.purpose)}</p>` : ''}
        ${howTo || ''}
        ${steps ? `<div className="help-walkthrough">${steps}</div>` : ''}
        ${fields}
        ${tips}
      </section>`;
}

/**
 * Generates a JSX module string for a guide. Writer will save it to
 * portal/src/pages/help/generated/<role>.jsx.
 */
function renderReact(guide) {
  const screenshots = new Set();
  function collect(section) {
    if (section.howToGetThere?.screenshot) screenshots.add(section.howToGetThere.screenshot);
    for (const s of section.steps) if (s.screenshot) screenshots.add(s.screenshot);
  }
  guide.sections.forEach(collect);

  const imports = [...screenshots]
    .map(s => `import ${importName(s)} from '../assets/${assetFileName(s)}';`)
    .join('\n');

  const sections = guide.sections.map(jsxSection).join('\n');

  return `// AUTO-GENERATED by docs/user-guides/build.js — do not edit by hand.
import React from 'react';
${imports}

export const sections = ${JSON.stringify(
    guide.sections.map(s => ({ slug: s.slug, title: s.title, comingSoon: s.comingSoon })),
    null,
    2,
  )};

export default function ${componentName(guide.role)}() {
  return (
    <>
      ${sections}
    </>
  );
}
`;
}

module.exports = { renderReact, importName, assetFileName, componentName };
```

- [ ] **Step 4: Run — should pass**

Run: `cd docs/user-guides && node --test tests/renderReact.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/user-guides/lib/renderReact.js docs/user-guides/tests/renderReact.test.js
git commit -m "feat(user-guides): add React renderer"
```

---

### Task 6: Build orchestrator

**Files:**
- Create: `docs/user-guides/build.js`

- [ ] **Step 1: Write `build.js`**

```js
#!/usr/bin/env node
/**
 * Waterboyz User Guides Builder
 *
 * Usage:
 *   node build.js                      Build both outputs (HTML + React)
 *   node build.js <role>               Build one role (swat-leaders | team-captains)
 *   node build.js --preview <role>     Build then open in browser
 *   node build.js --list               List available guides
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadGuide } = require('./lib/contentLoader.js');
const { renderHtml } = require('./lib/renderHtml.js');
const { renderReact, assetFileName } = require('./lib/renderReact.js');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const DIST_DIR = path.join(ROOT, 'dist');
const SCREENSHOTS_DIR = path.join(ROOT, 'screenshots');
const PORTAL_HELP_DIR = path.join(ROOT, '..', '..', 'portal', 'src', 'pages', 'help');
const PORTAL_GENERATED_DIR = path.join(PORTAL_HELP_DIR, 'generated');
const PORTAL_ASSETS_DIR = path.join(PORTAL_HELP_DIR, 'assets');

const GUIDES = {
  'swat-leaders': { role: 'swat-leaders', title: 'SWAT Leadership Guide' },
  'team-captains': { role: 'team-captains', title: 'Team Captain Guide' },
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildOne(roleKey) {
  const meta = GUIDES[roleKey];
  if (!meta) throw new Error(`Unknown guide: ${roleKey}`);

  const guide = { ...loadGuide({ role: meta.role, contentDir: CONTENT_DIR }), title: meta.title };

  ensureDir(DIST_DIR);
  const htmlPath = path.join(DIST_DIR, `${meta.role}.html`);
  fs.writeFileSync(htmlPath, renderHtml(guide), 'utf8');
  console.log(`  ✓ ${path.relative(process.cwd(), htmlPath)}`);

  ensureDir(PORTAL_GENERATED_DIR);
  ensureDir(PORTAL_ASSETS_DIR);
  const jsxPath = path.join(PORTAL_GENERATED_DIR, `${meta.role}.jsx`);
  fs.writeFileSync(jsxPath, renderReact(guide), 'utf8');
  console.log(`  ✓ ${path.relative(process.cwd(), jsxPath)}`);

  for (const section of guide.sections) {
    const shots = [];
    if (section.howToGetThere?.screenshot) shots.push(section.howToGetThere.screenshot);
    for (const s of section.steps) if (s.screenshot) shots.push(s.screenshot);
    for (const shot of shots) {
      const src = path.join(SCREENSHOTS_DIR, shot);
      const dst = path.join(PORTAL_ASSETS_DIR, assetFileName(shot));
      if (!fs.existsSync(src)) {
        console.warn(`  ⚠ screenshot missing: ${shot} — run \`yarn capture\` first`);
        continue;
      }
      fs.copyFileSync(src, dst);
    }
  }
  return { htmlPath };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    console.log('Guides:');
    for (const k of Object.keys(GUIDES)) console.log(`  - ${k}`);
    return;
  }
  const previewIdx = args.indexOf('--preview');
  const preview = previewIdx >= 0 ? args[previewIdx + 1] : null;
  const explicit = args.find(a => !a.startsWith('--') && a !== preview);

  const roles = explicit ? [explicit] : preview ? [preview] : Object.keys(GUIDES);
  console.log(`Building: ${roles.join(', ')}`);
  const results = roles.map(buildOne);

  if (preview) {
    const target = results[roles.indexOf(preview)].htmlPath;
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    execSync(`${opener} "${target}"`);
  }
}

if (require.main === module) main();
module.exports = { buildOne };
```

- [ ] **Step 2: Create empty placeholder content files**

Create minimum content files so `build.js` can run before real content is written. Each file follows the same shape:

```js
// Template
module.exports = {
  slug: '<slug>',
  title: '<Title>',
  purpose: '<1-sentence placeholder>',
  howToGetThere: null,
  steps: [],
  fields: [],
  tips: [],
  comingSoon: <bool>,
};
```

Create these 17 files with the listed `slug` and `title`:

**docs/user-guides/content/swat-leaders/:**

| File | slug | title |
|------|------|-------|
| `00-quick-start.js` | `quick-start` | `Quick Start` |
| `01-home.js` | `home` | `Home & Admin Navigation` |
| `02-nominations.js` | `nominations` | `Nominations & Approvals` |
| `03-volunteer-management.js` | `volunteer-management` | `Volunteer Management` |
| `04-reports.js` | `reports` | `SWAT Reports` |
| `05-events.js` | `events` | `Events & Serve Days` |
| `06-volunteer-notifications.js` | `volunteer-notifications` | `Volunteer Notifications` |
| `07-captain-management.js` | `captain-management` | `Captain Management` |
| `08-settings.js` | `settings` | `Settings & Datastore` |

**docs/user-guides/content/team-captains/:**

| File | slug | title | comingSoon |
|------|------|-------|------------|
| `00-quick-start.js` | `quick-start` | `Quick Start` | `false` |
| `01-my-projects.js` | `my-projects` | `Home & My Projects` | `false` |
| `02-project-details.js` | `project-details` | `Project Details` | `false` |
| `03-volunteers.js` | `volunteers` | `Managing Volunteers` | `false` |
| `04-tasks.js` | `tasks` | `Tasks` | `false` |
| `05-expenses.js` | `expenses` | `Expenses & Reimbursements` | `true` |
| `06-photos-notes.js` | `photos-notes` | `Photos & Notes` | `false` |
| `07-requesting-help.js` | `requesting-help` | `Requesting Help & Event Association` | `false` |

All SWAT Leaders files get `comingSoon: false`. All Team Captains files get `comingSoon: false` **except** `05-expenses.js` which is `true`.

The engineer can write the real body content in Phase 4 (Tasks 16 and 17) after screenshots exist.

- [ ] **Step 3: Run build with empty content**

Run: `cd docs/user-guides && node build.js`
Expected:
```
Building: swat-leaders, team-captains
  ✓ dist/swat-leaders.html
  ✓ ../../portal/src/pages/help/generated/swat-leaders.jsx
  ✓ dist/team-captains.html
  ✓ ../../portal/src/pages/help/generated/team-captains.jsx
```

- [ ] **Step 4: Inspect outputs**

Run: `open docs/user-guides/dist/swat-leaders.html`
Expected: Renders with branded header, empty section stubs, TOC links.

- [ ] **Step 5: Commit**

```bash
git add docs/user-guides/build.js docs/user-guides/content/ docs/user-guides/dist/ portal/src/pages/help/generated/
git commit -m "feat(user-guides): add build orchestrator and placeholder content"
```

---

## Phase 2 — Portal Integration

### Task 7: Create `HelpLayout.jsx`

**Files:**
- Create: `portal/src/pages/help/HelpLayout.jsx`
- Create: `portal/src/pages/help/help.css`

- [ ] **Step 1: Create `help.css`**

```css
/* portal/src/pages/help/help.css */
.help-container {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 16px;
}
.help-toc {
  position: sticky;
  top: 16px;
  align-self: start;
  background: var(--color-base-100, #ffffff);
  border: 1px solid var(--color-base-300, #e2e8f0);
  border-radius: 8px;
  padding: 16px;
}
.help-toc ol { list-style: decimal; padding-left: 20px; margin: 0; }
.help-toc li { margin: 4px 0; }
.help-toc a { color: inherit; text-decoration: none; display: block; padding: 2px 0; }
.help-toc a:hover { color: var(--color-primary, #2563eb); }
.help-toc .help-badge {
  background: #0ea5e9; color: #fff; border-radius: 4px;
  font-size: 10px; padding: 2px 6px; margin-left: 4px;
}
.help-section {
  background: var(--color-base-100, #ffffff);
  border: 1px solid var(--color-base-300, #e2e8f0);
  border-radius: 8px;
  padding: 32px; margin-bottom: 24px;
}
.help-section h2 { margin-top: 0; border-bottom: 2px solid var(--color-primary, #2563eb); padding-bottom: 8px; }
.help-section-purpose { font-style: italic; color: var(--color-base-content, #64748b); }
.help-step { padding: 16px 0; border-bottom: 1px dashed var(--color-base-300, #e2e8f0); }
.help-step:last-child { border-bottom: 0; }
.help-step h3 { margin: 0 0 8px 0; }
.screenshot { margin: 16px 0; text-align: center; }
.screenshot img { max-width: 100%; height: auto; border: 1px solid var(--color-base-300, #e2e8f0); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.help-callout { border-left: 4px solid #0ea5e9; background: #eff6ff; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
.help-callout-coming-soon { border-left-color: #f59e0b; background: #fef3c7; }
.help-callout ul { margin: 8px 0 0 0; padding-left: 20px; }
.help-fields dl { display: grid; grid-template-columns: 180px 1fr; gap: 8px 16px; }
.help-fields dt { font-weight: 600; }
@media (max-width: 768px) {
  .help-container { grid-template-columns: 1fr; }
  .help-toc { position: relative; }
}
```

- [ ] **Step 2: Create `HelpLayout.jsx`**

```jsx
// portal/src/pages/help/HelpLayout.jsx
import './help.css';
import PropTypes from 'prop-types';
import { PageTitle } from '../../atoms/PageTitle.jsx';

export function HelpLayout({ title, sections = [], children }) {
  return (
    <div className="gutter">
      <PageTitle title={title} />
      <div className="help-container">
        <nav className="help-toc" aria-label="Table of contents">
          <ol>
            {sections.map(s => (
              <li key={s.slug}>
                <a href={`#${s.slug}`}>
                  {s.title}
                  {s.comingSoon ? <span className="help-badge">Coming Soon</span> : null}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="help-content">{children}</div>
      </div>
    </div>
  );
}

HelpLayout.propTypes = {
  title: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      slug: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      comingSoon: PropTypes.bool,
    }),
  ),
  children: PropTypes.node,
};
```

- [ ] **Step 3: Verify `PageTitle` exists or substitute**

Run: `ls portal/src/atoms/PageTitle.jsx`

If it doesn't exist, replace `<PageTitle title={title} />` with `<h1 className="text-2xl font-semibold">{title}</h1>` — check how other admin pages title themselves by reading `portal/src/pages/admin/Reports.jsx` first.

- [ ] **Step 4: Commit**

```bash
git add portal/src/pages/help/HelpLayout.jsx portal/src/pages/help/help.css
git commit -m "feat(help): add HelpLayout component"
```

---

### Task 8: Create role-specific guide pages

**Files:**
- Create: `portal/src/pages/help/SwatLeadersGuide.jsx`
- Create: `portal/src/pages/help/TeamCaptainsGuide.jsx`
- Create: `portal/src/pages/help/HelpRouting.jsx`

- [ ] **Step 1: Create `SwatLeadersGuide.jsx`**

```jsx
// portal/src/pages/help/SwatLeadersGuide.jsx
import { HelpLayout } from './HelpLayout.jsx';
import Content, { sections } from './generated/swat-leaders.jsx';

export function SwatLeadersGuide() {
  return (
    <HelpLayout title="SWAT Leadership Guide" sections={sections}>
      <Content />
    </HelpLayout>
  );
}
```

- [ ] **Step 2: Create `TeamCaptainsGuide.jsx`**

```jsx
// portal/src/pages/help/TeamCaptainsGuide.jsx
import { HelpLayout } from './HelpLayout.jsx';
import Content, { sections } from './generated/team-captains.jsx';

export function TeamCaptainsGuide() {
  return (
    <HelpLayout title="Team Captain Guide" sections={sections}>
      <Content />
    </HelpLayout>
  );
}
```

- [ ] **Step 3: Create `HelpRouting.jsx`**

```jsx
// portal/src/pages/help/HelpRouting.jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { SwatLeadersGuide } from './SwatLeadersGuide.jsx';
import { TeamCaptainsGuide } from './TeamCaptainsGuide.jsx';

export function HelpRouting() {
  const { isLeadership, isAdmin } = useRoles();
  const canSeeLeadershipGuide = isLeadership || isAdmin;
  return (
    <Routes>
      <Route
        path="swat-leaders"
        element={canSeeLeadershipGuide ? <SwatLeadersGuide /> : <Navigate to="team-captains" replace />}
      />
      <Route path="team-captains" element={<TeamCaptainsGuide />} />
      <Route
        path="*"
        element={<Navigate to={canSeeLeadershipGuide ? 'swat-leaders' : 'team-captains'} replace />}
      />
    </Routes>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add portal/src/pages/help/SwatLeadersGuide.jsx portal/src/pages/help/TeamCaptainsGuide.jsx portal/src/pages/help/HelpRouting.jsx
git commit -m "feat(help): add role-specific guide routes"
```

---

### Task 9: Wire `/help/*` into PrivateRoutes

**Files:**
- Modify: `portal/src/pages/PrivateRoutes.jsx`

- [ ] **Step 1: Read the file to confirm current shape**

Run: `cat portal/src/pages/PrivateRoutes.jsx | head -30`
Expected: See the `lazy()` imports block and route list.

- [ ] **Step 2: Add lazy import for HelpRouting**

In `portal/src/pages/PrivateRoutes.jsx`, after the `AdminRouting` import on line 24, add:

```jsx
const HelpRouting = lazy(() => import('./help/HelpRouting.jsx').then(m => ({ default: m.HelpRouting })));
```

- [ ] **Step 3: Register the route**

Inside the inner `<Routes>` block, right after `<Route path="/admin/*" element={<AdminRouting />} />`, add:

```jsx
<Route path="/help/*" element={<HelpRouting />} />
```

- [ ] **Step 4: Verify the portal dev server boots**

Run: `cd portal && yarn start` (in background)
Expected: Dev server starts on port 3000 without error.

Browse to `http://localhost:3000/#/help/team-captains`. Expected: Empty guide renders with branded layout and TOC.

Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add portal/src/pages/PrivateRoutes.jsx
git commit -m "feat(help): register /help/* routes"
```

---

### Task 10: Add "Help" entry to hamburger menu

**Files:**
- Modify: `portal/src/components/header/Header.jsx`

- [ ] **Step 1: Read the `getMenuItems` function**

Run: `sed -n '197,240p' portal/src/components/header/Header.jsx`
Expected: See `getMenuItems(profile, roles, { hasNominations })`.

- [ ] **Step 2: Add Help group**

In `getMenuItems`, after the Admin group block (ends around line 228), and before the `profile?.spaceAdmin && { title: 'System Admin', ... }` block, add a Help group that appears for all logged-in users:

```jsx
{
  title: 'Help',
  items: [
    (isAdmin || isLeadership) && { label: 'SWAT Leadership Guide', to: '/help/swat-leaders', icon: 'book' },
    { label: 'Team Captain Guide', to: '/help/team-captains', icon: 'book' },
  ].filter(Boolean),
},
```

This block is always included in the array since it has no outer guard — it will render for every authenticated user. The `(isAdmin || isLeadership) &&` inline check hides the leadership guide link for non-leaders.

- [ ] **Step 3: Verify icon name**

Run: `rg "icon: '" portal/src/components/header/Header.jsx | head`
Expected: existing icon names like `heart-handshake`, `calendar-heart`. Confirm `book` is a valid Tabler icon name by checking `portal/src/atoms/Icon.jsx` or test in dev.

If `book` isn't available, substitute `help` or `info-circle`.

- [ ] **Step 4: Verify in dev**

Run: `cd portal && yarn start`. Log in, open hamburger menu.
Expected: "Help" section visible with one or two entries depending on role.

- [ ] **Step 5: Commit**

```bash
git add portal/src/components/header/Header.jsx
git commit -m "feat(help): add Help menu entry with role-aware links"
```

---

### Task 11: Root-level `yarn help:build` script

**Files:**
- Modify: `package.json` (repo root)

- [ ] **Step 1: Check current root package.json scripts**

Run: `cat package.json`

- [ ] **Step 2: Add scripts**

Add under `"scripts"`:

```json
"help:build": "cd docs/user-guides && yarn build",
"help:capture": "cd docs/user-guides && yarn capture",
"help:test": "cd docs/user-guides && yarn test"
```

If no root `package.json` exists with scripts, create one:

```json
{
  "name": "customer-project-waterboyz",
  "private": true,
  "scripts": {
    "help:build": "cd docs/user-guides && yarn build",
    "help:capture": "cd docs/user-guides && yarn capture",
    "help:test": "cd docs/user-guides && yarn test"
  }
}
```

- [ ] **Step 3: Verify script works**

Run: `yarn help:build`
Expected: Same output as Task 6 step 3.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add help:build/capture/test root scripts"
```

---

## Phase 3 — Playwright Capture

### Task 12: Capture helpers (login, redaction)

**Files:**
- Create: `docs/user-guides/capture-helpers.ts`

- [ ] **Step 1: Create `capture-helpers.ts`**

```ts
// docs/user-guides/capture-helpers.ts
import { Page } from '@playwright/test';

export async function login(page: Page, baseUrl: string, username: string, password: string) {
  await page.goto(`${baseUrl}/#/`);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`${baseUrl}/#/`);
  // Wait for layout to stabilize
  await page.waitForLoadState('networkidle');
}

/**
 * Inject a blur style for specified selectors before taking a screenshot.
 * Selectors passed here are blurred in-place.
 */
export async function blurSelectors(page: Page, selectors: string[]) {
  if (selectors.length === 0) return;
  await page.addStyleTag({
    content: `
      ${selectors.join(', ')} {
        filter: blur(6px) !important;
        color: transparent !important;
        text-shadow: 0 0 8px rgba(0,0,0,0.6);
      }
    `,
  });
}

/**
 * Capture a screenshot to docs/user-guides/screenshots/<outPath>.
 * If locator is provided, only that element is screenshotted (cropped).
 */
export async function capture(page: Page, outPath: string, locatorSelector?: string) {
  const fullPath = `screenshots/${outPath}`;
  const target = locatorSelector ? page.locator(locatorSelector) : page;
  await target.screenshot({ path: fullPath });
  console.log(`  ✓ ${fullPath}`);
}

export async function openHamburger(page: Page) {
  await page.locator('button:has(svg.tabler-icon-menu-2)').click();
  await page.locator('[data-scope="popover"][data-part="content"]').waitFor({ state: 'visible' });
}
```

- [ ] **Step 2: Commit**

```bash
git add docs/user-guides/capture-helpers.ts
git commit -m "feat(user-guides): add capture helpers (login, blur, screenshot)"
```

---

### Task 13: Capture script

**Files:**
- Create: `docs/user-guides/capture.ts`

- [ ] **Step 1: Create `capture.ts`**

```ts
// docs/user-guides/capture.ts
/**
 * Playwright screenshot capture for Waterboyz user guides.
 *
 * Usage:  yarn capture [--role swat-leaders|team-captains]
 *
 * Requires docs/user-guides/.env with credentials and SAMPLE_* record IDs.
 */
import { chromium, Browser } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login, blurSelectors, capture, openHamburger } from './capture-helpers';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.PW_BASE_URL || 'https://waterboyz.kinops.io';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

fs.mkdirSync(path.join(__dirname, 'screenshots', 'swat-leaders'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'screenshots', 'team-captains'), { recursive: true });

async function captureSwatLeaders(browser: Browser) {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await login(page, BASE_URL, required('PW_LEADER_USERNAME'), required('PW_LEADER_PASSWORD'));

  // --- Home / Admin Navigation ---
  await capture(page, 'swat-leaders/home.png');
  await openHamburger(page);
  await capture(page, 'swat-leaders/admin-menu.png', '[data-scope="popover"][data-part="content"]');
  await page.keyboard.press('Escape');

  // --- Volunteer Management ---
  await page.goto(`${BASE_URL}/#/admin/volunteer-management`);
  await page.waitForLoadState('networkidle');
  // Blur volunteer name/email columns since these are aggregate (real PII)
  await blurSelectors(page, [
    '[data-locator="vm-name-cell"]',
    '[data-locator="vm-email-cell"]',
    '[data-locator="vm-phone-cell"]',
  ]);
  await capture(page, 'swat-leaders/vm-table.png');

  // Open detail drawer for sample volunteer
  const sampleVolunteerId = required('SAMPLE_VOLUNTEER_ID');
  await page.goto(`${BASE_URL}/#/admin/volunteer-management?open=${sampleVolunteerId}`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/vm-drawer.png');
  // ... add remaining recipes per section ...

  // --- Reports ---
  await page.goto(`${BASE_URL}/#/admin/reports`);
  await page.waitForLoadState('networkidle');
  await blurSelectors(page, [
    '[data-locator="reports-project-row"] td:nth-child(1)',
    '[data-locator="reports-family-name"]',
  ]);
  await capture(page, 'swat-leaders/reports-dashboard.png');

  // --- Events ---
  await page.goto(`${BASE_URL}/#/events`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/events-list.png');

  const sampleEventId = required('SAMPLE_EVENT_ID');
  await page.goto(`${BASE_URL}/#/events/${sampleEventId}/assign`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/events-assign.png');

  // --- Settings ---
  await page.goto(`${BASE_URL}/#/settings/datastore`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'swat-leaders/settings-datastore.png');

  // Mobile pass
  await context.close();
  const mobileCtx = await browser.newContext({ viewport: MOBILE });
  const mpage = await mobileCtx.newPage();
  await login(mpage, BASE_URL, required('PW_LEADER_USERNAME'), required('PW_LEADER_PASSWORD'));
  await mpage.goto(`${BASE_URL}/#/admin/volunteer-management`);
  await mpage.waitForLoadState('networkidle');
  await blurSelectors(mpage, ['[data-locator="vm-name-cell"]', '[data-locator="vm-email-cell"]']);
  await capture(mpage, 'swat-leaders/vm-mobile-cards.png');
  await mobileCtx.close();
}

async function captureTeamCaptains(browser: Browser) {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await login(page, BASE_URL, required('PW_CAPTAIN_USERNAME'), required('PW_CAPTAIN_PASSWORD'));

  await capture(page, 'team-captains/home.png');

  const sampleProjectId = required('SAMPLE_PROJECT_ID');
  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/details`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-details.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/volunteers`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-volunteers.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/tasks`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-tasks.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/photos`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-photos.png');

  await page.goto(`${BASE_URL}/#/project-captains/${sampleProjectId}/notes`);
  await page.waitForLoadState('networkidle');
  await capture(page, 'team-captains/project-notes.png');

  await context.close();
}

async function main() {
  const roleArg = process.argv.find(a => a.startsWith('--role='))?.split('=')[1];
  const browser = await chromium.launch();
  try {
    if (!roleArg || roleArg === 'swat-leaders') await captureSwatLeaders(browser);
    if (!roleArg || roleArg === 'team-captains') await captureTeamCaptains(browser);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Important:** This script is a starting skeleton. Each individual screenshot recipe (e.g. "filter by skill", "drag to assign") is added incrementally as each content section is written in Phase 5. The script must be rerunnable and idempotent.

- [ ] **Step 2: Verify it type-checks**

Run: `cd docs/user-guides && npx tsx --check capture.ts` (or `npx tsc --noEmit --module esnext --moduleResolution bundler --target es2022 capture.ts`)
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add docs/user-guides/capture.ts
git commit -m "feat(user-guides): add Playwright capture script"
```

---

### Task 14: Sample record checklist + `.env` file

**Files:**
- Create (not commit): `docs/user-guides/.env`

- [ ] **Step 1: Produce a checklist for the user**

Print the list of sample records the user must create in production before capture runs, or designate existing ones. Commit this list to `docs/user-guides/SAMPLE_RECORDS.md` so it's reference-able:

```markdown
# Sample Records for Screenshot Capture

Create (or designate) these records in the production `waterboyz` space. Fill their IDs into `.env` before running `yarn capture`.

| Env var | Form / Type | What to create |
|--------|-------------|----------------|
| `SAMPLE_FAMILY_ID` | `families` datastore | "Sample Family" with 2 family members |
| `SAMPLE_VOLUNTEER_ID` | `volunteers` datastore | Volunteer named "Sample Volunteer", realistic skills/tools |
| `SAMPLE_PROJECT_ID` | `swat-projects` datastore | Project "Sample Project", captain = sample volunteer, family = sample family |
| `SAMPLE_EVENT_ID` | `events` admin form | Event "Sample Serve Day", status Open, linked sample volunteer signup |
| `SAMPLE_NOMINATION_ID` | `swat-project-nomination` | Approved nomination tied to sample project |

**Do not delete these records.** The capture script depends on stable IDs.
```

- [ ] **Step 2: Commit checklist**

```bash
git add docs/user-guides/SAMPLE_RECORDS.md
git commit -m "docs: add sample-records checklist for screenshot capture"
```

- [ ] **Step 3: User creates records + fills `.env`**

**(Manual step for the human.)** Run `cp docs/user-guides/.env.example docs/user-guides/.env` and fill in credentials + sample IDs. Script must NOT commit `.env`.

---

### Task 15: First capture run

- [ ] **Step 1: Install Playwright browsers**

Run: `cd docs/user-guides && npx playwright install chromium`
Expected: Chromium downloaded.

- [ ] **Step 2: Run capture**

Run: `cd docs/user-guides && yarn capture`
Expected: `screenshots/swat-leaders/*.png` and `screenshots/team-captains/*.png` populated with ~20-25 PNGs each.

If any step errors (e.g. a selector doesn't match), fix the selector in `capture.ts`, push the recipe back to the queue, and re-run.

- [ ] **Step 3: Inspect screenshots visually**

Open `docs/user-guides/screenshots/` in Finder. Verify:
- No real PII visible in aggregate dashboards (blur applied)
- Sample records look polished
- Crops are clean

- [ ] **Step 4: Commit screenshots**

```bash
git add docs/user-guides/screenshots/
git commit -m "chore(user-guides): capture initial screenshots"
```

---

## Phase 4 — Content Writing

### Task 16: Write SWAT Leadership content

**Files:**
- Modify: each `docs/user-guides/content/swat-leaders/*.js`

For each section file:

- [ ] **Step 1:** Open the screenshot(s) that belong to this section
- [ ] **Step 2:** Write `purpose`, `howToGetThere`, `steps[]`, `fields[]`, `tips[]` against what you see. Keep `body` fields short — 2-3 sentences each. Use HTML inline tags sparingly (`<strong>`, `<code>`) — the React renderer uses `dangerouslySetInnerHTML` on `step.body`.
- [ ] **Step 3:** Reference screenshot paths as `swat-leaders/<filename>.png` (relative to `screenshots/`).
- [ ] **Step 4:** For the Quick Start section, produce a compact orientation: what the role does + 3 first actions + table of links to deeper sections.

Follow the `Section` shape:

```js
module.exports = {
  slug: 'volunteer-management',
  title: 'Volunteer Management',
  purpose: 'Search, filter, and manage the volunteer directory.',
  howToGetThere: {
    text: 'From the hamburger menu, open <strong>Admin → Volunteer Management</strong>.',
    screenshot: 'swat-leaders/vm-nav.png',
  },
  steps: [
    {
      heading: 'Filtering by skill',
      body: 'Click the Skills column header and select one or more skills...',
      screenshot: 'swat-leaders/vm-skill-filter.png',
    },
  ],
  fields: [
    { name: 'Service Area', description: 'Counties the volunteer is willing to travel to.' },
  ],
  tips: ['Removed assignments are soft-deleted — the record is preserved for history.'],
  comingSoon: false,
};
```

- [ ] **Step 5:** Run `yarn help:build` after each file to verify it parses and renders.

- [ ] **Step 6: Commit each section as you complete it**

```bash
git add docs/user-guides/content/swat-leaders/
git commit -m "docs(user-guides): write SWAT leadership content"
```

---

### Task 17: Write Team Captain content

Repeat Task 16 for every file under `docs/user-guides/content/team-captains/`. For `05-expenses.js`, set `comingSoon: true` and leave `steps: []` — the renderer will emit a Coming Soon callout only.

- [ ] **Step 1-5:** As in Task 16.
- [ ] **Step 6: Commit**

```bash
git add docs/user-guides/content/team-captains/
git commit -m "docs(user-guides): write team captain content"
```

---

## Phase 5 — Final Build & Verification

### Task 18: Final build

- [ ] **Step 1: Run full build**

Run: `yarn help:build`
Expected: Both `dist/*.html` and `portal/src/pages/help/generated/*.jsx` regenerated, screenshots copied into `portal/src/pages/help/assets/`.

- [ ] **Step 2: Run tests**

Run: `yarn help:test`
Expected: All unit tests pass.

- [ ] **Step 3: Preview standalone HTML**

Run: `yarn --cwd docs/user-guides preview:leaders`
Expected: Browser opens `dist/swat-leaders.html`, renders with all sections, screenshots, TOC, Coming Soon callouts.

Do the same for `preview:captains`.

- [ ] **Step 4: Test print layout**

In the browser preview, File → Print → Save as PDF. Verify:
- Sidebar TOC hidden
- Page breaks are clean
- Screenshots don't split across pages

- [ ] **Step 5: Portal dev server test**

Run: `cd portal && yarn start`

Manually verify:
- Log in as a SWAT Leader (anyone with leadership role). Open hamburger → Help → SWAT Leadership Guide. Guide renders with full content, TOC anchors work, Coming Soon badges visible on Expenses (in Team Captain guide).
- Log out, log in as a Team Captain. Open hamburger → Help → Team Captain Guide renders. SWAT Leadership Guide link NOT visible.
- Try `/help/swat-leaders` directly as a non-leader — redirected to `team-captains`.
- Confirm screenshots load from the bundled assets (check Network tab — paths should be Vite-hashed, not `/help/assets/foo.png` plainly).

- [ ] **Step 6: Verify screenshots are NOT publicly reachable**

Run (from an unauthenticated browser/incognito):
- Visit `https://waterboyz.kinops.io/app/spa/help/assets/<any-screenshot>.png`

Expected: 404 or redirected to login — screenshots are bundled into the authenticated JS chunk, not in `portal/public/`.

- [ ] **Step 7: Lint**

Run: `cd portal && yarn lint`
Expected: No new lint errors.

- [ ] **Step 8: Commit final outputs**

```bash
git add docs/user-guides/dist/ portal/src/pages/help/
git commit -m "docs(user-guides): initial comprehensive guides with screenshots"
```

---

### Task 19: Final self-review against acceptance criteria

- [ ] **Step 1:** Walk down the spec's Acceptance Criteria list:
  - `node docs/user-guides/build.js` produces both outputs ✓
  - `yarn help:capture` works against production with hybrid PII approach ✓
  - `/help/swat-leaders` and `/help/team-captains` render in the authenticated portal ✓
  - Screenshots NOT publicly reachable ✓
  - Hamburger menu has role-aware Help entry ✓
  - Standalone HTML is self-contained and print-friendly ✓
  - Expenses shows Coming Soon callout ✓

- [ ] **Step 2:** If any criterion fails, create a follow-up task and fix before declaring done.

- [ ] **Step 3:** Notify user that docs are ready; suggest they review the standalone HTML in `dist/` and the in-portal guides before considering this closed.

---

## Testing Notes

- **Unit tests:** `node:test` in `docs/user-guides/tests/` — covers content loader + both renderers.
- **Integration:** Playwright capture script + manual browser verification at the end.
- **No automated UI tests** for the in-portal guide rendering — manual verification on dev server is sufficient given the content is semi-static.

## Gotchas

- **Coming Soon sections** omit walkthrough screenshots — the content file simply sets `comingSoon: true` and the renderer skips everything except purpose + callout.
- **Route wiring:** portal uses `HashRouter` (URLs have `/#/`) — both capture.ts and manual testing must use the `#/...` style paths.
- **Vite + PNG import:** importing PNGs from outside `src/` requires the asset to be inside `portal/src/pages/help/assets/` (which is inside `src/`) — build.js copies from `docs/user-guides/screenshots/` into there, don't rely on out-of-tree imports.
- **`dangerouslySetInnerHTML`:** used in the React renderer for `step.body` to allow inline `<strong>`/`<code>`. Content authors must not inject untrusted HTML — this is author-controlled markdown-lite, not user input.
- **Production capture risk:** capture.ts must never create, update, or delete any data. All visited URLs are read-only views. Any form state filled in must be cancelled before moving on. If a screenshot requires a filled form, use a sample record that already has the data, don't submit new data.
