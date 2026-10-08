import { Link } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { CA_WISH_LIST_URL } from '../../helpers/christmasAlive.js';
import { useChristmasAlive } from '../../pages/christmas-alive/hooks/useChristmasAlive.js';

/**
 * Seasonal Christmas Alive call to action, rendered INSIDE the home hero.
 *
 * It sits in the hero's existing CTA row and uses the same `kbtn kbtn-accent`
 * language the hero already uses, so it reads as part of the page rather than
 * a banner bolted above it.
 *
 * Self-gating: renders nothing while loading, on error, or out of season, so
 * it can never break a SWAT home page. The window comes from the Christmas
 * Alive `programs` record, so leadership moves the dates without a deploy.
 */
export const ChristmasAliveHeroCta = ({ className = 'mt-6' }) => {
  const { season, inSeason, loading } = useChristmasAlive();

  if (loading || !inSeason) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Link to="/christmas-alive" className="kbtn kbtn-accent kbtn-lg">
        <Icon name="christmas-tree" size={20} />
        Christmas Alive
      </Link>
      <span className="text-primary-content/70 text-sm">
        {season} season is open &middot;{' '}
        <a
          href={CA_WISH_LIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-content underline underline-offset-2 hover:text-primary-content/80"
        >
          give through our Amazon Wish List
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </span>
    </div>
  );
};
