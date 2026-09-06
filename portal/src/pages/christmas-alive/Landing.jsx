import { Link } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { useChristmasAlive } from './hooks/useChristmasAlive.js';

const Card = ({ to, icon, title, body, cta }) => (
  <Link
    to={to}
    className="flex-c-st gap-2 p-5 rounded-lg border border-base-300 bg-base-100 no-underline text-base-content hover:border-accent"
  >
    <span className="flex-sc gap-2 text-accent">
      <Icon name={icon} size={24} />
      <span className="text-h3 font-bold text-base-content">{title}</span>
    </span>
    <p className="text-sm text-base-content/80 m-0">{body}</p>
    <span className="flex-sc gap-1 text-sm font-semibold text-accent mt-1">
      {cta}
      <Icon name="chevron-right" size={16} />
    </span>
  </Link>
);

/**
 * Christmas Alive landing page.
 *
 * Cards are filtered by what the person can actually do — a sponsor who is not
 * a nominator sees one card and no hint that others exist. Nothing here is
 * rendered disabled.
 */
export const Landing = () => {
  const { season, inSeason, canNominate, isCAAdmin, loading, error } =
    useChristmasAlive();

  if (loading) return null;

  // Sponsors can only act during the season; admins run the pipeline year-round.
  const sponsoringOpen = inSeason;

  return (
    <div className="flex-c-st gap-6 max-w-screen-lg">
      <div className="flex-c-st gap-2">
        <h1 className="text-h1 font-bold m-0">
          Christmas for every family{season ? `, ${season}` : ''}
        </h1>
        <p className="text-base-content/80 m-0 max-w-prose">
          Waterboyz matches families in need with people who provide their
          Christmas. Choose a family to sponsor, recommend a family who needs
          one, or review the nominations that have come in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sponsoringOpen && (
          <Card
            to="/christmas-alive/families"
            icon="gift"
            title="Sponsor a family"
            body="Choose a family and provide their Christmas. You'll get their details and a shopping guide by email."
            cta="Browse families"
          />
        )}
        {canNominate && (
          <Card
            to="/christmas-alive/nominate"
            icon="user-plus"
            title="Nominate a family"
            body="Recommend a family in your community to receive Christmas gifts. A Christmas Alive admin will review it."
            cta="Start a nomination"
          />
        )}
        {isCAAdmin && (
          <Card
            to="/christmas-alive/approvals"
            icon="checklist"
            title="Review nominations"
            body="Approve families for sponsorship, catch duplicates, and export the family list at any stage."
            cta="Open the review queue"
          />
        )}
      </div>

      {error ? (
        <div className="kalert kalert-error kalert-soft">
          <Icon name="alert-triangle" size={20} />
          <span>
            We couldn&rsquo;t load the Christmas Alive season settings, so
            sponsoring is unavailable. Please tell an administrator.
          </span>
        </div>
      ) : (
        !sponsoringOpen && (
          <div className="kalert kalert-info kalert-soft">
            <Icon name="calendar" size={20} />
            <span>
              Sponsorship opens each September. Check back then to choose a
              family.
            </span>
          </div>
        )
      )}

      <Link
        to="/christmas-alive/my-sponsorships"
        className="flex-sc gap-2 text-sm font-medium"
      >
        <Icon name="heart" size={16} />
        See the families you&rsquo;ve sponsored
      </Link>
    </div>
  );
};
