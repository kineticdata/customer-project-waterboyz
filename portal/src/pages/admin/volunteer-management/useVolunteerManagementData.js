import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';

const VOLUNTEERS_FORM = 'volunteers';
const PROJECTS_FORM = 'swat-projects';
const ASSIGNMENTS_FORM = 'swat-project-volunteers';
const EVENTS_FORM = 'events';
const AFFILIATES_FORM = 'affiliates';

// Fetch all volunteers
const fetchVolunteers = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: VOLUNTEERS_FORM,
    search: { include: ['details', 'values'], limit: 1000 },
  });

// Fetch all project assignments
const fetchAssignments = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: ASSIGNMENTS_FORM,
    search: { include: ['details', 'values'], limit: 1000 },
  });

// Fetch all projects (for name lookup)
const fetchProjects = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: PROJECTS_FORM,
    search: { include: ['details', 'values'], limit: 500 },
  });

// Fetch all events (for name lookup)
const fetchEvents = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: EVENTS_FORM,
    search: { include: ['details', 'values'], limit: 200 },
  });

// Fetch all event signups for all volunteers
const byTypeQuery = defineKqlQuery().equals('type', 'formType').end();

const fetchSignups = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    search: {
      q: byTypeQuery({ formType: 'Event Sign Up' }),
      include: ['details', 'values'],
      limit: 1000,
    },
  });

// Fetch affiliates for lookup
const fetchAffiliates = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: AFFILIATES_FORM,
    search: { include: ['details', 'values'], limit: 200 },
  });

export const useVolunteerManagementData = () => {
  const { kappSlug } = useSelector(state => state.app);
  const params = useMemo(() => ({ kappSlug }), [kappSlug]);

  const {
    initialized: volInit,
    loading: volLoading,
    response: volResponse,
    actions: { reloadData: reloadVolunteers },
  } = useData(fetchVolunteers, params);

  const {
    response: assignResponse,
    actions: { reloadData: reloadAssignments },
  } = useData(fetchAssignments, params);
  const {
    response: projectsResponse,
    actions: { reloadData: reloadProjects },
  } = useData(fetchProjects, params);
  const {
    response: eventsResponse,
    actions: { reloadData: reloadEvents },
  } = useData(fetchEvents, params);
  const {
    response: signupsResponse,
    actions: { reloadData: reloadSignups },
  } = useData(fetchSignups, params);
  const { response: affiliatesResponse } = useData(fetchAffiliates, params);

  // Build lookup maps
  const projectsById = useMemo(() => {
    const map = {};
    for (const p of projectsResponse?.submissions ?? []) {
      map[p.id] = p;
    }
    return map;
  }, [projectsResponse]);

  const eventsById = useMemo(() => {
    const map = {};
    for (const e of eventsResponse?.submissions ?? []) {
      map[e.id] = e;
    }
    return map;
  }, [eventsResponse]);

  // Map volunteer ID → array of project assignments
  const assignmentsByVolunteerId = useMemo(() => {
    const map = {};
    for (const a of assignResponse?.submissions ?? []) {
      const vid = a.values?.['Volunteer ID'];
      if (vid) {
        if (!map[vid]) map[vid] = [];
        map[vid].push(a);
      }
    }
    return map;
  }, [assignResponse]);

  // Map volunteer ID → array of event signups
  const signupsByVolunteerId = useMemo(() => {
    const map = {};
    for (const s of signupsResponse?.submissions ?? []) {
      const vid = s.values?.['Volunteer ID'];
      if (vid) {
        if (!map[vid]) map[vid] = [];
        map[vid].push(s);
      }
    }
    return map;
  }, [signupsResponse]);

  // Affiliates list
  const affiliates = useMemo(
    () =>
      (affiliatesResponse?.submissions ?? [])
        .map(a => a.values?.['Name'])
        .filter(Boolean)
        .sort(),
    [affiliatesResponse],
  );

  // Raw submission arrays for association components
  const allProjects = useMemo(
    () => projectsResponse?.submissions ?? [],
    [projectsResponse],
  );
  const allEvents = useMemo(
    () => eventsResponse?.submissions ?? [],
    [eventsResponse],
  );
  const allAssignments = useMemo(
    () => assignResponse?.submissions ?? [],
    [assignResponse],
  );
  const allSignups = useMemo(
    () => signupsResponse?.submissions ?? [],
    [signupsResponse],
  );

  // Enriched volunteer rows
  const volunteers = useMemo(
    () =>
      (volResponse?.submissions ?? []).map(v => {
        const assignments = assignmentsByVolunteerId[v.id] ?? [];
        const signups = signupsByVolunteerId[v.id] ?? [];

        // Only count active assignments
        const activeProjects = assignments
          .filter(a => a.values?.['Status'] === 'Active')
          .map(a => {
            const proj = projectsById[a.values?.['Project ID']];
            return proj
              ? {
                  id: proj.id,
                  name: proj.values?.['Project Name'] || 'Unnamed Project',
                  status: proj.values?.['Project Status'],
                  date: proj.values?.['Scheduled Date'],
                }
              : null;
          })
          .filter(Boolean);

        // Only count non-cancelled signups
        const activeEvents = signups
          .filter(s => s.values?.['Signup Status'] !== 'Cancelled')
          .map(s => {
            const eventId = s.values?.['Event ID'];
            const evt = eventsById[eventId];
            return evt
              ? {
                  id: evt.id,
                  name: evt.values?.['Event Name'] || 'Unnamed Event',
                  date: evt.values?.['Event Date'],
                  status: evt.values?.['Event Status'],
                  signupStatus: s.values?.['Signup Status'],
                }
              : null;
          })
          .filter(Boolean);

        return {
          id: v.id,
          values: v.values,
          projects: activeProjects,
          events: activeEvents,
          projectCount: activeProjects.length,
          eventCount: activeEvents.length,
        };
      }),
    [
      volResponse,
      assignmentsByVolunteerId,
      signupsByVolunteerId,
      projectsById,
      eventsById,
    ],
  );

  const initialized = volInit;
  const loading = volLoading && volunteers.length === 0;

  const reload = useCallback(() => {
    reloadVolunteers();
    reloadAssignments();
    reloadProjects();
    reloadEvents();
    reloadSignups();
  }, [reloadVolunteers, reloadAssignments, reloadProjects, reloadEvents, reloadSignups]);

  return {
    initialized,
    loading,
    volunteers,
    affiliates,
    // Lookup maps
    projectsById,
    eventsById,
    // Raw arrays for association components
    allProjects,
    allEvents,
    allAssignments,
    allSignups,
    // Actions
    reload,
  };
};
