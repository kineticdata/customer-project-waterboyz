import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { EventSignupModal } from '../../components/EventSignupModal.jsx';
import { useEventSignups } from '../../helpers/hooks/useEventSignups.js';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { formatLocalDate } from '../../helpers/index.js';

export const EventsList = () => {
  const { isLeadership, isAdmin, isVolunteer } = useRoles();

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

  return (
    <>
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-6 pb-6">
          <PageHeading title="Events" backTo="/">
            {(isLeadership || isAdmin) && (
              <Link to="/admin/events" className="kbtn kbtn-sm kbtn-ghost ml-auto">
                <Icon name="settings" size={16} />
                Manage Events
              </Link>
            )}
          </PageHeading>

          {!isVolunteer && (
            <Link
              to="/profile?tab=volunteer"
              className="flex-sc gap-3 p-4 bg-primary text-primary-content rounded-box text-sm hover:bg-primary/90 transition-colors mb-2 shadow-sm"
            >
              <Icon name="user-circle" size={20} className="flex-none" />
              <span className="flex-1 font-medium">
                Create your volunteer profile to sign up for events
              </span>
              <Icon name="arrow-right" size={16} className="flex-none opacity-70" />
            </Link>
          )}

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
                  <React.Fragment key={event.id}>
                    <div className="rounded-box border border-base-200 bg-base-100 overflow-hidden">
                      <div className="p-5 flex-c-st gap-3">
                        <div className="flex-bc gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">
                              {event.values?.['Event Name'] || '—'}
                            </span>
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
                                className="text-sm text-error/70 hover:text-error hover:underline"
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

                      {isSignedUp && !isVolunteer && (
                        <Link
                          to="/profile?tab=volunteer"
                          className="flex-sc gap-3 px-5 py-3 bg-warning/15 border-t border-warning/30 hover:bg-warning/20 transition-colors"
                        >
                          <div className="flex-cc w-8 h-8 rounded-lg bg-warning/15 text-warning flex-none">
                            <Icon name="user-exclamation" size={16} />
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
                      )}
                    </div>
                  </React.Fragment>
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
