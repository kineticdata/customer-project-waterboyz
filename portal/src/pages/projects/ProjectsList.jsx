import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { ProjectFilters } from './ProjectFilters.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Error } from '../../components/states/Error.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import { useSelector } from 'react-redux';

const STATUS_COLORS = {
  Active: 'bg-success text-success-content',
  Completed: 'bg-primary/15 text-primary',
  'In Progress': 'bg-info text-info-content',
  Planning: 'bg-warning text-warning-content',
  Closed: 'bg-base-300 text-base-content/70',
};

export const ProjectsList = ({ listData, listActions, filters, setFilters, isLeadership }) => {
  const { initialized, error, loading, data, pageNumber } = listData;
  const { nextPage, previousPage, reloadPage } = listActions;
  const navigate = useNavigate();
  const location = useLocation();
  const mobile = useSelector(state => state.view.mobile);

  const reloadPageRef = useRef(reloadPage);
  reloadPageRef.current = reloadPage;
  useEffect(() => {
    reloadPageRef.current?.();
  }, [location.key]);

  const formatValue = value => {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
    return String(value);
  };

  return (
    <div className="gutter pb-24 md:pb-8">
      <div className="max-w-screen-lg mx-auto pt-6 pb-6">
        <PageHeading title="SWAT Projects" backTo="/" className="flex-wrap">
          <ProjectFilters
            type="projects"
            filters={filters}
            setFilters={setFilters}
            isLeadership={isLeadership}
          />
        </PageHeading>

        {initialized && (
          <>
            {error ? (
              <Error error={error} />
            ) : (
              <div className="flex-c-st gap-4">
                {loading && !data && <Loading />}

                {/* Card layout for mobile, table for desktop */}
                {data?.length > 0 && (
                  mobile ? (
                    <div className="flex-c-st gap-3">
                      {data.map(submission => {
                        const status = formatValue(
                          submission?.values?.['Project Status'],
                        );
                        const captain = formatValue(
                          submission?.values?.['Project Captain'],
                        );
                        const scheduledDate = formatValue(
                          submission?.values?.['Scheduled Date'],
                        );
                        const statusColor =
                          STATUS_COLORS[status] || 'bg-base-200 text-base-content/70';

                        return (
                          <Link
                            key={submission.id}
                            to={submission.id}
                            className={clsx(
                              'flex-c-st gap-3 p-4 bg-base-100 rounded-box border border-base-200',
                              'hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.99]',
                            )}
                          >
                            <div className="flex-bc gap-3">
                              <span className="font-semibold text-base line-clamp-1">
                                {formatValue(submission?.label)}
                              </span>
                              <Icon
                                name="chevron-right"
                                size={18}
                                className="flex-none text-base-content/30"
                              />
                            </div>
                            <div className="flex-sc gap-2 flex-wrap">
                              <span
                                className={clsx(
                                  'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                  statusColor,
                                )}
                              >
                                {status}
                              </span>
                              {captain !== '—' && (
                                <span className="text-xs text-base-content/50">
                                  <Icon
                                    name="user"
                                    size={14}
                                    className="inline mr-1 -mt-0.5"
                                  />
                                  {captain}
                                </span>
                              )}
                              {scheduledDate !== '—' && (
                                <span className="text-xs text-base-content/50">
                                  <Icon
                                    name="calendar"
                                    size={14}
                                    className="inline mr-1 -mt-0.5"
                                  />
                                  {scheduledDate}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
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
                              Status
                            </th>
                            <th className="px-5 py-3.5 font-semibold">
                              Project Lead
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-base-200">
                          {data.map(submission => {
                            const status = formatValue(
                              submission?.values?.['Project Status'],
                            );
                            const projectLead = formatValue(
                              submission?.values?.['Project Captain'],
                            );
                            const statusColor =
                              STATUS_COLORS[status] ||
                              'bg-base-200 text-base-content/70';

                            return (
                              <tr
                                key={submission.id}
                                className="cursor-pointer hover:bg-base-200/40 transition-colors"
                                onClick={() => navigate(submission.id)}
                                tabIndex={0}
                                role="button"
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate(submission.id);
                                  }
                                }}
                              >
                                <td className="px-5 py-4">
                                  <Link
                                    to={`${submission.id}`}
                                    className="font-semibold text-primary hover:underline focus:outline-none"
                                  >
                                    {formatValue(submission?.label)}
                                  </Link>
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className={clsx(
                                      'px-2.5 py-1 rounded-full text-xs font-semibold',
                                      statusColor,
                                    )}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-base-content/70">
                                  {projectLead}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {data?.length === 0 && (
                  <div className="rounded-box border border-base-200 bg-base-100 p-10 text-center">
                    <Icon
                      name="hammer"
                      size={40}
                      className="mx-auto text-base-content/20 mb-3"
                    />
                    <p className="text-base-content/50 font-medium">
                      No projects to show
                      {previousPage ? ' on this page' : ''}
                    </p>
                  </div>
                )}

                {(data?.length > 0 || previousPage) && (
                  <div className="flex-cc gap-4 py-2">
                    <button
                      type="button"
                      className="kbtn kbtn-ghost kbtn-circle"
                      onClick={previousPage}
                      disabled={!previousPage || loading}
                      aria-label="Previous Page"
                    >
                      <Icon name="chevron-left" />
                    </button>
                    {loading ? (
                      <Loading xsmall size={36} />
                    ) : (
                      <span className="text-sm font-semibold text-base-content/60 min-w-16 text-center">
                        Page {pageNumber}
                      </span>
                    )}
                    <button
                      type="button"
                      className="kbtn kbtn-ghost kbtn-circle"
                      onClick={nextPage}
                      disabled={!nextPage || loading}
                      aria-label="Next Page"
                    >
                      <Icon name="chevron-right" />
                    </button>
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
