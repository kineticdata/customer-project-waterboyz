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
