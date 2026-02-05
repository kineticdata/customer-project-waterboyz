import clsx from 'clsx';
import { ProjectFilters } from './ProjectFilters.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { Error } from '../../components/states/Error.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';

export const ProjectsList = ({ listData, listActions, filters, setFilters }) => {
  const { initialized, error, loading, data, pageNumber } = listData;
  const { nextPage, previousPage } = listActions;
  const navigate = useNavigate();

  const formatValue = value => {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
    return String(value);
  };

  const handleRowKeyDown = (event, submissionId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(submissionId);
    }
  };

  return (
    <div className="gutter">
      <div className="max-w-screen-lg pt-1 pb-6">
        <PageHeading title="SWAT Projects" backTo="/" className="flex-wrap">
          <ProjectFilters type="projects" filters={filters} setFilters={setFilters} />
        </PageHeading>

        {initialized && (
          <>
            {error ? (
              <Error error={error} />
            ) : (
              <div className="flex-c-st gap-4 mb-4 md:mb-6 md:grid md:grid-cols-[auto_2fr_1fr_auto]">
                {/* Loading indicator if we're loading and there is no data */}
                {loading && !data && (
                  <Loading className="col-start-1 col-end-5" />
                )}

                {/* List of data */}
                {data?.length > 0 && (
                  <div className="col-start-1 col-end-5 overflow-hidden rounded-box border bg-base-100">
                    <table className="w-full text-left">
                      <thead className="bg-base-200 text-xs uppercase tracking-wide text-base-content/70">
                        <tr>
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Project Lead</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map(submission => {
                          const status = formatValue(
                            submission?.values?.['Project Status'],
                          );
                          const projectLead = formatValue(
                            submission?.values?.['Project Captain'],
                          );

                          return (
                            <tr
                              key={submission.id}
                              className="cursor-pointer border-t border-base-200 hover:bg-base-200/60"
                              onClick={() => navigate(submission.id)}
                              onKeyDown={event =>
                                handleRowKeyDown(event, submission.id)
                              }
                              tabIndex={0}
                              role="button"
                            >
                              <td className="px-4 py-3 font-semibold text-primary">
                                <Link
                                  to={`${submission.id}`}
                                  className="focus:outline-none focus-visible:underline"
                                >
                                  {formatValue(submission?.label)}
                                </Link>
                              </td>
                              <td className="px-4 py-3">
                                {formatValue(status)}
                              </td>
                              <td className="px-4 py-3">{projectLead}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty message if we're not loading and there is no data*/}
                {data?.length === 0 && (
                  <div className="col-start-1 col-end-5 rounded-box border bg-base-100 p-6 text-center text-base-content/70">
                    There are no projects to show
                    {previousPage ? ' on this page' : ''}.
                  </div>
                )}

                {(data?.length > 0 || previousPage) && (
                  <div
                    className={clsx(
                      'col-start-1 col-end-5 py-0.25 md:py-1.75 px-6 flex-cc gap-6',
                      'bg-base-100 border rounded-box md:min-h-16',
                      'max-md:sticky max-md:bottom-4 max-md:outline-2 max-md:outline-base-100',
                    )}
                  >
                    <button
                      type="button"
                      className="kbtn kbtn-ghost kbtn-lg kbtn-circle"
                      onClick={previousPage}
                      disabled={!previousPage || loading}
                      aria-label="Previous Page"
                    >
                      <Icon name="chevrons-left" />
                    </button>
                    {loading ? (
                      <Loading xsmall size={36} />
                    ) : (
                      <div className="font-semibold">Page {pageNumber}</div>
                    )}
                    <button
                      type="button"
                      className="kbtn kbtn-ghost kbtn-lg kbtn-circle"
                      onClick={nextPage}
                      disabled={!nextPage || loading}
                      aria-label="Next Page"
                    >
                      <Icon name="chevrons-right" />
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
