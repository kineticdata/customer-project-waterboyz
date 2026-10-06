import { Link } from 'react-router-dom';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { useChristmasAlive } from '../hooks/useChristmasAlive.js';
import { useMySponsorships } from '../hooks/useSponsorships.js';
import { describeHousehold, familyLabel } from '../../../helpers/christmasAlive.js';
import { formatLocalDate } from '../../../helpers/index.js';

/**
 * The families this person has sponsored.
 *
 * Exists so a sponsor who loses the email is never stuck calling the office,
 * and so there is always one authoritative place to check the family's details
 * before shopping or delivering.
 */
export const MySponsorships = () => {
  const { season, loading: seasonLoading } = useChristmasAlive();
  const { families, loading } = useMySponsorships(season);

  if (seasonLoading || loading) return <Loading />;

  return (
    <div className="flex-c-st gap-5 max-w-screen-md">
      <div className="flex-c-st gap-2">
        <h1 className="text-h1 font-bold m-0">Your sponsored families</h1>
        {families.length > 0 && (
          <p className="text-base-content/80 m-0 max-w-prose">
            The details here are always current. Your emailed copy is a snapshot
            from when you sponsored, so check this page before you shop or
            deliver.
          </p>
        )}
      </div>

      {families.length === 0 ? (
        <div className="flex-c-st gap-3 items-start p-6 rounded-2xl border border-dashed border-base-300 bg-base-100/60">
          <Icon name="gift" size={32} className="text-accent" />
          <p className="font-medium m-0">You haven&rsquo;t sponsored a family yet</p>
          <p className="text-sm text-base-content/70 m-0 max-w-prose">
            Choose a family and you&rsquo;ll provide their Christmas — gifts for
            each child in the home, and their details sent straight to you.
          </p>
          <Link to="/christmas-alive/families" className="kbtn kbtn-accent kbtn-sm">
            Browse families
          </Link>
        </div>
      ) : (
        <ul className="flex-c-st gap-3 list-none p-0 m-0">
          {families.map(family => (
            <li
              key={family.sponsorshipId}
              className="flex-c-st gap-3 p-4 ca-card"
            >
              <div className="flex-bs gap-3 flex-wrap">
                <div className="flex-c-st">
                  <span className="ca-numeral text-[1.5rem] leading-none">
                    {familyLabel(family.familyNumber)}
                  </span>
                  <span className="text-sm text-base-content/80 mt-1">
                    {describeHousehold(family)}
                  </span>
                </div>
                {family.claimedAt && (
                  <span className="text-sm text-base-content/60">
                    Sponsored {formatLocalDate(family.claimedAt)}
                  </span>
                )}
              </div>
              <div className="flex-ss gap-2 flex-wrap">
                <Link
                  to={`/christmas-alive/packet/${family.sponsorshipId}`}
                  className="kbtn kbtn-outline kbtn-sm"
                >
                  <Icon name="file-text" size={16} />
                  Family details
                </Link>
                <Link
                  to="/christmas-alive/responsibilities"
                  className="kbtn kbtn-ghost kbtn-sm"
                >
                  <Icon name="list-check" size={16} />
                  What sponsors do
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* There is deliberately no "give this family back" button. Leadership
          wants a conversation before a family goes back on the list, partly
          because it is usually a family who cannot be reached rather than a
          sponsor who changed their mind. */}
      {families.length > 0 && (
        <p className="text-sm text-base-content/70 m-0 max-w-prose">
          If something has changed and you can no longer sponsor, or you
          can&rsquo;t reach your family after three tries, email{' '}
          <a href="mailto:christmasalivemaryland@gmail.com">
            christmasalivemaryland@gmail.com
          </a>{' '}
          and we&rsquo;ll sort it out. Please don&rsquo;t just leave it — the
          family is counting on this.
        </p>
      )}
    </div>
  );
};
