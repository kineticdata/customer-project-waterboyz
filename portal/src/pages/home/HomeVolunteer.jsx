import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { HomeHero } from '../../components/home/HomeHero.jsx';
import { HomeSection } from '../../components/home/HomeSection.jsx';
import { EventSignupModal } from '../../components/EventSignupModal.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { useEventSignups } from '../../helpers/hooks/useEventSignups.js';
import { executeIntegration } from '../../helpers/api.js';
import { getProfileAttributeValue } from '../../helpers/records.js';
import { formatLocalDate } from '../../helpers/index.js';
import { ActivityList, Shortcuts } from './Home.jsx';
import { NominateSection } from './HomeNominator.jsx';

const DATE_OPTIONS = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

const fetchUpcomingProjects = ({ kappSlug }) =>
  executeIntegration({ kappSlug, integrationName: 'Upcoming SWAT Projects' });

export const HomeVolunteer = () => {
  const { profile, kappSlug } = useSelector(state => state.app);

  const profileLastUpdated = getProfileAttributeValue(
    profile,
    'Profile Last Updated Date',
  );

  const {
    events: allEvents,
    initialized,
    mySignupsByEventId,
    reloadSignups,
    pendingCancelId,
    handleCancel,
  } = useEventSignups();

  // Only show upcoming (open/planning) events, capped at 3 for the home widget
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

  // Modal state — holds { event, signup } when open, null when closed
  const [signupModal, setSignupModal] = useState(null);

  // Track whether the user has any nominations (null = not yet loaded)
  const [nominationsCount, setNominationsCount] = useState(null);
  const handleNominationsLoaded = useCallback(
    count => setNominationsCount(count),
    [],
  );

  // Fetch upcoming SWAT projects open for volunteers
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
    <>
      <div className="flex-c-st gap-0 pb-24 md:pb-8">
        <HomeHero
          eyebrow="Welcome back"
          title={profile.displayName}
          subtitle="Ready to serve? Here's what's coming up for you."
        />

        {/* Profile nudge — shown when profile has never been updated */}
        {!profileLastUpdated && (
          <div className="gutter mt-6">
            <div className="max-w-screen-xl mx-auto">
              <Link
                to="/profile?tab=volunteer"
                className="flex-sc gap-3 p-4 bg-warning/10 border border-warning/30 rounded-box text-sm hover:bg-warning/20 transition-colors"
              >
                <Icon name="user-circle" size={20} className="text-warning flex-none" />
                <span className="flex-1 font-medium">
                  Keep your profile up to date
                </span>
                <Icon name="chevron-right" size={16} className="text-base-content/40 flex-none" />
              </Link>
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <HomeSection title="Upcoming Events" viewAllTo="/events">
          {!initialized ? (
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
              <p className="text-base-content/40 text-sm mt-1">
                Check back soon for new serve opportunities.
              </p>
            </div>
          ) : (
            <ul className="bg-base-100 rounded-box border border-base-200 overflow-hidden divide-y divide-base-200">
              {upcomingEvents.map(event => {
                const mySignup = mySignupsByEventId[event.id];
                const signupStatus = mySignup?.values?.['Signup Status'];
                const isSignedUp = !!mySignup && signupStatus !== 'Cancelled';
                const isCancelling = pendingCancelId === event.id;
                const isClosed =
                  event.values?.['Event Status'] === 'Closed' ||
                  event.values?.['Event Status'] === 'Completed';

                return (
                  <li key={event.id} className="flex-sc gap-3 px-4 py-3.5">
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
                    {isSignedUp ? (
                      <div className="flex items-center gap-2 flex-none">
                        <span className="badge badge-primary badge-sm">
                          {signupStatus === 'Assigned'
                            ? 'Assigned'
                            : signupStatus === 'Waitlisted'
                              ? 'Waitlisted'
                              : 'Signed Up'}
                        </span>
                        {signupStatus !== 'Assigned' && (
                          <button
                            type="button"
                            className="kbtn kbtn-xs kbtn-ghost text-error"
                            disabled={isCancelling}
                            onClick={() => handleCancel(event)}
                          >
                            {isCancelling ? '…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    ) : !isClosed ? (
                      <button
                        type="button"
                        className="kbtn kbtn-sm kbtn-primary flex-none"
                        onClick={() => setSignupModal({ event, signup: mySignup })}
                      >
                        {signupStatus === 'Cancelled' ? 'Re-register' : 'Register'}
                      </button>
                    ) : (
                      <span className="badge badge-ghost badge-sm flex-none">
                        {event.values?.['Event Status']}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </HomeSection>

        {/* Upcoming SWAT Projects */}
        <HomeSection title="Upcoming SWAT Projects" viewAllTo="/upcoming-projects">
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
              <p className="text-base-content/40 text-sm mt-1">
                Check back soon for new volunteer opportunities.
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

          {upcomingProjects.length > 0 && (
            <Link
              to="/upcoming-projects"
              className="flex-sc gap-4 p-5 bg-base-100 rounded-box border border-base-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex-cc w-12 h-12 rounded-full bg-accent/10 text-accent flex-none">
                <Icon name="hammer" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Browse All Open Projects</p>
                <p className="text-sm text-base-content/55 mt-0.5">
                  Find ad-hoc projects that need your skills.
                </p>
              </div>
              <Icon
                name="chevron-right"
                size={18}
                className="text-base-content/40 flex-none"
              />
            </Link>
          )}
        </HomeSection>

        {/* My Nominations — fetches always; section only visible when count > 0 */}
        <div className={nominationsCount > 0 ? 'gutter mt-8 md:mt-10' : 'hidden'}>
          <div className="max-w-screen-xl mx-auto flex-c-st gap-4">
            <div className="flex-bc">
              <h2 className="text-lg md:text-xl font-bold">My Nominations</h2>
              <Link
                to="/nominations"
                className="text-sm text-primary font-medium hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
              <ActivityList limit={3} onLoaded={handleNominationsLoaded} />
            </div>
          </div>
        </div>

        {/* Nominate a Family */}
        <NominateSection className="gutter mt-8 md:mt-10" />

        {/* Shortcuts */}
        <Shortcuts className="gutter mt-8 md:mt-10 pb-4" />
      </div>

      <EventSignupModal
        event={signupModal?.event}
        signup={signupModal?.signup}
        open={!!signupModal}
        onClose={() => setSignupModal(null)}
        onCreated={reloadSignups}
      />
    </>
  );
};
