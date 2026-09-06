import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { isWithinSeason } from '../../../helpers/christmasAlive.js';

const PROGRAM_NAME = 'Christmas Alive';

// Query by Status, not Program Name. `values[Status]` is the only value-level
// index on the programs form, and Kinetic rejects a query on an unindexed field
// with a 400 -- which would silently read as "no season configured" and hide
// every Christmas Alive entry point. This mirrors what HomeNominator.jsx does.
const activeProgramsQuery = defineKqlQuery()
  .equals('values[Status]', 'status')
  .end();

const fetchProgram = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'programs',
    search: {
      q: activeProgramsQuery({ status: 'Active' }),
      include: ['values'],
      limit: 20,
    },
  });

/**
 * Season configuration and Christmas Alive role flags.
 *
 * The season window lives on the `programs` datastore record rather than in
 * code, so leadership can move it without a deploy. An unconfigured window
 * reads as closed — see `isWithinSeason`.
 *
 * @returns {{
 *   season: string|null,
 *   activeFrom: string|null,
 *   activeTo: string|null,
 *   inSeason: boolean,
 *   error: object|null,
 *   isCANominator: boolean,
 *   isCAAdmin: boolean,
 *   canNominate: boolean,
 *   loading: boolean,
 * }}
 */
export const useChristmasAlive = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const profile = useSelector(state => state.app.profile);

  const params = useMemo(() => (kappSlug ? { kappSlug } : null), [kappSlug]);
  const { initialized, loading, response } = useData(fetchProgram, params);

  // A failed lookup must not masquerade as "not in season" -- that hides every
  // Christmas Alive entry point with no visible cause. Surface it instead.
  const error = response?.error ?? null;

  const values =
    (response?.submissions ?? []).find(
      sub => sub.values?.['Program Name'] === PROGRAM_NAME,
    )?.values ?? null;

  const teamNames = useMemo(
    () => (profile?.memberships ?? []).map(({ team }) => team.name),
    [profile],
  );

  const isCAAdmin =
    teamNames.includes('Christmas Alive Admins') || !!profile?.spaceAdmin;
  const isCANominator = teamNames.includes('Christmas Alive Nominators');

  return useMemo(() => {
    const activeFrom = values?.['Active From'] ?? null;
    const activeTo = values?.['Active To'] ?? null;
    return {
      season: values?.['Current Season'] ?? null,
      activeFrom,
      activeTo,
      inSeason: isWithinSeason(activeFrom, activeTo),
      isCANominator,
      isCAAdmin,
      error,
      // Admins can nominate too — the requirements list the Nominate page as
      // "nominators and admins".
      canNominate: isCANominator || isCAAdmin,
      loading: !initialized || loading,
    };
  }, [values, error, isCANominator, isCAAdmin, initialized, loading]);
};
