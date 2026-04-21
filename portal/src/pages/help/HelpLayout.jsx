// portal/src/pages/help/HelpLayout.jsx
import './help.css';
import PropTypes from 'prop-types';

export function HelpLayout({ title, sections = [], children }) {
  return (
    <div className="gutter">
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
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
