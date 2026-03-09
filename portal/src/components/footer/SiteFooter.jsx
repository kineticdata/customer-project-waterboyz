import { Link } from 'react-router-dom';

export const SiteFooter = () => (
  <div className="gutter py-6 mt-auto">
    <div className="flex-cc gap-3 flex-wrap text-xs text-base-content/40">
      <span>
        Powered by{' '}
        <a
          href="https://kineticdata.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:text-base-content/60 transition-colors"
        >
          Kinetic Data
        </a>
      </span>
      <span className="hidden sm:inline">·</span>
      <Link
        to="/privacy"
        className="hover:text-base-content/60 transition-colors"
      >
        Privacy Notice
      </Link>
    </div>
  </div>
);
