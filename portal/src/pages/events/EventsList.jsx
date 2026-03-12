import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { EventSignupModal } from '../../components/EventSignupModal.jsx';
import { useEventSignups } from '../../helpers/hooks/useEventSignups.js';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { getAttributeValue } from '../../helpers/records.js';
import { formatLocalDate } from '../../helpers/index.js';
import { useEffect } from 'react';

const statusBadgeClass = status => {
  switch (status) {
    case 'Open':
      return 'badge badge-success badge-sm';
    case 'Planning':
      return 'badge badge-warning badge-sm';
    case 'Closed':
      return 'badge badge-error badge-sm';
    case 'Completed':
      return 'badge badge-ghost badge-sm';
    default:
      return 'badge badge-ghost badge-sm';
  }
};

export const EventsList = () => {
  const profile = useSelector(state => state.app.profile);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLeadership, isAdmin } = useRoles();

  const volunteerId = getAttributeValue(profile, 'Volunteer Id');

  // Redirect to profile volunteer tab if not a volunteer
  useEffect(() => {
    if (profile && !volunteerId) {
      const returnTo = location.pathname + location.search;
      navigate('/profile?tab=volunteer', {
        replace: true,
        state: { returnTo },
      });
    }
  }, [profile, volunteerId, location, navigate]);

  const {
    events,
    eventsLoading,
    eventsError,
    initialized,
    mySignupsByEventId,
    reloadSignups,
    pendingCancelId,
    handleCancel,
  } = useEventSignups();

  const [signupModal, setSignupModal] = useState(null);

  // Don't render until profile is loaded; redirect handled by useEffect above
  if (profile && !volunteerId) return null;

  return (
    <>
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-1 pb-6">
          <PageHeading title="Events" backTo="/">
            {(isLeadership || isAdmin) && (
              <Link to="/admin/events" className="kbtn kbtn-sm kbtn-ghost ml-auto">
                <Icon name="settings" size={16} />
                Manage Events
              </Link>
            )}
          </PageHeading>

          {!initialized ? (
            <Loading />
          ) : eventsError ? (
            <Error error={eventsError} />
          ) : (
            <div className="flex-c-st gap-4">
              {eventsLoading && !events.length && <Loading />}

              {events.length === 0 && !eventsLoading && (
                <div className="rounded-box border border-base-200 bg-base-100 p-10 text-center">
                  <Icon
                    name="calendar-off"
                    size={40}
                    className="mx-auto text-base-content/20 mb-3"
                  />
                  <p className="text-base-content/50 font-medium">No events scheduled</p>
                  <p className="text-base-content/40 text-sm mt-1">
                    Check back soon for upcoming serve opportunities.
                  </p>
                </div>
              )}

              {events.map(event => {
                const mySignup = mySignupsByEventId[event.id];
                const signupStatus = mySignup?.values?.['Signup Status'];
                const isSignedUp = !!mySignup && signupStatus !== 'Cancelled';
                const isClosed =
                  event.values?.['Event Status'] === 'Closed' ||
                  event.values?.['Event Status'] === 'Completed';
                const isCancelling = pendingCancelId === event.id;

                return (
                  <div
                    key={event.id}
                    className="rounded-box border border-base-200 bg-base-100 p-5 flex-c-st gap-3"
                  >
                    <div className="flex-bc gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">
                          {event.values?.['Event Name'] || '—'}
                        </span>
                        <span className={statusBadgeClass(event.values?.['Event Status'])}>
                          {event.values?.['Event Status'] || 'Unknown'}
                        </span>
                        {isSignedUp && (
                          <span className="badge badge-primary badge-sm">
                            {signupStatus === 'Assigned'
                              ? 'Assigned'
                              : signupStatus === 'Waitlisted'
                                ? 'Waitlisted'
                                : 'Signed Up'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        {(isLeadership || isAdmin) && (
                          <Link
                            to={`/events/${event.id}/assign`}
                            className="kbtn kbtn-sm kbtn-ghost"
                          >
                            <Icon name="layout-columns" size={15} />
                            Assign
                          </Link>
                        )}
                        {!isClosed && !isSignedUp && (
                          <button
                            type="button"
                            className="kbtn kbtn-sm kbtn-primary"
                            onClick={() => setSignupModal({ event, signup: mySignup })}
                          >
                            {signupStatus === 'Cancelled' ? 'Re-register' : 'Sign Up'}
                          </button>
                        )}
                        {!isClosed && isSignedUp && signupStatus !== 'Assigned' && (
                          <button
                            type="button"
                            className="kbtn kbtn-sm kbtn-ghost text-error"
                            disabled={isCancelling}
                            onClick={() => handleCancel(event)}
                          >
                            {isCancelling ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-base-content/60">
                      <span className="flex items-center gap-1.5">
                        <Icon name="calendar" size={15} />
                        {formatLocalDate(event.values?.['Event Date'], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {event.values?.['Sign-up Deadline'] && (
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" size={15} />
                          Sign-up deadline:{' '}
                          {formatLocalDate(event.values?.['Sign-up Deadline'], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    {event.values?.['Event Description'] && (
                      <p className="text-sm text-base-content/70">
                        {event.values?.['Event Description']}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
