import { Link } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { useChristmasAlive } from '../../pages/christmas-alive/hooks/useChristmasAlive.js';

/**
 * Seasonal entry point to the Christmas Alive portal.
 *
 * Shows on every role's home page while the season is open, and disappears
 * outside it. The window comes from the Christmas Alive `programs` record, so
 * leadership moves the dates without a deploy.
 *
 * Uses the brand bronze (`accent`) rather than SWAT blue (`primary`), so it is
 * legible at a glance as a different program.
 */
export const ChristmasAliveBanner = () => {
  const { season, inSeason, loading } = useChristmasAlive();

  if (loading || !inSeason) return null;

  return (
    <div className="gutter mt-4">
      <Link
        to="/christmas-alive"
        className="max-w-screen-xl mx-auto flex-bc gap-4 p-4 rounded-lg bg-accent text-accent-content no-underline flex-wrap"
      >
        <span className="flex-sc gap-3">
          <Icon name="christmas-tree" size={28} className="flex-none" />
          <span className="flex-c-st">
            <span className="font-bold text-lg leading-tight">
              Christmas Alive{season ? ` ${season}` : ''} is open
            </span>
            <span className="text-sm opacity-90">
              Sponsor a family and provide their Christmas
            </span>
          </span>
        </span>
        <span className="flex-sc gap-1 font-semibold">
          Get started
          <Icon name="chevron-right" size={18} />
        </span>
      </Link>
    </div>
  );
};
