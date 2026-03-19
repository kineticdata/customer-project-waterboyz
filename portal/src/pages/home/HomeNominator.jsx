import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import clsx from 'clsx';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { useEventSignups } from '../../helpers/hooks/useEventSignups.js';
import { executeIntegration } from '../../helpers/api.js';
import { formatLocalDate } from '../../helpers/index.js';
import { HomeSection } from '../../components/home/HomeSection.jsx';

const FALLBACK_PROGRAMS = [
  {
    name: 'SWAT Projects',
    description:
      'Home repair, yard work, and improvement projects for families in need.',
    icon: 'tool',
    color: 'primary',
    nominationFormSlug: 'swat-project-nomination',
    order: 1,
  },
  {
    name: 'Christmas Alive',
    description:
      'Help provide Christmas gifts and support to families during the holiday season.',
    icon: 'christmas-tree',
    color: 'accent',
    nominationFormSlug: 'christmas-alive-family-nomination',
    order: 2,
  },
];

const activeProgramsQuery = defineKqlQuery()
  .equals('values[Status]', 'status')
  .end();

const fetchPrograms = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'programs',
    search: {
      q: activeProgramsQuery({ status: 'Active' }),
      include: ['values'],
      limit: 20,
    },
  });

const submissionsToPrograms = submissions =>
  submissions
    .map(s => ({
      name: s.values?.['Program Name'],
      description: s.values?.['Description'],
      icon: s.values?.['Icon'] || 'heart-handshake',
      color: s.values?.['Color'] || 'primary',
      nominationFormSlug: s.values?.['Nomination Form Slug'],
      order: parseInt(s.values?.['Home Page Order'], 10) || 99,
    }))
    .filter(p => p.name && p.nominationFormSlug)
    .sort((a, b) => a.order - b.order);

const usePrograms = () => {
  const { kappSlug } = useSelector(state => state.app);
  const params = useMemo(() => ({ kappSlug }), [kappSlug]);
  const { initialized, response } = useData(fetchPrograms, params);
  return useMemo(() => {
    if (!initialized || !response?.submissions?.length) return FALLBACK_PROGRAMS;
    const fetched = submissionsToPrograms(response.submissions);
    return fetched.length ? fetched : FALLBACK_PROGRAMS;
  }, [initialized, response]);
};

