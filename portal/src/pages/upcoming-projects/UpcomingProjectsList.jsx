import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Icon } from '../../atoms/Icon.jsx';
import { Error } from '../../components/states/Error.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { formatLocalDate } from '../../helpers/index.js';

export const UpcomingProjectsList = ({ initialized, loading, projects, error }) => {
  const mobile = useSelector(state => state.view.mobile);

  return (
    <div className="gutter pb-24 md:pb-8">
      <div className="max-w-screen-lg mx-auto pt-1 pb-6">
        <PageHeading title="Upcoming Projects" backTo="/">
          <span className="text-sm text-base-content/50 font-medium ml-auto">
            {projects?.length > 0 &&
              `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </span>
        </PageHeading>

        {initialized && (
          <>
            {error ? (
              <Error error={error} />
            ) : (
              <div className="flex-c-st gap-4">
                {loading && !projects?.length && <Loading />}

                {projects?.length > 0 &&
                  (mobile ? (
                    <div className="flex-c-st gap-3">
                      {projects.map(project => (
                        <Link
                          key={project['Project Id']}
                          to={project['Project Id']}
                          className={clsx(
                            'flex-c-st gap-3 p-4 bg-base-100 rounded-box border border-base-200',
                            'hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.99]',
                          )}
                        >
                          <div className="flex-bc gap-3">
                            <span className="font-semibold text-base line-clamp-1">
                              {project['Project Name'] || '—'}
                            </span>
                            <Icon
                              name="chevron-right"
                              size={18}
                              className="flex-none text-base-content/30"
                            />
                          </div>
                          <div className="flex-sc gap-3 flex-wrap">
                            <span className="text-xs text-base-content/50">
                              <Icon
                                name="calendar"
                                size={14}
                                className="inline mr-1 -mt-0.5"
                              />
                              {formatLocalDate(project['Scheduled Date'])}
                            </span>
                            <span className="text-xs text-base-content/50">
                              <Icon
                                name="map-pin"
                                size={14}
                                className="inline mr-1 -mt-0.5"
                              />
                              {[project['City'], project['State']]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-box border border-base-200 bg-base-100">
                      <table className="w-full text-left">
                        <thead className="bg-base-200/60 text-xs uppercase tracking-wide text-base-content/60">
                          <tr>
                            <th className="px-5 py-3.5 font-semibold">
                              Project
                            </th>
                            <th className="px-5 py-3.5 font-semibold">
                              Scheduled Date
                            </th>
                            <th className="px-5 py-3.5 font-semibold">
                              Location
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-base-200">
                          {projects.map(project => (
                            <tr
                              key={project['Project Id']}
                              className="cursor-pointer hover:bg-base-200/40 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <Link
                                  to={project['Project Id']}
                                  className="font-semibold text-primary hover:underline"
                                >
                                  {project['Project Name'] || '—'}
                                </Link>
                              </td>
                              <td className="px-5 py-4 text-base-content/70">
                                {formatLocalDate(project['Scheduled Date'])}
                              </td>
                              <td className="px-5 py-4 text-base-content/70">
                                {[project['City'], project['State']]
                                  .filter(Boolean)
                                  .join(', ') || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                {!loading && projects?.length === 0 && (
                  <div className="rounded-box border border-base-200 bg-base-100 p-10 text-center">
                    <Icon
                      name="hammer"
                      size={40}
                      className="mx-auto text-base-content/20 mb-3"
                    />
                    <p className="text-base-content/50 font-medium">
                      No upcoming projects at this time
                    </p>
                    <p className="text-base-content/40 text-sm mt-1">
                      Check back soon for new volunteer opportunities!
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
