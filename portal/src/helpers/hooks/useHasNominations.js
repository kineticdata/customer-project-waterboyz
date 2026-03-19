import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { searchSubmissions } from '@kineticdata/react';
import { useData } from './useData.js';
import { appActions } from '../state.js';

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
 * Fetches whether the current user has any nominations exactly once and stores
 * the result in Redux. All consumers read from Redux — no duplicate API calls.
 *
 * Call this hook once (e.g. in PrivateRoutes or App). Other components should
 * use `useSelector(state => state.app.hasNominations)` directly.
 */
export const useInitHasNominations = () => {
  const { kappSlug, profile } = useSelector(state => state.app);

  const params = useMemo(
    () =>
      profile?.username ? { kappSlug, username: profile.username } : null,
    [kappSlug, profile?.username],
  );

  const { initialized, loading, response } = useData(
    fetchNominationsCount,
    params,
  );

  useEffect(() => {
    if (initialized && !loading) {
      appActions.setHasNominations(
        (response?.submissions?.length ?? 0) > 0,
      );
    }
  }, [initialized, loading, response]);
};

/**
 * Returns whether the current user has any nominations.
 * Reads from Redux — does NOT trigger a fetch. Pair with useInitHasNominations.
 */
export const useHasNominations = () => {
  return useSelector(state => state.app.hasNominations);
};
