import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { toArray } from '../../../helpers/format.js';

const EVENTS_FORM = 'events';
const VOLUNTEERS_FORM = 'volunteers';
const PROJECTS_FORM = 'swat-projects';
const ASSIGNMENTS_FORM = 'swat-project-volunteers';

const byEventIdQuery = defineKqlQuery()
  .equals('type', 'formType')
  .equals('values[Event ID]', 'eventId')
  .end();

const byAssocEventQuery = defineKqlQuery()
  .equals('values[Associated Event]', 'eventId')
  .end();

const byIdListQuery = defineKqlQuery()
  .in('id', 'ids')
  .end();

const byProjectIdsQuery = defineKqlQuery()
  .in('values[Project ID]', 'projectIds')
  .equals('values[Status]', 'status')
  .end();

const fetchAllEvents = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: EVENTS_FORM,
    search: { include: ['details', 'values'], limit: 100 },
  });

const fetchSignups = ({ kappSlug, eventId }) =>
  searchSubmissions({
    kapp: kappSlug,
    search: {
      q: byEventIdQuery({ eventId, formType: 'Event Sign Up' }),
      include: ['details', 'values'],
      limit: 500,
    },
  });

const fetchProjects = ({ kappSlug, eventId }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: PROJECTS_FORM,
    search: {
      q: byAssocEventQuery({ eventId }),
      include: ['details', 'values'],
      limit: 100,
    },
  });

const fetchAssignments = ({ kappSlug, projectIds }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: ASSIGNMENTS_FORM,
    search: {
      q: byProjectIdsQuery({ projectIds, status: 'Active' }),
      include: ['details', 'values'],
      limit: 500,
    },
  });

const fetchVolunteers = ({ kappSlug, volunteerIds }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: VOLUNTEERS_FORM,
    search: {
      q: byIdListQuery({ ids: volunteerIds }),
      include: ['details', 'values'],
      limit: 500,
    },
  });

