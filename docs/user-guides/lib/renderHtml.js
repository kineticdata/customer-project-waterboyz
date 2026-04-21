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
