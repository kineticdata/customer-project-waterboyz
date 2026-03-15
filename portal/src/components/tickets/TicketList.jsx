import clsx from 'clsx';
import { EmptyCard, TicketCard } from './TicketCard.jsx';
import { Error } from '../states/Error.jsx';
import { Loading } from '../states/Loading.jsx';
import { TicketFilters } from './TicketFilters.jsx';
import { PageHeading } from '../PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';

/**
 * Shared paginated list layout used by both the Nominations (requests) and
 * Tasks (actions) pages. Consumers provide the title, filter type, and whether
 * to reload on card-level actions.
 */
export const TicketList = ({
  title,
  backTo = '/',
  emptyMessage,
  type,
  listData,
  listActions,
  filters,
  setFilters,
}) => {
  const { initialized, error, loading, data, pageNumber } = listData;
  const { nextPage, previousPage, reloadPage } = listActions;

  const resolvedEmptyMessage =
    typeof emptyMessage === 'function'
      ? emptyMessage({ previousPage })
      : emptyMessage;

  return (
    <div className="gutter">
      <div className="max-w-screen-lg pt-1 pb-6">
        <PageHeading title={title} backTo={backTo} className="flex-wrap">
          <TicketFilters type={type} filters={filters} setFilters={setFilters} />
        </PageHeading>

        {initialized && (
          <>
            {error ? (
              <Error error={error} />
            ) : (
              <div className="flex-c-st gap-4 md:grid md:grid-cols-[auto_2fr_1fr_auto]">
                {loading && !data && (
                  <Loading className="col-start-1 col-end-5" />
                )}

                {data?.length > 0 &&
                  data.map(submission => (
                    <TicketCard
                      key={submission.id}
                      submission={submission}
                      reload={reloadPage}
                    />
                  ))}

                {data?.length === 0 && (
                  <EmptyCard>{resolvedEmptyMessage}</EmptyCard>
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
