import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { getAttributeValue } from '../records.js';
import { useData } from './useData.js';

const volunteerByUsernameQuery = defineKqlQuery()
  .equals('values[Username]', 'username')
  .end();

const fetchVolunteerByUsername = ({ kappSlug, username }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'volunteers',
    search: {
      q: volunteerByUsernameQuery({ username }),
      include: ['details', 'values'],
      limit: 1,
    },
  });

/**
 * Resolves the current user's volunteer submission ID.
 *
 * 1. Checks the `Volunteer Id` user attribute (set by workflow).
 * 2. If missing, searches the `volunteers` datastore by username as a fallback
 *    (handles the gap between form submission and workflow completion).
 *
 * @returns {{
 *   volunteerId: string|null,   - The submission ID (from attribute or lookup)
 *   loading: boolean,           - True while the fallback lookup is in progress
 * }}
 */
export function useVolunteerRecord() {
  const { profile, kappSlug } = useSelector(state => state.app);

  // Primary: user attribute set by workflow
  const attributeId = getAttributeValue(profile, 'Volunteer Id') || null;

  // Fallback: search datastore by username (only when attribute is missing)
  const lookupParams = useMemo(
    () =>
      !attributeId && profile?.username
        ? { kappSlug, username: profile.username }
        : null,
    [attributeId, kappSlug, profile?.username],
  );
  const { loading: lookupLoading, response: lookupResponse } = useData(
    fetchVolunteerByUsername,
    lookupParams,
  );

  const lookupId = lookupResponse?.submissions?.[0]?.id ?? null;

  return {
    volunteerId: attributeId || lookupId,
    // Loading when we need the fallback lookup and it hasn't completed yet.
    // If attributeId exists, no lookup is needed so loading is always false.
    loading: !attributeId && lookupLoading,
  };
}