export const useAssignData = () => {
  const { eventId } = useParams();
  const { kappSlug } = useSelector(state => state.app);

  const baseParams = useMemo(() => ({ kappSlug, eventId }), [kappSlug, eventId]);

  const { response: eventsResponse } = useData(
    fetchAllEvents,
    useMemo(() => ({ kappSlug }), [kappSlug]),
  );

  const {
    response: signupsResponse,
    actions: { reloadData: reloadSignups },
  } = useData(fetchSignups, baseParams);

  const { response: projectsResponse } = useData(fetchProjects, baseParams);

  // Sort projects alphabetically by Project Name. Treat missing names as
  // empty string so localeCompare doesn't throw, and use a case-insensitive
  // locale-aware comparator.
  const projects = useMemo(() => {
    const list = projectsResponse?.submissions ?? [];
    return [...list].sort((a, b) => {
      const an = a?.values?.['Project Name'] ?? '';
      const bn = b?.values?.['Project Name'] ?? '';
      return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    });
  }, [projectsResponse]);

  const projectIds = useMemo(() => projects.map(p => p.id), [projects]);

  const assignmentsParams = useMemo(
    () => (projectIds.length > 0 ? { kappSlug, projectIds } : null),
    [kappSlug, projectIds],
  );

  const {
    response: assignmentsResponse,
    actions: { reloadData: reloadAssignments },
  } = useData(fetchAssignments, assignmentsParams);

  // Union of volunteer IDs from this event's signups AND from the assignments
  // attached to the event's projects. The right-hand project panel renders
  // every assigned volunteer, including those who didn't sign up to this
  // specific event (e.g. added manually by the captain, approved from
  // request-to-join, or assigned via a prior event) — without their records
  // we'd display them as dashes.
  const volunteerIds = useMemo(() => {
    const ids = new Set();
    for (const s of signupsResponse?.submissions ?? []) {
      const vid = s.values?.['Volunteer ID'];
      if (vid) ids.add(vid);
    }
    for (const a of assignmentsResponse?.submissions ?? []) {
      const vid = a.values?.['Volunteer ID'];
      if (vid) ids.add(vid);
    }
    return [...ids];
  }, [signupsResponse, assignmentsResponse]);

  const volunteersParams = useMemo(
    () => (volunteerIds.length > 0 ? { kappSlug, volunteerIds } : null),
    [kappSlug, volunteerIds],
  );

  const { response: volunteersResponse } = useData(
    fetchVolunteers,
    volunteersParams,
  );

  // Derived data
  const event = useMemo(
    () => (eventsResponse?.submissions ?? []).find(e => e.id === eventId),
    [eventsResponse, eventId],
  );

  const signups = useMemo(
    () =>
      (signupsResponse?.submissions ?? []).filter(
        s => s.values?.['Signup Status'] !== 'Cancelled',
      ),
    [signupsResponse],
  );

  const assignments = useMemo(
    () => assignmentsResponse?.submissions ?? [],
    [assignmentsResponse],
  );

  const volunteersById = useMemo(() => {
    const map = {};
    for (const v of volunteersResponse?.submissions ?? []) {
      map[v.id] = v;
    }
    return map;
  }, [volunteersResponse]);

  const signupByVolunteerId = useMemo(() => {
    const map = {};
    for (const s of signups) {
      const vid = s.values?.['Volunteer ID'];
      if (vid) map[vid] = s;
    }
    return map;
  }, [signups]);

  // Group signups by Affiliated Organization. The signup form may not capture
  // the affiliation (anonymous public signup, or the field was left blank), so
  // fall back to the volunteer profile's affiliation before bucketing as
  // "Unaffiliated". Signups within each org are sorted alphabetically by
  // last name then first name, preferring the volunteer record's values
  // (more authoritative) over the signup's contact fields.
  const signupsByOrg = useMemo(() => {
    const groups = {};
    for (const signup of signups) {
      const vid = signup.values?.['Volunteer ID'];
      const vol = vid ? volunteersById[vid] : null;
      const org =
        signup.values?.['Affiliated Organization'] ||
        vol?.values?.['Affiliated Organization'] ||
        'Unaffiliated';
      if (!groups[org]) groups[org] = [];
      groups[org].push(signup);
    }
    const compareName = (a, b) => {
      const aVid = a.values?.['Volunteer ID'];
      const bVid = b.values?.['Volunteer ID'];
      const aVol = aVid ? volunteersById[aVid] : null;
      const bVol = bVid ? volunteersById[bVid] : null;
      const aLast =
        aVol?.values?.['Last Name'] ?? a.values?.['Last Name'] ?? '';
      const bLast =
        bVol?.values?.['Last Name'] ?? b.values?.['Last Name'] ?? '';
      const lastCmp = aLast.localeCompare(bLast, undefined, {
        sensitivity: 'base',
      });
      if (lastCmp !== 0) return lastCmp;
      const aFirst =
        aVol?.values?.['First Name'] ?? a.values?.['First Name'] ?? '';
      const bFirst =
        bVol?.values?.['First Name'] ?? b.values?.['First Name'] ?? '';
      return aFirst.localeCompare(bFirst, undefined, { sensitivity: 'base' });
    };
    for (const list of Object.values(groups)) list.sort(compareName);
    return Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [signups, volunteersById]);

  // Skill counts (based on unassigned volunteers)
  const assignmentByVolunteerId = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      const vid = a.values?.['Volunteer ID'];
      if (vid) map[vid] = a;
    }
    return map;
  }, [assignments]);

  const { allSkills, skillCounts } = useMemo(() => {
    const counts = {};
    for (const signup of signups) {
      const vid = signup.values?.['Volunteer ID'];
      if (!vid || assignmentByVolunteerId[vid]) continue;
      const vol = volunteersById[vid];
      for (const skill of toArray(vol?.values?.['Skill Areas'])) {
        counts[skill] = (counts[skill] || 0) + 1;
      }
    }
    const sorted = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return { allSkills: sorted, skillCounts: counts };
  }, [signups, volunteersById, assignmentByVolunteerId]);

  // True only after all required API calls have actually resolved. The
  // `*Init` flags from useData are misleading — they just mean params are set,
  // not that a response has come back. Gating on responses ensures consumers
  // (like useStagedAssignments) don't snapshot an empty serverMap before
  // assignments have loaded.
  const initialized =
    eventsResponse !== null &&
    signupsResponse !== null &&
    projectsResponse !== null &&
    (projectIds.length === 0 || assignmentsResponse !== null) &&
    (volunteerIds.length === 0 || volunteersResponse !== null);

  const reload = useCallback(() => {
    reloadSignups();
    reloadAssignments();
  }, [reloadSignups, reloadAssignments]);

  return {
    initialized,
    event,
    signups,
    projects,
    assignments,
    volunteersById,
    signupByVolunteerId,
    signupsByOrg,
    allSkills,
    skillCounts,
    reload,
  };
};
