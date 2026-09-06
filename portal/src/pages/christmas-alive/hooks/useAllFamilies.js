import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { searchSubmissions, updateSubmission } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { parseRoster, deriveCounts } from '../../../helpers/christmasAlive.js';

/**
 * Every Christmas Alive family across every season, joined to the family
 * registry — the leadership view.
 *
 * Deliberately NOT season-filtered at the query level: leadership needs to see
 * history, and the season becomes a filter in the UI instead. Two queries,
 * joined in the browser; never one request per row.
 */
const fetchAll = async ({ kappSlug }) => {
  const [sponsorships, families] = await Promise.all([
    searchSubmissions({
      kapp: kappSlug,
      form: 'christmas-alive-sponsorships',
      search: { include: ['values'], limit: 1000 },
    }),
    searchSubmissions({
      kapp: kappSlug,
      form: 'families',
      search: { include: ['values'], limit: 1000 },
    }),
  ]);
  return { sponsorships, families };
};

const buildRows = response => {
  const familiesById = new Map(
    (response?.families?.submissions ?? []).map(f => [f.id, f]),
  );
  return (response?.sponsorships?.submissions ?? []).map(s => {
    const v = s.values ?? {};
    const family = familiesById.get(v['Family ID']);
    const fv = family?.values ?? {};
    const roster = parseRoster(fv['Family Members JSON']);
    // Derive from the roster ONLY when there is one. A family record can exist
    // without a roster (the Family Members JSON field is added in a later
    // step), and deriving from an empty roster would zero out counts the
    // snapshot already has correct.
    const counts =
      roster.length > 0
        ? deriveCounts(roster)
        : {
            totalMembers: Number(v['Total Members']) || 0,
            totalAdults: Number(v['Total Adults']) || 0,
            totalChildren: Number(v['Total Children']) || 0,
          };
    return {
      id: s.id,
      familyId: v['Family ID'] || '',
      hasFamilyRecord: !!family,
      season: v['Season'] || '',
      familyNumber: v['Family Number'] || '',
      status: v['Status'] || '',
      rejectionReason: v['Rejection Reason'] || '',
      sponsorUsername: v['Sponsor Username'] || '',
      sponsorEmail: v['Sponsor Email'] || '',
      claimedAt: v['Claimed At'] || '',
      photoRequested: v['Photo Requested'] || '',
      firstName: fv['First Name'] || '',
      lastName: fv['Last Name'] || '',
      email: fv['Email'] || '',
      phone: fv['Phone Number'] || '',
      addressLine1: fv['Address Line 1'] || '',
      city: fv['City'] || v['City'] || '',
      state: fv['State'] || '',
      zip: fv['Zip'] || '',
      county: fv['County'] || v['County'] || '',
      nativeLanguage: fv['Native Language'] || v['Native Language'] || '',
      isTestFixture: String(fv['Test Fixture'] ?? '').toLowerCase() === 'true',
      roster,
      ...counts,
    };
  });
};

export const useAllFamilies = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const [saving, setSaving] = useState(false);
  const params = useMemo(() => (kappSlug ? { kappSlug } : null), [kappSlug]);
  const { initialized, loading, response, actions } = useData(fetchAll, params);

  const rows = useMemo(() => buildRows(response), [response]);
  const reload = actions?.reloadData;

  /** Update the family registry record behind a row. */
  const saveFamily = useCallback(
    async (familyId, values) => {
      setSaving(true);
      try {
        const result = await updateSubmission({ id: familyId, values });
        if (!result?.error) reload?.();
        return result;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  /** Update the season record behind a row (status, photo flag, notes). */
  const saveSponsorship = useCallback(
    async (sponsorshipId, values) => {
      setSaving(true);
      try {
        const result = await updateSubmission({ id: sponsorshipId, values });
        if (!result?.error) reload?.();
        return result;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const seasons = useMemo(
    () => [...new Set(rows.map(r => r.season).filter(Boolean))].sort().reverse(),
    [rows],
  );

  return {
    rows,
    seasons,
    loading: !initialized || loading,
    saving,
    reload,
    saveFamily,
    saveSponsorship,
  };
};
