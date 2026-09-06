import t from 'prop-types';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../../atoms/Icon.jsx';
import { useChristmasAlive } from './hooks/useChristmasAlive.js';

/**
 * Page shell for the Christmas Alive program.
 *
 * This is NOT a header replacement — the global Header and SiteFooter still
 * come from PrivateRoutes and are deliberately unchanged. What this adds is a
 * bronze program band and an in-page subnav, so someone can tell at a glance
 * which program they are in and move between its pages without the global nav
 * having to know anything about Christmas Alive.
 *
 * Bronze is the existing `accent` token (#B2812C) from the Waterboyz brand.
 * SWAT keeps `primary` (#0075a9). No new colors.
 */
export const ChristmasAliveLayout = ({ children }) => {
  const { season, canNominate, isCAAdmin } = useChristmasAlive();

  const links = [
    { to: '/christmas-alive/families', label: 'Sponsor a family', icon: 'gift', show: true },
    { to: '/christmas-alive/my-sponsorships', label: 'My sponsorships', icon: 'heart', show: true },
    { to: '/christmas-alive/nominate', label: 'Nominate a family', icon: 'user-plus', show: canNominate },
    { to: '/christmas-alive/approvals', label: 'Approvals', icon: 'checklist', show: isCAAdmin },
    { to: '/christmas-alive/all-families', label: 'All families', icon: 'table', show: isCAAdmin },
  ].filter(l => l.show);

  return (
    <div className="flex-c-st min-h-full">
      <div className="bg-accent text-accent-content">
        <div className="gutter py-5">
          <NavLink to="/christmas-alive" className="flex-sc gap-3 no-underline text-accent-content">
            <Icon name="christmas-tree" size={28} />
            <span className="flex-c-st">
              <span className="text-h2 font-bold leading-tight">Christmas Alive</span>
              {season && (
                <span className="text-sm opacity-90">{season} season</span>
              )}
            </span>
          </NavLink>
        </div>

        {links.length > 1 && (
          <nav className="gutter" aria-label="Christmas Alive">
            <ul className="flex-ss gap-1 list-none p-0 m-0 overflow-x-auto">
              {links.map(({ to, label, icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      clsx(
                        'flex-sc gap-2 px-3 py-2 rounded-t-lg no-underline whitespace-nowrap text-sm font-medium',
                        isActive
                          ? 'bg-base-100 text-base-content'
                          : 'text-accent-content/80 hover:text-accent-content',
                      )
                    }
                  >
                    <Icon name={icon} size={16} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div className="gutter py-6 flex-1">{children}</div>
    </div>
  );
};

ChristmasAliveLayout.propTypes = { children: t.node };
