import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { getAttributeValue } from '../../helpers/records.js';
import { SignupStatusBadge } from '../../components/SignupStatusBadge.jsx';

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

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

const fetchEvents = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'events',
    search: { include: ['details', 'values'], limit: 100 },
  });

const myAssignmentsQuery = defineKqlQuery()
  .equals('values[Volunteer ID]', 'volunteerId')
  .equals('values[Status]', 'status')
  .end();

const fetchMyAssignments = ({ kappSlug, volunteerId }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'swat-project-volunteers',
    search: {
      q: myAssignmentsQuery({ volunteerId, status: 'Active' }),
      include: ['details', 'values'],
      limit: 100,
    },
  });

const byIdListQuery = defineKqlQuery().in('id', 'ids').end();

const fetchProjects = ({ kappSlug, projectIds }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'swat-projects',
    search: {
      q: byIdListQuery({ ids: projectIds }),
      include: ['details', 'values'],
      limit: 100,
    },
  });

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDate = value => {
  if (!value) return null;
  try {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
};

const formatDate = value => {
  if (!value) return '—';
  try {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------


const PROJECT_STATUS_COLORS = {
  Active: 'bg-success text-success-content',
  Completed: 'bg-primary/15 text-primary',
  'In Progress': 'bg-info text-info-content',
  Planning: 'bg-warning text-warning-content',
  Closed: 'bg-base-300 text-base-content/70',
};

const SectionHeading = ({ children, right }) => (
  <div className="flex-bc mb-3">
    <h2 className="text-base font-semibold text-base-content">{children}</h2>
    {right}
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const MyVolunteeringPage = () => {
  const { kappSlug } = useSelector(state => state.app);
  const profile = useSelector(state => state.app.profile);

  const volunteerId = getAttributeValue(profile, 'Volunteer Id');
  const email = profile?.email;

  // ── Signups (by email so it catches anonymous signups too) ───────────────
  const signupsParams = useMemo(
    () => (kappSlug && email ? { kappSlug, email } : null),
    [kappSlug, email],
  );
  const { initialized: signupsInit, response: signupsResponse } =
    useData(fetchMySignups, signupsParams);

  // ── Events (for looking up event names/dates) ───────────────────────────
  const eventsParams = useMemo(
    () => (kappSlug ? { kappSlug } : null),
    [kappSlug],
  );
  const { initialized: eventsInit, response: eventsResponse } =
    useData(fetchEvents, eventsParams);

  // ── Project assignments (junction records) ──────────────────────────────
  const assignmentsParams = useMemo(
    () => (kappSlug && volunteerId ? { kappSlug, volunteerId } : null),
    [kappSlug, volunteerId],
  );
  const { initialized: assignmentsInit, response: assignmentsResponse } =
    useData(fetchMyAssignments, assignmentsParams);

  // ── Fetch actual project records from assignment IDs ────────────────────
  const projectIds = useMemo(() => {
    const ids = (assignmentsResponse?.submissions ?? [])
      .map(a => a.values?.['Project ID'])
      .filter(Boolean);
    return [...new Set(ids)];
  }, [assignmentsResponse]);

  const projectsParams = useMemo(
    () => (kappSlug && projectIds.length > 0 ? { kappSlug, projectIds } : null),
    [kappSlug, projectIds],
  );
  const { initialized: projectsInit, response: projectsResponse } =
    useData(fetchProjects, projectsParams);

  // ── Derived: events by ID ───────────────────────────────────────────────
  const eventsById = useMemo(() => {
    const map = {};
    for (const event of eventsResponse?.submissions ?? []) {
      map[event.id] = event;
    }
    return map;
  }, [eventsResponse]);

  // ── Derived: upcoming commitments (signups for future events) ───────────
  const upcomingSignups = useMemo(() => {
    const now = today();
    return (signupsResponse?.submissions ?? [])
      .filter(s => {
        const status = s.values?.['Signup Status'];
        if (status === 'Cancelled') return false;
        const event = eventsById[s.values?.['Event ID']];
        const eventDate = event ? parseDate(event.values?.['Event Date']) : null;
        // Include if no date (safe default) or date is in future
        return !eventDate || eventDate >= now;
      })
      .map(signup => ({ signup, event: eventsById[signup.values?.['Event ID']] }))
      .sort((a, b) => {
        const da = a.event ? parseDate(a.event.values?.['Event Date']) : null;
        const db = b.event ? parseDate(b.event.values?.['Event Date']) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });
  }, [signupsResponse, eventsById]);

  // ── Derived: projects with details ──────────────────────────────────────
  const projectsById = useMemo(() => {
    const map = {};
    for (const p of projectsResponse?.submissions ?? []) {
      map[p.id] = p;
    }
    return map;
  }, [projectsResponse]);

  const assignments = useMemo(
    () => assignmentsResponse?.submissions ?? [],
    [assignmentsResponse],
  );

  // Build project list with details, split into upcoming/past
  const [projectFilter, setProjectFilter] = useState('upcoming');

  const { upcomingProjects, pastProjects } = useMemo(() => {
    const now = today();
    const upcoming = [];
    const past = [];

    for (const assignment of assignments) {
      const projectId = assignment.values?.['Project ID'];
      const project = projectsById[projectId];
      if (!project) continue;

      const scheduledDate = parseDate(project.values?.['Scheduled Date']);
      const status = project.values?.['Project Status'];
      const isClosed = project.coreState === 'Closed' || status === 'Completed';

      if (isClosed || (scheduledDate && scheduledDate < now)) {
        past.push({ assignment, project });
      } else {
        upcoming.push({ assignment, project });
      }
    }

    // Upcoming: soonest first; past: most recent first
    const sortByDate = (a, b, desc) => {
      const da = parseDate(a.project.values?.['Scheduled Date']);
      const db = parseDate(b.project.values?.['Scheduled Date']);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return desc ? db - da : da - db;
    };
    upcoming.sort((a, b) => sortByDate(a, b, false));
    past.sort((a, b) => sortByDate(a, b, true));

    return { upcomingProjects: upcoming, pastProjects: past };
  }, [assignments, projectsById]);

  const displayedProjects = projectFilter === 'upcoming' ? upcomingProjects : pastProjects;

  // ── Loading state ───────────────────────────────────────────────────────
  const initialized = signupsInit && eventsInit
    && (assignmentsInit || !volunteerId)
    && (projectsInit || projectIds.length === 0 || !volunteerId);

  if (!profile) return <Loading />;

  // If the user has no Volunteer Id, show a prompt
  if (profile && !volunteerId) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-6 pb-6">
          <PageHeading title="My Volunteering" backTo="/" />
          <div className="rounded-box border border-base-200 bg-base-100 p-10 text-center">
            <Icon
              name="user-heart"
              size={40}
              className="mx-auto text-base-content/20 mb-3"
            />
            <p className="text-base-content/50 font-medium">
              Your volunteer profile isn&apos;t set up yet
            </p>
            <p className="text-base-content/40 text-sm mt-1 mb-5">
              Complete your volunteer profile to track your serve days and project assignments.
            </p>
            <Link to="/profile?tab=volunteer" className="kbtn kbtn-primary kbtn-sm">
              Complete Volunteer Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gutter pb-24 md:pb-8">
      <div className="max-w-screen-lg mx-auto pt-6 pb-6">
        <PageHeading title="My Volunteering" backTo="/" />

        {!initialized ? (
          <Loading />
        ) : (
          <div className="flex-c-st gap-8">
            {/* ── Upcoming Commitments ────────────────────────────────── */}
            <section>
              <SectionHeading>Upcoming Commitments</SectionHeading>
              <div className="rounded-box border border-base-200 bg-base-100 shadow overflow-hidden">
                {upcomingSignups.length === 0 ? (
                  <div className="p-8 text-center">
                    <Icon
                      name="calendar-off"
                      size={36}
                      className="mx-auto text-base-content/20 mb-3"
                    />
                    <p className="text-base-content/50 font-medium">
                      No upcoming commitments
                    </p>
                    <p className="text-base-content/40 text-sm mt-1 mb-4">
                      Browse open serve days to sign up.
                    </p>
                    <Link to="/events" className="kbtn kbtn-sm kbtn-primary">
                      Browse Serve Days
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {upcomingSignups.map(({ signup, event }) => (
                      <li
                        key={signup.id}
                        className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
                      >
                        <div className="flex-c-st gap-0.5">
                          <span className="font-medium text-sm">
                            {event?.values?.['Event Name'] || 'Event'}
                          </span>
                          <span className="text-xs text-base-content/50 flex items-center gap-1">
                            <Icon name="calendar" size={13} />
                            {formatDate(event?.values?.['Event Date'])}
                          </span>
                        </div>
                        <SignupStatusBadge
                          status={signup.values?.['Signup Status']}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* ── My Projects ─────────────────────────────────────────── */}
            <section>
              <SectionHeading
                right={
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={clsx(
                        'kbtn kbtn-xs',
                        projectFilter === 'upcoming'
                          ? 'kbtn-primary'
                          : 'kbtn-ghost',
                      )}
                      onClick={() => setProjectFilter('upcoming')}
                    >
                      Upcoming
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        'kbtn kbtn-xs',
                        projectFilter === 'past'
                          ? 'kbtn-primary'
                          : 'kbtn-ghost',
                      )}
                      onClick={() => setProjectFilter('past')}
                    >
                      Past
                    </button>
                  </div>
                }
              >
                My Projects
              </SectionHeading>
              <div className="rounded-box border border-base-200 bg-base-100 shadow overflow-hidden">
                {displayedProjects.length === 0 ? (
                  <div className="p-8 text-center">
                    <Icon
                      name="hammer"
                      size={36}
                      className="mx-auto text-base-content/20 mb-3"
                    />
                    <p className="text-base-content/50 font-medium text-sm">
                      {projectFilter === 'upcoming'
                        ? 'No upcoming projects'
                        : 'No past projects'}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {displayedProjects.map(({ assignment, project }) => {
                      const status =
                        project.values?.['Project Status'] || 'Active';
                      const statusColor =
                        PROJECT_STATUS_COLORS[status] ||
                        'bg-base-200 text-base-content/70';
                      const scheduledDate =
                        project.values?.['Scheduled Date'];

                      return (
                        <li
                          key={assignment.id}
                          className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
                        >
                          <div className="flex-c-st gap-0.5">
                            <span className="font-medium text-sm">
                              {project.label ||
                                project.values?.['Project Name'] ||
                                'Untitled Project'}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-base-content/50">
                              {scheduledDate && (
                                <span className="flex items-center gap-1">
                                  <Icon name="calendar" size={13} />
                                  {formatDate(scheduledDate)}
                                </span>
                              )}
                              {project.values?.['Project Captain'] && (
                                <span className="flex items-center gap-1">
                                  <Icon name="user" size={13} />
                                  {project.values['Project Captain']}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={clsx(
                              'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                              statusColor,
                            )}
                          >
                            {status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────────── */}
            <section>
              <div className="rounded-box border border-primary/20 bg-primary/5 p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Icon
                    name="calendar-heart"
                    size={28}
                    className="text-primary flex-none"
                  />
                  <div>
                    <p className="font-semibold text-base-content">
                      Find Your Next Serve Day
                    </p>
                    <p className="text-sm text-base-content/60">
                      Browse upcoming events and sign up to make a difference.
                    </p>
                  </div>
                </div>
                <Link
                  to="/events"
                  className="kbtn kbtn-primary kbtn-sm flex-none"
                >
                  Browse Serve Days
                  <Icon name="arrow-right" size={15} />
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
