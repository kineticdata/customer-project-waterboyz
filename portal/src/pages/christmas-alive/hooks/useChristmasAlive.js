import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { isWithinSeason } from '../../../helpers/christmasAlive.js';

const PROGRAM_NAME = 'Christmas Alive';

const programQuery = defineKqlQuery()
  .equals('values[Program Name]', 'name')
  .end();

const fetchProgram = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'programs',
    search: {
      q: programQuery({ name: PROGRAM_NAME }),
      include: ['values'],
      limit: 1,
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

  const values = response?.submissions?.[0]?.values ?? null;

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
      // Admins can nominate too — the requirements list the Nominate page as
      // "nominators and admins".
      canNominate: isCANominator || isCAAdmin,
      loading: !initialized || loading,
    };
  }, [values, isCANominator, isCAAdmin, initialized, loading]);
};
