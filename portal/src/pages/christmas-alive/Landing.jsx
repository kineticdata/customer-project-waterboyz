import t from 'prop-types';
import { Link } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { useChristmasAlive } from './hooks/useChristmasAlive.js';

const Card = ({ to, icon, title, body, cta }) => (
  <Link to={to} className="ca-card flex-c-st gap-2 p-5 no-underline text-base-content">
    <span className="flex-sc gap-3">
      <span className="flex-cc size-10 rounded-full bg-base-200 text-accent flex-none">
        <Icon name={icon} size={22} />
      </span>
      <span className="text-h3 font-semibold">{title}</span>
    </span>
    <p className="text-sm text-base-content/75 m-0">{body}</p>
    <span className="flex-sc gap-1 text-sm font-semibold text-accent mt-1">
      {cta}
      <Icon name="chevron-right" size={16} />
    </span>
  </Link>
);

Card.propTypes = {
  to: t.string.isRequired,
  icon: t.string.isRequired,
  title: t.string.isRequired,
  body: t.string.isRequired,
  cta: t.string.isRequired,
};

/**
 * Christmas Alive landing page.
 *
 * Leads with the campaign's own line from the brand guidelines, and gives
 * sponsoring -- the thing most visitors came to do -- the one red button.
 * Nominating and reviewing are quieter cards below.
 *
 * Cards are filtered by what the person can actually do: a sponsor who is not
 * a nominator sees no hint that the others exist. Nothing renders disabled.
 */
export const Landing = () => {
  const { season, inSeason, canNominate, isCAAdmin, loading, error } =
    useChristmasAlive();

  if (loading) return null;

  // Sponsors can only act during the season; admins run the pipeline year-round.
  const sponsoringOpen = inSeason;

  return (
    <div className="flex-c-st gap-8 max-w-screen-lg">
      <section className="ca-card ca-card-hero flex-c-st gap-4 p-6 md:p-10">
        {/* Three short sentences, three lines: the rhythm is the message. */}
        <h1 className="text-[2rem] leading-[2.5rem] md:text-[2.75rem] md:leading-[3.25rem] m-0">
          <span className="block">Sponsor a family.</span>
          <span className="block">Show up.</span>
          <span className="block">Change a Christmas.</span>
        </h1>
        <p className="text-base md:text-lg text-base-content/80 m-0 max-w-prose leading-relaxed">
          Christmas Alive matches families with neighbors who provide their
          Christmas &mdash; gifts for every child
          in the home{season ? `, this ${season} season` : ''}. One sponsor, one
          family, one Christmas.
        </p>
        <div className="flex-sc gap-3 flex-wrap mt-1">
          {sponsoringOpen ? (
            <Link to="/christmas-alive/families" className="kbtn kbtn-accent kbtn-lg">
              <Icon name="gift" size={20} />
              Sponsor a family
            </Link>
          ) : (
            !error && (
              <p className="flex-sc gap-2 text-base-content/80 m-0">
                <Icon name="calendar" size={18} className="text-accent" />
                Sponsorship opens each September. Check back then to choose a
                family.
              </p>
            )
          )}
          <Link
            to="/christmas-alive/my-sponsorships"
            className="kbtn kbtn-ghost kbtn-lg"
          >
            <Icon name="heart" size={20} />
            My sponsorships
          </Link>
        </div>
      </section>

      {(canNominate || isCAAdmin) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {canNominate && (
            <Card
              to="/christmas-alive/nominate"
              icon="user-plus"
              title="Nominate a family"
              body="Know a family who could use a Christmas this year? Tell us about them and a Christmas Alive admin will review it."
              cta="Start a nomination"
            />
          )}
          {isCAAdmin && (
            <Card
              to="/christmas-alive/nominators"
              icon="user-check"
              title="Manage nominators"
              body="Choose who can nominate families for Christmas Alive. Add partner churches and organizations, or remove access."
              cta="Open nominators"
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
      )}

      {error && (
        <div className="kalert kalert-error kalert-soft">
          <Icon name="alert-triangle" size={20} />
          <span>
            We couldn&rsquo;t load the Christmas Alive season settings, so
            sponsoring is unavailable. Please tell an administrator.
          </span>
        </div>
      )}
    </div>
  );
};
