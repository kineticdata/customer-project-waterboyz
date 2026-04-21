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
