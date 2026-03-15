import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { getAttributeValue } from '../../helpers/records.js';

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const volunteerByUsernameQuery = defineKqlQuery()
  .equals('values[Username]', 'username')
  .end();

const fetchVolunteer = ({ kappSlug, username }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'volunteers',
    search: {
      q: volunteerByUsernameQuery({ username }),
      include: ['details', 'values'],
      limit: 1,
    },
  });

const fetchEvents = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'events',
    search: { include: ['details', 'values'], limit: 100 },
  });

const mySignupsQuery = defineKqlQuery()
  .equals('type', 'formType')
  .equals('values[Volunteer ID]', 'volunteerId')
  .end();

const fetchMySignups = ({ kappSlug, volunteerId }) =>
  searchSubmissions({
    kapp: kappSlug,
    search: {
      q: mySignupsQuery({ formType: 'Event Sign Up', volunteerId }),
      include: ['details', 'values'],
      limit: 500,
    },
  });

const myProjectVolunteersQuery = defineKqlQuery()
  .equals('values[Volunteer ID]', 'volunteerId')
  .end();

const fetchMyProjectAssignments = ({ kappSlug, volunteerId }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'swat-project-volunteers',
    search: {
      q: myProjectVolunteersQuery({ volunteerId }),
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

const parseEventDate = value => {
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

const SignupStatusBadge = ({ status }) => {
  const cls = {
    Pending: 'badge badge-warning badge-sm',
    Confirmed: 'badge badge-success badge-sm',
    Assigned: 'badge badge-primary badge-sm',
    Waitlisted: 'badge badge-ghost badge-sm',
    Attended: 'badge badge-success badge-sm',
    Cancelled: 'badge badge-error badge-sm',
  }[status] ?? 'badge badge-ghost badge-sm';
  return <span className={cls}>{status || 'Pending'}</span>;
};

const PillList = ({ items, emptyText }) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-base-content/40 italic">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map(item => (
        <span key={item} className="badge badge-outline badge-sm">
          {item}
        </span>
      ))}
    </div>
  );
};

