import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { executeWebApi } from '../../../helpers/api.js';
import { parseRoster, deriveCounts } from '../../../helpers/christmasAlive.js';

const APPROVE_WEBAPI = 'christmas-alive-approve';
const RELEASE_WEBAPI = 'christmas-alive-release';

const seasonQuery = defineKqlQuery().equals('values[Season]', 'season').end();

/**
 * Admins have direct datastore access, so the approvals view reads the
 * sponsorships and the families it references in two queries and joins them in
 * the browser. Two queries, never one per row.
 */
const fetchApprovals = async ({ kappSlug, season }) => {
  const [sponsorships, families] = await Promise.all([
    searchSubmissions({
      kapp: kappSlug,
      form: 'christmas-alive-sponsorships',
      search: { q: seasonQuery({ season }), include: ['values'], limit: 1000 },
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
  const sponsorships = response?.sponsorships?.submissions ?? [];
  const familiesById = new Map(
    (response?.families?.submissions ?? []).map(f => [f.id, f]),
  );

  return sponsorships.map(s => {
    const v = s.values ?? {};
    const family = familiesById.get(v['Family ID']);
    const fv = family?.values ?? {};
    // Counts derive from the roster in hand rather than the stored snapshot,
    // so an admin never sees a number lag behind an edit they just made.
    const roster = parseRoster(fv['Family Members JSON']);
    const counts = family
      ? deriveCounts(roster)
      : {
          totalMembers: Number(v['Total Members']) || 0,
          totalAdults: Number(v['Total Adults']) || 0,
          totalChildren: Number(v['Total Children']) || 0,
        };

    return {
      id: s.id,
      familyId: v['Family ID'] || '',
      nominationId: v['Nomination ID'] || '',
      familyNumber: v['Family Number'] || '',
      status: v['Status'] || '',
      rejectionReason: v['Rejection Reason'] || '',
      duplicateOf: v['Duplicate Of'] || '',
      sponsorUsername: v['Sponsor Username'] || '',
      sponsorEmail: v['Sponsor Email'] || '',
      claimedAt: v['Claimed At'] || '',
      // Contact details come from the family record and are admin-only.
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
      roster,
      ...counts,
    };
  });
};

/**
 * Admin data and mutations for the Christmas Alive review queue.
 *
 * Approve and release go through WebAPIs rather than direct submission writes:
 * both are multi-step, and approval allocates the next Family Number, which
 * two admins approving at the same moment must not be able to duplicate.
 */
export const useApprovals = season => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const params = useMemo(
    () => (kappSlug && season ? { kappSlug, season } : null),
    [kappSlug, season],
  );
  const { initialized, loading, response, actions } = useData(fetchApprovals, params);

  const rows = useMemo(() => buildRows(response), [response]);
  const reload = actions?.reloadData;

  const call = useCallback(
    async (webApiSlug, parameters) => {
      const result = await executeWebApi({ kappSlug, webApiSlug, parameters });
      if (!result?.error) reload?.();
      return result;
    },
    [kappSlug, reload],
  );

  return {
    rows,
    loading: !initialized || loading,
    reload,
    approve: (sponsorshipId, existingFamilyId) =>
      call(APPROVE_WEBAPI, { sponsorshipId, action: 'approve', existingFamilyId }),
    reject: (sponsorshipId, reason, duplicateOf) =>
      call(APPROVE_WEBAPI, { sponsorshipId, action: 'reject', reason, duplicateOf }),
    release: (sponsorshipId, notes) =>
      call(RELEASE_WEBAPI, { sponsorshipId, action: 'release', notes }),
    reassign: (sponsorshipId, username, notes) =>
      call(RELEASE_WEBAPI, { sponsorshipId, action: 'reassign', username, notes }),
  };
};

/**
 * Likely duplicates of a nomination, from the family registry.
 *
 * Test fixtures are excluded: they live in the shared `families` store, and an
 * abandoned one would otherwise surface as a duplicate candidate against a
 * real nomination months later.
 */
export const findDuplicates = (row, rows) => {
  const norm = s => (s || '').trim().toLowerCase();
  const lastName = norm(row.lastName);
  const address = norm(row.addressLine1);
  const phone = (row.phone || '').replace(/\D/g, '');

  if (!lastName && !address && !phone) return [];

  return rows
    .filter(r => r.id !== row.id && r.familyId && !r.isTestFixture)
    .filter(
      r =>
        (lastName && norm(r.lastName) === lastName) ||
        (address && norm(r.addressLine1) === address) ||
        (phone && (r.phone || '').replace(/\D/g, '') === phone),
    );
};
