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
