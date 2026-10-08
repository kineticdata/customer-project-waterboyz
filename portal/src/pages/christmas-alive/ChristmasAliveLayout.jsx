import t from 'prop-types';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import '@fontsource/great-vibes/400.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/tinos/400-italic.css';
import '@fontsource/tinos/700.css';
import { Icon } from '../../atoms/Icon.jsx';
import { CA_WISH_LIST_URL } from '../../helpers/christmasAlive.js';
import { useChristmasAlive } from './hooks/useChristmasAlive.js';
import { StringLights } from './StringLights.jsx';

/**
 * Page shell for the Christmas Alive program, styled to the 2026 Christmas
 * Alive Brand Guidelines.
 *
 * Scope: this is NOT a header replacement. The global Waterboyz Header and
 * SiteFooter come from PrivateRoutes and are untouched. Everything themed
 * here hangs off `.ca-theme` (assets/styles/christmas-alive.css), which only
 * this layout carries, so no Waterboyz or SWAT page can pick it up. The brand
 * fonts are imported here too, so they only load when someone opens a
 * Christmas Alive page.
 *
 * The band: string lights strung along its top edge like a porch eave, the
 * "Christmas Alive" wordmark in Great Vibes (the one use of script on the
 * page, per the guidelines), the season year as the signature serif numeral,
 * the campaign line, and a link to the Amazon Wish List. The subnav sits at the band's foot, with the active
 * tab cut from the page colour below.
 */
export const ChristmasAliveLayout = ({ children }) => {
  const { season, canNominate, isCAAdmin } = useChristmasAlive();

  const links = [
    { to: '/christmas-alive/families', label: 'Sponsor a family', icon: 'gift', show: true },
    { to: '/christmas-alive/my-sponsorships', label: 'My sponsorships', icon: 'heart', show: true },
    { to: '/christmas-alive/nominate', label: 'Nominate a family', icon: 'user-plus', show: canNominate },
    { to: '/christmas-alive/approvals', label: 'Approvals', icon: 'checklist', show: isCAAdmin },
    { to: '/christmas-alive/all-families', label: 'All families', icon: 'table', show: isCAAdmin },
    { to: '/christmas-alive/nominators', label: 'Nominators', icon: 'user-check', show: isCAAdmin },
  ].filter(l => l.show);

  // flex-1: grow into the space between the global header and footer, so a
  // short page stays Frost Cream to the bottom instead of showing the app's
  // white background under it.
  return (
    <div className="ca-theme flex-c-st flex-1 w-full">
      <header className="ca-band print-hide">
        <StringLights className="pt-0.5" />

        <div className="gutter pt-3 pb-5 flex-bs gap-x-6 gap-y-2 flex-wrap">
          <NavLink
            to="/christmas-alive"
            className="flex-c-st no-underline"
            aria-label={`Christmas Alive${season ? ` ${season}` : ''} home`}
          >
            <span className="flex-ss gap-3">
              <span className="ca-script text-[2.75rem] md:text-[3.5rem] text-white">
                Christmas Alive
              </span>
              {season && (
                <span className="ca-numeral text-[1.375rem] md:text-[1.625rem] text-[var(--ca-gold)] mt-1">
                  {season}
                </span>
              )}
            </span>
          </NavLink>
          <p className="ca-tagline text-[1.375rem] md:text-[1.875rem] leading-tight m-0 self-end md:mb-1">
            &ldquo;Hope rides in.&rdquo;
          </p>
          {/* The one way to give that needs no family and no account, so it
              lives in the band on every page rather than behind a tab. */}
          <a
            href={CA_WISH_LIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ca-wishlist ml-auto self-center flex-sc gap-2 px-4 py-2 no-underline text-sm font-semibold whitespace-nowrap"
          >
            <Icon name="basket-heart" size={18} />
            Amazon Wish List
            <Icon name="external-link" size={14} className="opacity-70" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>

        {links.length > 1 && (
          <nav className="gutter" aria-label="Christmas Alive">
            <ul className="flex-ss gap-1 list-none p-0 m-0 overflow-x-auto">
              {links.map(({ to, label, icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={clsx(
                      'ca-tab flex-sc gap-2 px-4 py-2.5 no-underline whitespace-nowrap text-sm font-medium',
                    )}
                  >
                    <Icon name={icon} size={16} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <div className="gutter py-8 flex-1">{children}</div>
    </div>
  );
};

ChristmasAliveLayout.propTypes = { children: t.node };
