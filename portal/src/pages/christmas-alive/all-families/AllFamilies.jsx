import { useMemo, useState } from 'react';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { useChristmasAlive } from '../hooks/useChristmasAlive.js';
import { useAllFamilies } from '../hooks/useAllFamilies.js';
import { FamilyDetailPanel } from './FamilyDetailPanel.jsx';
import { ExportButton } from '../approvals/ExportButton.jsx';
import { PickupReminderButton } from './PickupReminderButton.jsx';
import {
  CA_STATUS,
  statusBadgeClass,
  familyLabel,
  describeHousehold,
} from '../../../helpers/christmasAlive.js';

const ALL = 'all';

/**
 * Every Christmas Alive family, across every season — the leadership view.
 *
 * The Approvals page is a work queue: it answers "what needs a decision now".
 * This answers "show me everything and let me fix it", which is a different
 * job, so it is a separate page rather than another tab.
 */
export const AllFamilies = () => {
  const { season: currentSeason, loading: seasonLoading } = useChristmasAlive();
  const { rows, seasons, loading, saving, saveFamily, saveSponsorship } =
    useAllFamilies();

  const [season, setSeason] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [search, setSearch] = useState('');
  const [openRow, setOpenRow] = useState(null);

  // Default to the current season once it is known, but let the user widen it.
  const effectiveSeason =
    season === ALL && currentSeason && seasons.includes(currentSeason)
      ? currentSeason
      : season;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => effectiveSeason === ALL || r.season === effectiveSeason)
      .filter(r => status === ALL || r.status === status)
      .filter(r => {
        if (!q) return true;
        return [
          r.firstName,
          r.lastName,
          r.city,
          r.county,
          r.familyNumber,
          r.sponsorUsername,
          r.email,
          r.phone,
        ]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (a.season !== b.season) return b.season.localeCompare(a.season);
        return (Number(a.familyNumber) || 9999) - (Number(b.familyNumber) || 9999);
      });
  }, [rows, effectiveSeason, status, search]);

  if (seasonLoading || loading) return <Loading />;

  return (
    <div className="flex-c-st gap-5">
      <div className="flex-c-st gap-2 max-w-prose">
        <h1 className="text-h1 font-bold m-0">All families</h1>
        <p className="text-base-content/80 m-0">
          Every family Christmas Alive has taken on, in any season and at any
          stage. Open one to correct their details or change where they are in
          the process.
        </p>
      </div>

      <div className="flex-bc gap-3 flex-wrap">
        <div className="flex-ss gap-3 flex-wrap items-end">
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">Search</span>
            <input
              className="kinput kinput-bordered kinput-sm w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, city, family number, sponsor"
            />
          </label>
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">Season</span>
            <select
              className="kselect kselect-bordered kselect-sm"
              value={effectiveSeason}
              onChange={e => setSeason(e.target.value)}
            >
              <option value={ALL}>All seasons</option>
              {seasons.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">Status</span>
            <select
              className="kselect kselect-bordered kselect-sm"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value={ALL}>Any status</option>
              {Object.values(CA_STATUS).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex-ss gap-2 flex-wrap items-start">
          {/* Deliberately driven off `rows`, not `visible`: a filter is a
              view, and a reminder that silently skipped the sponsors you
              happened to have filtered out would be a very quiet failure. */}
          <PickupReminderButton
            rows={rows}
            season={currentSeason}
            onSend={saveSponsorship}
            disabled={saving}
          />
          <ExportButton rows={visible} season={effectiveSeason} label="all-families" />
        </div>
      </div>

      <p className="text-sm text-base-content/70 m-0">
        {visible.length} of {rows.length}{' '}
        {rows.length === 1 ? 'family' : 'families'}
      </p>

      {visible.length === 0 ? (
        <p className="text-base-content/70 p-6 rounded-lg border border-dashed border-base-300 max-w-prose m-0">
          {rows.length === 0
            ? 'No families yet. They appear here as soon as a nomination is submitted.'
            : 'No families match these filters.'}
        </p>
      ) : (
        <ul className="flex-c-st gap-2 list-none p-0 m-0">
          {visible.map(row => {
            const isOpen = openRow === row.id;
            const name =
              [row.firstName, row.lastName].filter(Boolean).join(' ') ||
              'Name not recorded yet';
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
                  <span className="flex-c-st min-w-0">
                    <span className="font-semibold truncate">
                      {name}
                      {row.isTestFixture && (
                        <span className="kbadge kbadge-warning kbadge-xs ml-2">
                          test fixture
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-base-content/70 truncate">
                      {row.season} ·{' '}
                      {row.familyNumber
                        ? familyLabel(row.familyNumber)
                        : 'no number yet'}{' '}
                      · {describeHousehold(row)}
                      {row.city ? ` · ${row.city}` : ''}
                    </span>
                  </span>
                  <span className="flex-ec gap-2 flex-none">
                    <span className={`kbadge ${statusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                    <Icon
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                    />
                  </span>
                </button>

                {isOpen && (
                  <FamilyDetailPanel
                    row={row}
                    onSaveFamily={saveFamily}
                    onSaveSponsorship={saveSponsorship}
                    saving={saving}
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
