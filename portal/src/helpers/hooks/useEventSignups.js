import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  defineKqlQuery,
  searchSubmissions,
  updateSubmission,
} from '@kineticdata/react';
import { useData } from './useData.js';
import { toastError, toastSuccess } from '../toasts.js';

const fetchEvents = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'events',
    search: { include: ['details', 'values'], limit: 100 },
  });

const mySignupsQuery = defineKqlQuery()
  .equals('type', 'formType')
  .equals('values[Email]', 'email')
  .end();

const fetchMySignups = ({ kappSlug, email }) =>
  searchSubmissions({
    kapp: kappSlug,
    search: {
      q: mySignupsQuery({ formType: 'Event Sign Up', email }),
      include: ['details', 'values'],
      limit: 500,
    },
  });

/**
 * Fetches events and the current user's signups, and provides cancel/re-register
 * helpers. Used by both HomeVolunteer and EventsList to avoid duplicating this logic.
 *
 * @returns {{
 *   events: Object[],
 *   eventsLoading: boolean,
 *   eventsError: Object|undefined,
 *   initialized: boolean,
 *   mySignupsByEventId: Record<string, Object>,
 *   reloadSignups: Function,
 *   pendingCancelId: string|null,
 *   handleCancel: Function,
 * }}
 */
export const useEventSignups = () => {
  const { kappSlug, profile } = useSelector(state => state.app);

  const eventsParams = useMemo(() => ({ kappSlug }), [kappSlug]);
  const {
    initialized: eventsInitialized,
    loading: eventsLoading,
    response: eventsResponse,
  } = useData(fetchEvents, eventsParams);

  const signupsParams = useMemo(
    () => (profile?.email ? { kappSlug, email: profile.email } : null),
    [kappSlug, profile],
  );
  const {
    initialized: signupsInitialized,
    response: signupsResponse,
    actions: { reloadData: reloadSignups },
  } = useData(fetchMySignups, signupsParams);

  // Map eventId → the most relevant signup (prefer non-cancelled)
  const mySignupsByEventId = useMemo(() => {
    const map = {};
    for (const signup of signupsResponse?.submissions ?? []) {
      const eventId = signup.values?.['Event ID'];
      if (eventId) {
        if (
          !map[eventId] ||
          map[eventId].values?.['Signup Status'] === 'Cancelled'
        ) {
          map[eventId] = signup;
        }
      }
    }
    return map;
  }, [signupsResponse]);

  const [pendingCancelId, setPendingCancelId] = useState(null);

  const handleCancel = useCallback(
    async event => {
      const signup = mySignupsByEventId[event.id];
      if (!signup) return;
      setPendingCancelId(event.id);
      const result = await updateSubmission({
        id: signup.id,
        values: { 'Signup Status': 'Cancelled' },
      });
      if (result?.error) {
        toastError({
          title: 'Could not cancel signup',
          description: result.error.message,
        });
      } else {
        toastSuccess({
          title: `Cancelled signup for ${event.values?.['Event Name']}`,
        });
        reloadSignups();
      }
      setPendingCancelId(null);
    },
    [mySignupsByEventId, reloadSignups],
  );

  return {
    events: eventsResponse?.submissions ?? [],
    eventsLoading,
    eventsError: eventsResponse?.error,
    initialized: eventsInitialized && signupsInitialized,
    mySignupsByEventId,
    reloadSignups,
    pendingCancelId,
    handleCancel,
  };
};
