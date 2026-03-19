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

  const { initialized: eventsInit, response: eventsResponse } = useData(
    fetchAllEvents,
    useMemo(() => ({ kappSlug }), [kappSlug]),
  );

  const {
    initialized: signupsInit,
    response: signupsResponse,
    actions: { reloadData: reloadSignups },
  } = useData(fetchSignups, baseParams);

  const { initialized: projectsInit, response: projectsResponse } = useData(
    fetchProjects,
    baseParams,
  );

  const projects = useMemo(
    () => projectsResponse?.submissions ?? [],
    [projectsResponse],
  );

  const projectIds = useMemo(() => projects.map(p => p.id), [projects]);

  const assignmentsParams = useMemo(
    () => (projectIds.length > 0 ? { kappSlug, projectIds } : null),
    [kappSlug, projectIds],
  );

  const {
    initialized: assignmentsInit,
    response: assignmentsResponse,
    actions: { reloadData: reloadAssignments },
  } = useData(fetchAssignments, assignmentsParams);

  const volunteerIds = useMemo(() => {
    const ids = (signupsResponse?.submissions ?? [])
      .map(s => s.values?.['Volunteer ID'])
      .filter(Boolean);
    return [...new Set(ids)];
  }, [signupsResponse]);

  const volunteersParams = useMemo(
    () => (volunteerIds.length > 0 ? { kappSlug, volunteerIds } : null),
    [kappSlug, volunteerIds],
  );

  const { initialized: volunteersInit, response: volunteersResponse } = useData(
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

  const signupsByOrg = useMemo(() => {
    const groups = {};
    for (const signup of signups) {
      const org = signup.values?.['Affiliated Organization'] || 'Unaffiliated';
      if (!groups[org]) groups[org] = [];
      groups[org].push(signup);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [signups]);

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

  const initialized =
    eventsInit &&
    signupsInit &&
    projectsInit &&
    (projectIds.length === 0 || assignmentsInit) &&
    (volunteerIds.length === 0 || volunteersInit);

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
