import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { PublicLayout } from '../../components/PublicLayout.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { formatLocalDate } from '../../helpers/index.js';

const openEventsQuery = defineKqlQuery()
  .equals('values[Event Status]', 'status')
  .end();

const fetchOpenEvents = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'events',
    public: true,
    search: {
      q: openEventsQuery({ status: 'Open' }),
      include: ['details', 'values'],
      limit: 100,
    },
  });

export const PublicEventsList = () => {
  const authenticated = useSelector(state => state.app.authenticated);
  const kappSlug = useSelector(state => state.app.kappSlug);
  const params = useMemo(() => (kappSlug ? { kappSlug } : null), [kappSlug]);

  if (authenticated) return <Navigate to="/events" replace />;
  const { initialized, loading, response } = useData(fetchOpenEvents, params);

  const events = useMemo(
    () => response?.submissions ?? [],
    [response],
  );

  return (
    <PublicLayout>
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-md mx-auto pt-8 pb-6">
          {/* Page heading */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl md:text-3xl font-bold">Upcoming Events</h1>
            <p className="text-base-content/60 mt-2 text-sm md:text-base">
              Sign up to serve with Waterboyz for Jesus
            </p>
          </div>

          {!initialized || loading ? (
            <Loading />
          ) : response?.error ? (
            <Error error={response.error} />
          ) : events.length === 0 ? (
            <div className="rounded-box border border-base-200 bg-base-100 p-10 text-center">
              <Icon
                name="calendar-off"
                size={40}
                className="mx-auto text-base-content/20 mb-3"
              />
              <p className="text-base-content/50 font-medium">
                No events currently open for sign-up
              </p>
              <p className="text-base-content/40 text-sm mt-1">
                Check back soon for upcoming serve opportunities.
              </p>
            </div>
          ) : (
            <div className="flex-c-st gap-4">
              {events.map(event => {
                const formSlug =
                  event.values?.['Sign Up Form Slug'] || 'serve-day-sign-up';
                const deadline = event.values?.['Sign-up Deadline'];

                return (
                  <Link
                    key={event.id}
                    to={`/public/events/${formSlug}?eventId=${event.id}`}
                    className="rounded-box border border-base-200 bg-base-100 p-5 flex-c-st gap-3 hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex-bc gap-3 flex-wrap">
                      <span className="font-semibold text-base group-hover:text-primary transition-colors">
                        {event.values?.['Event Name'] || '—'}
                      </span>
                      <Icon
                        name="arrow-right"
                        size={16}
                        className="text-base-content/30 group-hover:text-primary transition-colors"
                      />
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
                      {deadline && (
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" size={15} />
                          Sign-up deadline:{' '}
                          {formatLocalDate(deadline, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    {event.values?.['Event Description'] && (
                      <p className="text-sm text-base-content/70">
                        {event.values['Event Description']}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};
