import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { useChristmasAlive } from '../hooks/useChristmasAlive.js';
import { useAvailableFamilies, useClaimFamily } from '../hooks/useSponsorships.js';
import { sizeBandTest } from '../../../helpers/christmasAlive.js';
import { FamilyCard } from './FamilyCard.jsx';
import { BrowseFilters } from './BrowseFilters.jsx';
import { SponsorConfirmModal } from './SponsorConfirmModal.jsx';

const NO_FILTERS = { county: '', city: '', nativeLanguage: '', size: '' };

/**
 * Sponsor a Family — the browse list.
 *
 * Reads through the `CA - Available Families` operation, never directly from
 * the sponsorships datastore: sponsors have no access to that form, and the
 * operation is what projects away names, street addresses, and phone numbers.
 */
export const BrowseFamilies = () => {
  const { season, inSeason, loading: seasonLoading } = useChristmasAlive();
  const { families, loading, error, reload } = useAvailableFamilies(season);
  const { claim } = useClaimFamily();

  const [filters, setFilters] = useState(NO_FILTERS);
  const [selected, setSelected] = useState(null);

  const visible = useMemo(() => {
    const bySize = sizeBandTest(filters.size);
    return families
      .filter(f => !filters.county || f.county === filters.county)
      .filter(f => !filters.city || f.city === filters.city)
      .filter(f => !filters.nativeLanguage || f.nativeLanguage === filters.nativeLanguage)
      .filter(f => !filters.size || bySize(f))
      .sort((a, b) => Number(a.familyNumber) - Number(b.familyNumber));
  }, [families, filters]);

  const handleClaimed = async sponsorshipId => {
    const result = await claim(sponsorshipId);
    // Refresh either way: on success the family leaves the list, and on a lost
    // race the list was stale, which is exactly why the claim failed.
    reload?.();
    return result;
  };

  if (seasonLoading || loading) return <Loading />;

  if (!inSeason) {
    return (
      <div className="kalert kalert-info kalert-soft max-w-prose">
        <Icon name="calendar" size={20} />
        <span>
          Sponsorship opens each September. Check back then to choose a family.
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-c-st gap-3 max-w-prose">
        <div className="kalert kalert-error kalert-soft">
          <Icon name="alert-triangle" size={20} />
          <span>We couldn&rsquo;t load the family list.</span>
        </div>
        <button type="button" className="kbtn kbtn-outline w-fit" onClick={reload}>
          <Icon name="refresh" size={18} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-c-st gap-5">
      <div className="flex-c-st gap-2 max-w-prose">
        <h1 className="text-h1 font-bold m-0">Choose a family to sponsor</h1>
        <p className="text-base-content/80 m-0">
          Each card is a family waiting for a sponsor. Pick one that fits what
          you can provide — once you sponsor them, we&rsquo;ll email you their
          names, address, and what they need.
        </p>
      </div>

      {families.length === 0 ? (
        <div className="flex-c-st gap-3 items-start p-6 rounded-lg border border-dashed border-base-300 max-w-prose">
          <Icon name="christmas-tree" size={32} className="text-accent" />
          <p className="font-medium m-0">Every family has a sponsor. Thank you.</p>
          <p className="text-sm text-base-content/70 m-0">
            New families are added as nominations are approved, so it&rsquo;s
            worth checking back.
          </p>
          <Link to="/christmas-alive/my-sponsorships" className="kbtn kbtn-outline kbtn-sm">
            See the families you&rsquo;ve sponsored
          </Link>
        </div>
      ) : (
        <>
          <BrowseFilters
            families={families}
            filters={filters}
            onChange={setFilters}
            resultCount={visible.length}
          />

          {visible.length === 0 ? (
            <div className="flex-c-st gap-3 items-start p-6 rounded-lg border border-dashed border-base-300 max-w-prose">
              <p className="font-medium m-0">No families match these filters</p>
              <p className="text-sm text-base-content/70 m-0">
                There are still {families.length} families waiting — widen your
                search to see them.
              </p>
              <button
                type="button"
                className="kbtn kbtn-outline kbtn-sm"
                onClick={() => setFilters(NO_FILTERS)}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0 m-0">
              {visible.map(family => (
                <FamilyCard
                  key={family.sponsorshipId}
                  family={family}
                  onSponsor={setSelected}
                />
              ))}
            </ul>
          )}

          <p className="text-sm text-base-content/60 max-w-prose">
            Family names and addresses stay private until someone sponsors them.
            You&rsquo;ll receive full details as soon as you do.
          </p>
        </>
      )}

      <SponsorConfirmModal
        family={selected}
        onClose={() => setSelected(null)}
        onClaim={handleClaimed}
        onSponsorAnother={() => setSelected(null)}
      />
    </div>
  );
};