export const NominateSection = ({ className }) => {
  const programs = usePrograms();
  return (
    <div className={className}>
      <div className="max-w-screen-xl mx-auto flex-c-st gap-4">
        <div className="flex-bc">
          <h2 className="text-lg md:text-xl font-bold">Nominate a Family</h2>
        </div>
        <div
          className={clsx(
            'grid gap-4',
            programs.length === 1
              ? 'grid-cols-1 max-w-md'
              : 'grid-cols-1 md:grid-cols-2',
          )}
        >
          {programs.map(program => (
            <Link
              key={program.nominationFormSlug}
              to={`/forms/${program.nominationFormSlug}`}
              className="flex-sc gap-4 p-5 bg-base-100 rounded-box border border-base-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`flex-cc w-12 h-12 rounded-full bg-${program.color}/10 text-${program.color} flex-none`}
              >
                <Icon name={program.icon} size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{program.name}</p>
                <p className="text-sm text-base-content/55 mt-0.5 line-clamp-2">
                  {program.description}
                </p>
              </div>
              <Icon name="chevron-right" size={18} className="text-base-content/40 flex-none" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const DATE_OPTIONS = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

const fetchUpcomingProjects = ({ kappSlug }) =>
  executeIntegration({ kappSlug, integrationName: 'Upcoming SWAT Projects' });

export const HomeNominator = () => {
  const { kappSlug } = useSelector(state => state.app);
  const programs = usePrograms();

  const {
    events: allEvents,
    initialized: eventsInitialized,
    mySignupsByEventId,
  } = useEventSignups();

  const upcomingEvents = useMemo(
    () =>
      allEvents
        .filter(e => {
          const status = e.values?.['Event Status'];
          return status === 'Open' || status === 'Planning';
        })
        .slice(0, 3),
    [allEvents],
  );

  // Fetch upcoming SWAT projects
  const projectsParams = useMemo(() => ({ kappSlug }), [kappSlug]);
  const {
    initialized: projectsInitialized,
    response: projectsResponse,
  } = useData(fetchUpcomingProjects, projectsParams);

  const upcomingProjects = useMemo(
    () => (projectsResponse?.Projects ?? []).slice(0, 3),
    [projectsResponse],
  );

  return (
    <div className="flex-c-st gap-0 pb-24 md:pb-8">
      {/* Mission Hero */}
      <div className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10 gutter py-12 md:py-20">
          <div className="max-w-screen-xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-primary-content mb-4">
              Helping Families. Serving Community.
            </h1>
            <p className="text-primary-content/75 text-lg max-w-xl mb-8">
              Waterboyz connects volunteers with families in need for home
              repair, yard work, and more — all powered by the generosity of
              our community.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/profile?tab=volunteer"
                className="kbtn kbtn-accent kbtn-lg"
              >
                <Icon name="users" size={20} />
                Set Up Your Volunteer Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Program Cards */}
      <div className="gutter -mt-6 md:-mt-8 relative z-10">
        <div className="max-w-screen-xl mx-auto">
          <div
            className={clsx(
              'grid gap-5',
              programs.length === 1
                ? 'grid-cols-1 max-w-md'
                : programs.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {programs.map(program => (
              <div
                key={program.nominationFormSlug}
                className="group flex-c-st gap-4 p-6 md:p-8 bg-base-100 rounded-box shadow-lg border border-base-200"
              >
                <div className="flex-sc gap-4">
                  <div
                    className={`flex-cc w-14 h-14 rounded-full bg-${program.color}/10 text-${program.color} flex-none`}
                  >
                    <Icon name={program.icon} size={28} />
                  </div>
                  <h2 className="text-xl font-bold">{program.name}</h2>
                </div>
                <p className="text-base-content/70 text-sm">
                  {program.description}
                </p>
                <Link
                  to={`/forms/${program.nominationFormSlug}`}
                  className={`kbtn kbtn-${program.color} kbtn-sm mt-auto`}
                >
                  Nominate a Family
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <HomeSection title="Upcoming Events" viewAllTo="/events">
        {!eventsInitialized ? (
          <div className="bg-base-100 rounded-box border border-base-200 p-6">
            <Loading />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-base-100 rounded-box border border-base-200 px-5 py-8 text-center">
            <Icon
              name="calendar-off"
              size={36}
              className="mx-auto text-base-content/20 mb-3"
            />
            <p className="text-base-content/50 font-medium text-sm">
              No upcoming events right now.
            </p>
          </div>
        ) : (
          <ul className="bg-base-100 rounded-box border border-base-200 overflow-hidden divide-y divide-base-200">
            {upcomingEvents.map(event => {
              const mySignup = mySignupsByEventId[event.id];
              const signupStatus = mySignup?.values?.['Signup Status'];
              const isSignedUp = !!mySignup && signupStatus !== 'Cancelled';

              return (
                <React.Fragment key={event.id}>
                  <li className="flex-sc gap-3 px-4 py-3.5">
                    <div className="flex-cc w-9 h-9 rounded-lg bg-primary/10 text-primary flex-none">
                      <Icon name="calendar-event" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {event.values?.['Event Name'] || '—'}
                      </p>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        {formatLocalDate(event.values?.['Event Date'], DATE_OPTIONS)}
                      </p>
                    </div>
                    {isSignedUp && (
                      <span className={`badge badge-sm font-semibold ${
                        signupStatus === 'Assigned'
                          ? 'badge-success'
                          : signupStatus === 'Waitlisted'
                            ? 'badge-warning'
                            : 'badge-primary'
                      }`}>
                        {signupStatus === 'Assigned'
                          ? 'Assigned'
                          : signupStatus === 'Waitlisted'
                            ? 'Waitlisted'
                            : 'Signed Up'}
                      </span>
                    )}
                  </li>
                  {isSignedUp && (
                    <li>
                      <Link
                        to="/profile?tab=volunteer"
                        className="flex-sc gap-3 px-4 py-3 bg-warning/15 hover:bg-warning/20 transition-colors"
                      >
                        <div className="flex-cc w-9 h-9 rounded-lg bg-warning/15 text-warning flex-none">
                          <Icon name="user-exclamation" size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-warning-content">
                            Complete your volunteer profile
                          </p>
                          <p className="text-xs text-base-content/50 mt-0.5">
                            Required before you can be assigned to a project
                          </p>
                        </div>
                        <Icon name="arrow-right" size={16} className="text-warning flex-none" />
                      </Link>
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ul>
        )}
        <Link
          to="/profile?tab=volunteer"
          className="flex-sc gap-3 p-4 bg-primary text-primary-content rounded-box text-sm hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Icon name="user-circle" size={20} className="flex-none" />
          <span className="flex-1 font-medium">
            Create your volunteer profile to sign up for events
          </span>
          <Icon name="arrow-right" size={16} className="flex-none opacity-70" />
        </Link>
      </HomeSection>

      {/* Upcoming SWAT Projects */}
      <HomeSection title="Upcoming Projects" viewAllTo="/upcoming-projects">
        {!projectsInitialized ? (
          <div className="bg-base-100 rounded-box border border-base-200 p-6">
            <Loading />
          </div>
        ) : upcomingProjects.length === 0 ? (
          <div className="bg-base-100 rounded-box border border-base-200 px-5 py-8 text-center">
            <Icon
              name="hammer"
              size={36}
              className="mx-auto text-base-content/20 mb-3"
            />
            <p className="text-base-content/50 font-medium text-sm">
              No upcoming projects right now.
            </p>
          </div>
        ) : (
          <ul className="bg-base-100 rounded-box border border-base-200 overflow-hidden divide-y divide-base-200">
            {upcomingProjects.map(project => (
              <li key={project['Project Id']}>
                <Link
                  to={`/upcoming-projects/${project['Project Id']}`}
                  className="flex-sc gap-3 px-4 py-3.5 hover:bg-base-200/50 transition-colors"
                >
                  <div className="flex-cc w-9 h-9 rounded-lg bg-accent/10 text-accent flex-none">
                    <Icon name="tool" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {project['Project Name'] || '—'}
                    </p>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {formatLocalDate(project['Scheduled Date'], DATE_OPTIONS)}
                      {project['City'] &&
                        ` · ${[project['City'], project['State']].filter(Boolean).join(', ')}`}
                    </p>
                  </div>
                  <Icon
                    name="chevron-right"
                    size={16}
                    className="text-base-content/30 flex-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </HomeSection>

      {/* How It Works */}
      <div className="gutter mt-12 md:mt-16">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: '1',
                icon: 'pencil',
                title: 'Nominate',
                description:
                  'Submit a nomination for a family in need through our secure form.',
              },
              {
                step: '2',
                icon: 'users-group',
                title: 'We Review',
                description:
                  'Our SWAT Leadership team reviews nominations and schedules a project.',
              },
              {
                step: '3',
                icon: 'heart-handshake',
                title: 'We Serve',
                description:
                  'Volunteers show up and make a lasting difference.',
              },
            ].map(({ step, icon, title, description }) => (
              <div key={step} className="flex-c-cc gap-4 text-center">
                <div className="relative flex-cc w-16 h-16 rounded-full bg-primary/10 text-primary">
                  <Icon name={icon} size={28} />
                  <span className="absolute -top-1 -right-1 flex-cc w-6 h-6 rounded-full bg-primary text-primary-content text-xs font-bold">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-base-content/65 text-sm max-w-xs">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
