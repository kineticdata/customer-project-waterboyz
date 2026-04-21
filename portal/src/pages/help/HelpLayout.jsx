// portal/src/pages/help/HelpLayout.jsx
import './help.css';
import PropTypes from 'prop-types';

// Plain <a href="#slug"> would trip HashRouter and push the user to a broken
// route. Scroll the section into view imperatively instead.
const scrollTo = slug => () => {
  document
    .getElementById(slug)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export function HelpLayout({ title, sections = [], children }) {
  return (
    <div className="gutter">
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
      <div className="help-container">
        <nav className="help-toc" aria-label="Table of contents">
          <ol>
            {sections.map(s => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={scrollTo(s.slug)}
                  className="help-toc-link"
                >
                  {s.title}
                  {s.comingSoon ? <span className="help-badge">Coming Soon</span> : null}
                </button>
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
