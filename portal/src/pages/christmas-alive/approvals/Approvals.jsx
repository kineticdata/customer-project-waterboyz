import { useMemo, useState } from 'react';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { useChristmasAlive } from '../hooks/useChristmasAlive.js';
import { useApprovals, findDuplicates } from '../hooks/useApprovals.js';
import { CA_STATUS, statusBadgeClass, familyLabel, describeHousehold } from '../../../helpers/christmasAlive.js';
import { ExportButton } from './ExportButton.jsx';
import { ReviewPanel } from './ReviewPanel.jsx';

const TABS = [
  { key: CA_STATUS.PENDING, label: 'Pending' },
  { key: CA_STATUS.APPROVED, label: 'Approved' },
  { key: CA_STATUS.ADOPTED, label: 'Sponsored' },
  { key: CA_STATUS.REJECTED, label: 'Rejected' },
];

const EMPTY_COPY = {
  [CA_STATUS.PENDING]: 'No nominations are waiting. New ones appear here as soon as they are submitted.',
  [CA_STATUS.APPROVED]: 'No families are waiting for a sponsor right now.',
  [CA_STATUS.ADOPTED]: 'No families have been sponsored yet this season.',
  [CA_STATUS.REJECTED]: 'Nothing has been rejected this season.',
};

export const Approvals = () => {
  const { season, loading: seasonLoading } = useChristmasAlive();
  const { rows, loading, approve, reject, release, reassign } = useApprovals(season);
  const [tab, setTab] = useState(CA_STATUS.PENDING);
  const [openRow, setOpenRow] = useState(null);

  const counts = useMemo(
    () =>
      TABS.reduce(
        (acc, { key }) => ({ ...acc, [key]: rows.filter(r => r.status === key).length }),
        {},
      ),
    [rows],
  );

  const visible = useMemo(
    () =>
      rows
        .filter(r => r.status === tab)
        .sort((a, b) => Number(a.familyNumber || 0) - Number(b.familyNumber || 0)),
    [rows, tab],
  );

  if (seasonLoading || loading) return <Loading />;

  return (
    <div className="flex-c-st gap-5">
      <div className="flex-c-st gap-2 max-w-prose">
        <h1 className="text-h1 font-bold m-0">Review nominations</h1>
        <p className="text-base-content/80 m-0">
          Approve families for sponsorship and reject duplicates. Approving
          assigns the family number that the sponsor uses at pickup.
        </p>
      </div>

      <div className="flex-bc gap-3 flex-wrap">
        <div role="tablist" className="ktabs ktabs-box">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              className={`ktab ${tab === key ? 'ktab-active' : ''}`}
              onClick={() => { setTab(key); setOpenRow(null); }}
            >
              {label}
              <span className="ml-2 text-xs opacity-70">{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
        <ExportButton rows={visible} season={season} label={tab.toLowerCase()} />
      </div>

      {visible.length === 0 ? (
        <p className="text-base-content/70 p-6 rounded-lg border border-dashed border-base-300 max-w-prose m-0">
          {EMPTY_COPY[tab]}
        </p>
      ) : (
        <ul className="flex-c-st gap-2 list-none p-0 m-0">
          {visible.map(row => {
            const name = [row.firstName, row.lastName].filter(Boolean).join(' ');
            const isOpen = openRow === row.id;
            return (
              <li
                key={row.id}
                className="rounded-lg border border-base-300 bg-base-100 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex-bc gap-3 p-3 text-left"
                  onClick={() => setOpenRow(isOpen ? null : row.id)}
                  aria-expanded={isOpen}
                >
                  <span className="flex-c-st">
                    <span className="font-semibold">
                      {name || 'Name not yet recorded'}
                    </span>
                    <span className="text-sm text-base-content/70">
                      {row.familyNumber ? `${familyLabel(row.familyNumber)} · ` : ''}
                      {describeHousehold(row)}
                      {row.city ? ` · ${row.city}` : ''}
                    </span>
                  </span>
                  <span className="flex-ec gap-2 flex-none">
                    <span className={`kbadge ${statusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} />
                  </span>
                </button>

                {isOpen && (
                  <ReviewPanel
                    row={row}
                    duplicates={findDuplicates(row, rows)}
                    onApprove={approve}
                    onReject={reject}
                    onRelease={release}
                    onReassign={reassign}
                    onDone={() => setOpenRow(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
