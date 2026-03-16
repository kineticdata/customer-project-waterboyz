import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { searchSubmissions } from '@kineticdata/react';
import { useData } from './useData.js';

const fetchNominationsCount = ({ kappSlug, username }) =>
  searchSubmissions({
    kapp: kappSlug,
    search: {
      q: `type = "Nominations" AND (createdBy = "${username}" OR submittedBy = "${username}")`,
      include: ['details'],
      limit: 1,
    },
  });

/**
 * Returns whether the current user has any nominations.
 * Uses a limit-1 search to keep it lightweight.
 */
export const useHasNominations = () => {
  const { kappSlug, profile } = useSelector(state => state.app);

  const params = useMemo(
    () =>
      profile?.username ? { kappSlug, username: profile.username } : null,
    [kappSlug, profile],
  );

  const { initialized, response } = useData(fetchNominationsCount, params);

  return initialized && (response?.submissions?.length ?? 0) > 0;
};
