import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { executeWebApi } from '../../../helpers/api.js';
import {
  parseRoster,
  householdCounts,
  parseChoices,
  isYes,
} from '../../../helpers/christmasAlive.js';

export { findDuplicates } from '../../../helpers/christmasAlive.js';

const APPROVE_WEBAPI = 'christmas-alive-approve';
const RELEASE_WEBAPI = 'christmas-alive-release';

const seasonQuery = defineKqlQuery().equals('values[Season]', 'season').end();

/**
 * Admins have direct datastore access, so the approvals view reads the
 * sponsorships and the families it references in two queries and joins them in
 * the browser. Two queries, never one per row.
 */
const fetchApprovals = async ({ kappSlug, season }) => {
  // Nominations are fetched too: a Pending row has no family record yet, so
  // without them the review queue shows "Name not yet recorded" for exactly
  // the rows an admin needs to read in order to decide.
  const [sponsorships, families, nominations] = await Promise.all([
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
    searchSubmissions({
      kapp: kappSlug,
      form: 'christmas-alive-family-nomination',
      search: { include: ['values'], limit: 1000 },
    }),
  ]);
  return { sponsorships, families, nominations };
};

const buildRows = response => {
  const sponsorships = response?.sponsorships?.submissions ?? [];
  const familiesById = new Map(
    (response?.families?.submissions ?? []).map(f => [f.id, f]),
  );
  const nominationsById = new Map(
    (response?.nominations?.submissions ?? []).map(n => [n.id, n]),
  );

  return sponsorships.map(s => {
    const v = s.values ?? {};
    const family = familiesById.get(v['Family ID']);
    const nomination = nominationsById.get(v['Nomination ID']);
    // Prefer the family record once it exists; fall back to what the nominator
    // typed so a Pending row is still reviewable.
    const fv = family?.values ?? nomination?.values ?? {};
    const roster = parseRoster(fv['Family Members JSON']);
    // Always derive, never fall back to the stored snapshot. Admin views
    // always have the underlying record in hand, and deriving is both
    // self-consistent with the roster editor and incapable of producing a
    // household of zero people -- there is always a head. Stored snapshots
    // can be stale (rows written before the head was counted read one low).
    const counts = householdCounts(roster);

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
      // The nomination form stores one freetext Address; families splits it.
      addressLine1: fv['Address Line 1'] || fv['Address'] || '',
      fromNomination: !family && !!nomination,
      city: fv['City'] || v['City'] || '',
      state: fv['State'] || '',
      zip: fv['Zip'] || '',
      county: fv['County'] || v['County'] || '',
      nativeLanguage: fv['Native Language'] || v['Native Language'] || '',
      // Drives the duplicate matcher's fixture exclusion. Without this the
      // exclusion silently never fires and abandoned test families would
      // surface as duplicate candidates against real nominations.
      isTestFixture: String(fv['Test Fixture'] ?? '').toLowerCase() === 'true',
      // Everything an approver needs to judge the nomination without
      // leaving the page. Support lives under two different field names
      // depending on whether it has been copied to the season row yet.
      background: fv['Background on the Family'] || '',
      supportReceiving: parseChoices(
        v['Support Currently Receiving'] || fv['Support Received'],
      ),
      needsInterpreter: isYes(fv['Needs Interpreter']),
      photoRequested: v['Photo Requested'] || '',
      requestedBy: fv['Requested By'] || '',
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
