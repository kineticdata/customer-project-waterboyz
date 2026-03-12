import { useCallback, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  createSubmission,
  defineKqlQuery,
  deleteSubmission,
  searchSubmissions,
  updateSubmission,
} from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { toastError, toastSuccess } from '../../helpers/toasts.js';

const EVENTS_FORM = 'events';
const VOLUNTEERS_FORM = 'volunteers';
const PROJECTS_FORM = 'swat-projects';
const ASSIGNMENTS_FORM = 'swat-project-volunteers';

// Search kapp-wide across all Event Sign Up forms for this event
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
      q: byProjectIdsQuery({ projectIds }),
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

export const EventsAssign = () => {
  const { eventId } = useParams();
  const { kappSlug } = useSelector(state => state.app);

  const baseParams = useMemo(() => ({ kappSlug, eventId }), [kappSlug, eventId]);

  const {
    initialized: eventsInit,
    response: eventsResponse,
  } = useData(fetchAllEvents, useMemo(() => ({ kappSlug }), [kappSlug]));

  const {
    initialized: signupsInit,
    response: signupsResponse,
    actions: { reloadData: reloadSignups },
  } = useData(fetchSignups, baseParams);

  const {
    initialized: projectsInit,
    response: projectsResponse,
  } = useData(fetchProjects, baseParams);

  // Derive project IDs so assignments can be fetched by project
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

  // Collect volunteer IDs from signups so we can load volunteer details
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

  const {
    initialized: volunteersInit,
    response: volunteersResponse,
  } = useData(fetchVolunteers, volunteersParams);

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

  // Map volunteerId → volunteer record
  const volunteersById = useMemo(() => {
    const map = {};
    for (const v of volunteersResponse?.submissions ?? []) {
      map[v.id] = v;
    }
    return map;
  }, [volunteersResponse]);

  // Map volunteerId → assignment submission (if assigned)
  const assignmentByVolunteerId = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      const vid = a.values?.['Volunteer ID'];
      if (vid) map[vid] = a;
    }
    return map;
  }, [assignments]);

  // Map projectId → array of volunteer IDs assigned to it
  const assignedVolunteersByProjectId = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      const pid = a.values?.['Project ID'];
      const vid = a.values?.['Volunteer ID'];
      if (pid && vid) {
        if (!map[pid]) map[pid] = [];
        map[pid].push(vid);
      }
    }
    return map;
  }, [assignments]);

  // Group signups by affiliated org
  const signupsByOrg = useMemo(() => {
    const groups = {};
    for (const signup of signups) {
      const org = signup.values?.['Affiliated Organization'] || 'Unaffiliated';
      if (!groups[org]) groups[org] = [];
      groups[org].push(signup);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [signups]);

  // Filter state
  const [orgFilter, setOrgFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});

  const [pending, setPending] = useState({}); // volunteerId → true

  const reload = useCallback(() => {
    reloadSignups();
    reloadAssignments();
  }, [reloadSignups, reloadAssignments]);

  const handleAssign = useCallback(
    async (signup, projectId) => {
      const volunteerId = signup.values?.['Volunteer ID'];
      if (!volunteerId || !projectId) return;
      setPending(p => ({ ...p, [volunteerId]: true }));

      // 1. Create the swat-project-volunteers record
      const assignResult = await createSubmission({
        kappSlug,
        formSlug: ASSIGNMENTS_FORM,
        values: {
          'Volunteer ID': volunteerId,
          'Project ID': projectId,
          'Present': 'No',
        },
      });

      if (assignResult?.error) {
        toastError({
          title: 'Assignment failed',
          description: assignResult.error.message,
        });
        setPending(p => ({ ...p, [volunteerId]: false }));
        return;
      }

      // 2. Update signup status to Assigned
      await updateSubmission({
        id: signup.id,
        values: { 'Signup Status': 'Assigned' },
      });

      toastSuccess({ title: 'Volunteer assigned to project.' });
      reload();
      setPending(p => ({ ...p, [volunteerId]: false }));
    },
    [kappSlug, reload],
  );

  const handleUnassign = useCallback(
    async signup => {
      const volunteerId = signup.values?.['Volunteer ID'];
      if (!volunteerId) return;
      const assignment = assignmentByVolunteerId[volunteerId];
      if (!assignment) return;

      setPending(p => ({ ...p, [volunteerId]: true }));

      const deleteResult = await deleteSubmission({ id: assignment.id });

      if (deleteResult?.error) {
        toastError({
          title: 'Could not unassign',
          description: deleteResult.error.message,
        });
        setPending(p => ({ ...p, [volunteerId]: false }));
        return;
      }

      // Revert signup status to Pending
      await updateSubmission({
        id: signup.id,
        values: { 'Signup Status': 'Pending' },
      });

      toastSuccess({ title: 'Volunteer unassigned.' });
      reload();
      setPending(p => ({ ...p, [volunteerId]: false }));
    },
    [assignmentByVolunteerId, reload],
  );

  const toggleProject = useCallback(projectId => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  }, []);

  const initialized =
    eventsInit &&
    signupsInit &&
    projectsInit &&
    (projectIds.length === 0 || assignmentsInit) &&
    (volunteerIds.length === 0 || volunteersInit);

  if (!initialized) return <Loading />;

  // Filter volunteers
  const filteredSignupsByOrg = orgFilter
    ? signupsByOrg.filter(([org]) => org === orgFilter)
    : signupsByOrg;

  const filterByName = signups =>
    nameSearch
      ? signups.filter(signup => {
          const vid = signup.values?.['Volunteer ID'];
          const vol = volunteersById[vid];
          const name =
            `${vol?.values?.['First Name'] ?? ''} ${vol?.values?.['Last Name'] ?? ''}`.toLowerCase();
          return name.includes(nameSearch.toLowerCase());
        })
      : signups;

  const allOrgs = signupsByOrg.map(([org]) => org);

  return (
    <div className="gutter pb-24 md:pb-8">
      <div className="max-w-screen-xl mx-auto pt-1 pb-6">
        <PageHeading
          title={event ? `Assign: ${event.values?.['Event Name']}` : 'Assign Volunteers'}
          backTo="/events"
        >
          <span className="text-sm text-base-content/50 font-medium ml-auto">
            {signups.length} signed up · {assignments.length} assigned
          </span>
        </PageHeading>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="search"
            className="kinput kinput-bordered kinput-sm"
            placeholder="Search volunteer name…"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            style={{ minWidth: '200px' }}
          />
          <select
            className="kselect kselect-bordered kselect-sm"
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
          >
            <option value="">All Organizations</option>
            {allOrgs.map(org => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: Volunteers by org */}
          <div className="flex-c-st gap-4">
            <div className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">
              Volunteers ({signups.length})
            </div>

            {filteredSignupsByOrg.length === 0 && (
              <div className="rounded-box border border-base-200 bg-base-100 p-8 text-center">
                <p className="text-base-content/50">No volunteers signed up yet.</p>
              </div>
            )}

            {filteredSignupsByOrg.map(([org, orgSignups]) => {
              const visible = filterByName(orgSignups);
              if (visible.length === 0) return null;
              return (
                <div
                  key={org}
                  className="rounded-box border border-base-200 bg-base-100 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-base-200/40 flex items-center gap-2">
                    <Icon name="building" size={15} className="text-base-content/50" />
                    <span className="font-semibold text-sm">{org}</span>
                    <span className="ml-auto text-xs text-base-content/50">
                      {visible.length}
                    </span>
                  </div>

                  <div className="divide-y divide-base-200">
                    {visible.map(signup => {
                      const vid = signup.values?.['Volunteer ID'];
                      const vol = volunteersById[vid];
                      const assignment = assignmentByVolunteerId[vid];
                      const assignedProject = assignment
                        ? projects.find(p => p.id === assignment.values?.['Project ID'])
                        : null;
                      const isPending = pending[vid];
                      const signupStatus = signup.values?.['Signup Status'];

                      return (
                        <div key={signup.id} className="px-4 py-3 flex-c-st gap-2">
                          <div className="flex-bc gap-2">
                            <div>
                              <span className="font-medium text-sm">
                                {vol
                                  ? `${vol.values?.['First Name'] ?? ''} ${vol.values?.['Last Name'] ?? ''}`.trim() ||
                                    '—'
                                  : signup.values?.['Volunteer ID']}
                              </span>
                              {signupStatus === 'Assigned' && (
                                <span className="ml-2 badge badge-primary badge-sm">
                                  Assigned
                                </span>
                              )}
                              {signupStatus === 'Waitlisted' && (
                                <span className="ml-2 badge badge-warning badge-sm">
                                  Waitlisted
                                </span>
                              )}
                            </div>

                            {assignment ? (
                              <button
                                type="button"
                                className="kbtn kbtn-xs kbtn-ghost text-error"
                                disabled={isPending}
                                onClick={() => handleUnassign(signup)}
                              >
                                {isPending ? '…' : 'Unassign'}
                              </button>
                            ) : (
                              <AssignDropdown
                                projects={projects}
                                disabled={isPending}
                                onAssign={projectId => handleAssign(signup, projectId)}
                              />
                            )}
                          </div>

                          {assignedProject && (
                            <div className="text-xs text-base-content/50 flex items-center gap-1">
                              <Icon name="arrow-right" size={12} />
                              {assignedProject.values?.['Project Name'] || '—'}
                            </div>
                          )}

                          {vol?.values?.['Skill Areas'] && (
                            <SkillChips raw={vol.values['Skill Areas']} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Projects with assigned volunteers */}
          <div className="flex-c-st gap-4">
            <div className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">
              Projects ({projects.length})
            </div>

            {projects.length === 0 && (
              <div className="rounded-box border border-base-200 bg-base-100 p-8 text-center">
                <p className="text-base-content/50 text-sm">
                  No projects linked to this event yet.
                </p>
                <p className="text-base-content/40 text-xs mt-1">
                  Link projects via the Project Details page.
                </p>
              </div>
            )}

            {projects.map(project => {
              const assignedVids = assignedVolunteersByProjectId[project.id] ?? [];
              const isExpanded = expandedProjects[project.id] ?? true;

              return (
                <div
                  key={project.id}
                  className="rounded-box border border-base-200 bg-base-100 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full px-4 py-3 bg-base-200/40 flex-bc gap-2 hover:bg-base-200/70 transition-colors text-left"
                    onClick={() => toggleProject(project.id)}
                  >
                    <div>
                      <span className="font-semibold text-sm">
                        {project.values?.['Project Name'] || '—'}
                      </span>
                      <span className="ml-2 text-xs text-base-content/50">
                        {[project.values?.['City'], project.values?.['State']]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="badge badge-ghost badge-sm">
                        {assignedVids.length} volunteer{assignedVids.length !== 1 ? 's' : ''}
                      </span>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        className="text-base-content/40"
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-base-200">
                      {assignedVids.length === 0 && (
                        <div className="px-4 py-3 text-sm text-base-content/40 italic">
                          No volunteers assigned yet.
                        </div>
                      )}
                      {assignedVids.map(vid => {
                        const vol = volunteersById[vid];
                        const assignment = assignmentByVolunteerId[vid];
                        const signup = signups.find(
                          s => s.values?.['Volunteer ID'] === vid,
                        );
                        const isPending = pending[vid];

                        return (
                          <div key={vid} className="px-4 py-2.5 flex-bc gap-2">
                            <span className="text-sm font-medium">
                              {vol
                                ? `${vol.values?.['First Name'] ?? ''} ${vol.values?.['Last Name'] ?? ''}`.trim() ||
                                  '—'
                                : vid}
                            </span>
                            {signup && (
                              <button
                                type="button"
                                className="kbtn kbtn-xs kbtn-ghost text-error"
                                disabled={isPending}
                                onClick={() => handleUnassign(signup)}
                              >
                                {isPending ? '…' : 'Remove'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Select to pick a project and assign
const AssignDropdown = ({ projects, disabled, onAssign }) => {
  if (projects.length === 0) return null;

  return (
    <select
      className="kselect kselect-bordered kselect-xs"
      disabled={disabled}
      value=""
      onChange={e => {
        if (e.target.value) onAssign(e.target.value);
      }}
    >
      <option value="">Assign…</option>
      {projects.map(p => (
        <option key={p.id} value={p.id}>
          {p.values?.['Project Name'] || '—'}
        </option>
      ))}
    </select>
  );
};

// Render a few skill chips from JSON string
const SkillChips = ({ raw }) => {
  let skills = [];
  try {
    skills = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(skills) || skills.length === 0) return null;
  const visible = skills.slice(0, 4);
  const rest = skills.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(s => (
        <span key={s} className="badge badge-outline badge-xs text-base-content/60">
          {s}
        </span>
      ))}
      {rest > 0 && (
        <span className="badge badge-ghost badge-xs text-base-content/40">
          +{rest} more
        </span>
      )}
    </div>
  );
};
