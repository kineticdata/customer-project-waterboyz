import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';

export const PublicLayout = ({ children }) => (
  <div className="flex-c-st min-h-screen bg-base-200/30">
    {/* Header */}
    <nav className="flex-sc gap-3 h-16 px-4 md:px-6 bg-base-100 border-b border-base-200 shadow-sm">
      <Link to="/public/events" className="flex-initial" aria-label="Events">
        <img
          src={logo}
          alt="Waterboyz for Jesus"
          className="h-10 object-contain"
        />
      </Link>
      <div className="mx-auto" />
      <Link
        to="/login"
        className="kbtn kbtn-sm kbtn-ghost text-base-content/60"
      >
        Sign In
      </Link>
    </nav>

    {/* Content */}
    <div className="flex-auto">{children}</div>

    {/* Footer */}
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
        <span className="hidden sm:inline">&middot;</span>
        <Link
          to="/privacy"
          className="hover:text-base-content/60 transition-colors"
        >
          Privacy Notice
        </Link>
      </div>
    </div>
  </div>
);