const SectionHeading = ({ children }) => (
  <h2 className="text-base font-semibold text-base-content mb-3">{children}</h2>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const MyVolunteeringPage = () => {
  const { kappSlug } = useSelector(state => state.app);
  const profile = useSelector(state => state.app.profile);

  const volunteerId = getAttributeValue(profile, 'Volunteer Id');
  const username = profile?.username;

  // ── Volunteer record ──────────────────────────────────────────────────────
  const volunteerParams = useMemo(
    () => (kappSlug && username ? { kappSlug, username } : null),
    [kappSlug, username],
  );
  const {
    initialized: volunteerInitialized,
    loading: volunteerLoading,
    response: volunteerResponse,
  } = useData(fetchVolunteer, volunteerParams);

  // ── Events ────────────────────────────────────────────────────────────────
  const eventsParams = useMemo(() => (kappSlug ? { kappSlug } : null), [kappSlug]);
  const {
    initialized: eventsInitialized,
    response: eventsResponse,
  } = useData(fetchEvents, eventsParams);

  // ── My signups ────────────────────────────────────────────────────────────
  const signupsParams = useMemo(
    () => (kappSlug && volunteerId ? { kappSlug, volunteerId } : null),
    [kappSlug, volunteerId],
  );
  const {
    initialized: signupsInitialized,
    response: signupsResponse,
  } = useData(fetchMySignups, signupsParams);

  // ── My project assignments ────────────────────────────────────────────────
  const projectAssignmentsParams = useMemo(
    () => (kappSlug && volunteerId ? { kappSlug, volunteerId } : null),
    [kappSlug, volunteerId],
  );
  const {
    initialized: projectAssignmentsInitialized,
    response: projectAssignmentsResponse,
  } = useData(fetchMyProjectAssignments, projectAssignmentsParams);

  // ── Derived data ──────────────────────────────────────────────────────────

  const volunteerRecord = volunteerResponse?.submissions?.[0] ?? null;

  const skills = useMemo(() => {
    try {
      return JSON.parse(volunteerRecord?.values?.['Skill Areas'] || '[]');
    } catch {
      return [];
    }
  }, [volunteerRecord]);

  const tools = useMemo(() => {
    try {
      return JSON.parse(volunteerRecord?.values?.['Tools'] || '[]');
    } catch {
      return [];
    }
  }, [volunteerRecord]);

  const availability = volunteerRecord?.values?.['How often can you volunteer'] || null;

  // Build eventId → event map for quick lookups
  const eventsById = useMemo(() => {
    const map = {};
    for (const event of eventsResponse?.submissions ?? []) {
      map[event.id] = event;
    }
    return map;
  }, [eventsResponse]);

  const allSignups = useMemo(
    () => signupsResponse?.submissions ?? [],
    [signupsResponse],
  );

  // Split signups into upcoming / past (excluding Cancelled)
  const { upcomingSignups, pastSignups } = useMemo(() => {
    const now = today();
    const upcoming = [];
    const past = [];

    for (const signup of allSignups) {
      const status = signup.values?.['Signup Status'];
      if (status === 'Cancelled') continue;

      const event = eventsById[signup.values?.['Event ID']];
      const eventDate = event ? parseEventDate(event.values?.['Event Date']) : null;

      if (!eventDate) {
        // Can't determine date — put in upcoming as a safe default
        upcoming.push({ signup, event });
      } else if (eventDate >= now || status === 'Attended') {
        // Attended events always show in past regardless of date logic
        if (status === 'Attended') {
          past.push({ signup, event });
        } else {
          upcoming.push({ signup, event });
        }
      } else {
        past.push({ signup, event });
      }
    }

    // Sort upcoming ascending (soonest first), past descending (most recent first)
    upcoming.sort((a, b) => {
      const da = a.event ? parseEventDate(a.event.values?.['Event Date']) : null;
      const db = b.event ? parseEventDate(b.event.values?.['Event Date']) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
    past.sort((a, b) => {
      const da = a.event ? parseEventDate(a.event.values?.['Event Date']) : null;
      const db = b.event ? parseEventDate(b.event.values?.['Event Date']) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });

    return { upcomingSignups: upcoming, pastSignups: past.slice(0, 5) };
  }, [allSignups, eventsById]);

  const projectAssignments = useMemo(
    () => projectAssignmentsResponse?.submissions ?? [],
    [projectAssignmentsResponse],
  );

  // ── Loading / error states ─────────────────────────────────────────────────

  const initialized =
    volunteerInitialized && eventsInitialized && signupsInitialized && projectAssignmentsInitialized;

  const loading = volunteerLoading;

  if (!profile) return <Loading />;

  // If the user has no Volunteer Id we show a prompt rather than an empty page
  if (profile && !volunteerId) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-1 pb-6">
          <PageHeading title="My Volunteering" backTo="/" />
          <div className="rounded-box border border-base-200 bg-base-100 p-10 text-center">
            <Icon
              name="user-heart"
              size={40}
              className="mx-auto text-base-content/20 mb-3"
            />
            <p className="text-base-content/50 font-medium">
              Your volunteer profile isn't set up yet
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
      <div className="max-w-screen-lg mx-auto pt-1 pb-6">
        <PageHeading title="My Volunteering" backTo="/" />

        {!initialized ? (
          <Loading />
        ) : (
          <div className="flex-c-st gap-6">
            {/* ── Section 1: Profile Summary ──────────────────────────────── */}
            <section>
              <SectionHeading>My Profile</SectionHeading>
              <div className="rounded-box border border-base-200 bg-base-100 shadow p-5 flex-c-st gap-4">
                {loading && !volunteerRecord ? (
                  <Loading />
                ) : !volunteerRecord ? (
                  <div className="text-center py-4">
                    <p className="text-base-content/50 text-sm mb-3">
                      Volunteer profile record not found.
                    </p>
                    <Link to="/profile?tab=volunteer" className="kbtn kbtn-primary kbtn-sm">
                      Complete Volunteer Profile
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40 mb-1">
                          Skills
                        </p>
                        <PillList items={skills} emptyText="No skills listed yet." />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40 mb-1">
                          Tools
                        </p>
                        <PillList items={tools} emptyText="No tools listed yet." />
                      </div>
                    </div>

                    {availability && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40 mb-1">
                          Availability
                        </p>
                        <p className="text-sm text-base-content/70">{availability}</p>
                      </div>
                    )}

                    <div className="pt-1">
                      <Link to="/profile?tab=volunteer" className="kbtn kbtn-sm kbtn-ghost">
                        <Icon name="pencil" size={15} />
                        Edit Profile
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── Section 2: Upcoming Commitments ──────────────────────────── */}
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
                    <p className="text-base-content/50 font-medium">No upcoming commitments</p>
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
                            {event?.values?.['Event Name'] || 'Unknown Event'}
                          </span>
                          <span className="text-xs text-base-content/50 flex items-center gap-1">
                            <Icon name="calendar" size={13} />
                            {formatDate(event?.values?.['Event Date'])}
                          </span>
                        </div>
                        <SignupStatusBadge status={signup.values?.['Signup Status']} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* ── Section 3: Past Service ───────────────────────────────────── */}
            <section>
              <SectionHeading>Past Service</SectionHeading>
              <div className="rounded-box border border-base-200 bg-base-100 shadow overflow-hidden">
                {pastSignups.length === 0 ? (
                  <div className="p-8 text-center">
                    <Icon
                      name="history"
                      size={36}
                      className="mx-auto text-base-content/20 mb-3"
                    />
                    <p className="text-base-content/50 font-medium text-sm">
                      No past service recorded yet.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {pastSignups.map(({ signup, event }) => (
                      <li
                        key={signup.id}
                        className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
                      >
                        <div className="flex-c-st gap-0.5">
                          <span className="font-medium text-sm">
                            {event?.values?.['Event Name'] || 'Unknown Event'}
                          </span>
                          <span className="text-xs text-base-content/50 flex items-center gap-1">
                            <Icon name="calendar" size={13} />
                            {formatDate(event?.values?.['Event Date'])}
                          </span>
                        </div>
                        <SignupStatusBadge status={signup.values?.['Signup Status']} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* ── Section 4: Assigned Projects ─────────────────────────────── */}
            <section>
              <SectionHeading>Assigned Projects</SectionHeading>
              <div className="rounded-box border border-base-200 bg-base-100 shadow overflow-hidden">
                {projectAssignmentsResponse?.error ? (
                  <div className="p-5">
                    <Error error={projectAssignmentsResponse.error} />
                  </div>
                ) : projectAssignments.length === 0 ? (
                  <div className="p-8 text-center">
                    <Icon
                      name="hammer"
                      size={36}
                      className="mx-auto text-base-content/20 mb-3"
                    />
                    <p className="text-base-content/50 font-medium text-sm mb-4">
                      No projects assigned yet.
                    </p>
                    <Link to="/upcoming-projects" className="kbtn kbtn-sm kbtn-primary">
                      View Upcoming Projects
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {projectAssignments.map(assignment => {
                      const projectId = assignment.values?.['Project ID'];
                      return (
                        <li
                          key={assignment.id}
                          className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="tool" size={15} className="text-base-content/40" />
                            <span className="text-sm font-medium text-base-content/70">
                              Project ID: {projectId || '—'}
                            </span>
                          </div>
                          {assignment.values?.['Present'] && (
                            <span className="badge badge-success badge-sm">Attended</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {projectAssignments.length > 0 && (
                <div className="mt-2 text-right">
                  <Link to="/upcoming-projects" className="text-sm text-primary hover:underline">
                    View all upcoming projects
                  </Link>
                </div>
              )}
            </section>

            {/* ── Section 5: CTA ────────────────────────────────────────────── */}
            <section>
              <div className="rounded-box border border-primary/20 bg-primary/5 p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Icon name="calendar-heart" size={28} className="text-primary flex-none" />
                  <div>
                    <p className="font-semibold text-base-content">Find Your Next Serve Day</p>
                    <p className="text-sm text-base-content/60">
                      Browse upcoming events and sign up to make a difference.
                    </p>
                  </div>
                </div>
                <Link to="/events" className="kbtn kbtn-primary kbtn-sm flex-none">
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
