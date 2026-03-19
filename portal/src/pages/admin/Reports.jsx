import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { searchSubmissions, updateSubmission } from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import { toArray } from '../../helpers/format.js';
import { toastError, toastSuccess } from '../../helpers/toasts.js';
import clsx from 'clsx';

const FAMILY_TYPES = [
  'Foster Family',
  'Special Needs Family',
  'Single Parent Family',
  'Other',
];

const STATUS_OPTIONS = [
  'Planning',
  'Ready to Work',
  'Active',
  'Ongoing',
  'Completed',
  'Canceled',
];

/** Parse Family Type JSON string → array */
const parseFamilyType = raw => toArray(raw);

/** Aggregate projects into summary stats */
const computeStats = projects => {
  let totalHours = 0;
  const byCounty = {};
  const byFamilyType = {};
  const byStatus = {};
  let completedCount = 0;

  for (const p of projects) {
    const v = p.values;
    const hours = parseFloat(v['Total Project Man Hours']) || 0;
    totalHours += hours;

    const county = v['County'] || 'Unknown';
    byCounty[county] = (byCounty[county] || 0) + 1;

    const status = v['Project Status'] || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status === 'Completed') completedCount++;

    const types = parseFamilyType(v['Family Type']);
    for (const t of types) {
      byFamilyType[t] = (byFamilyType[t] || 0) + 1;
    }
    if (types.length === 0) {
      byFamilyType['Not Set'] = (byFamilyType['Not Set'] || 0) + 1;
    }
  }

  return { totalHours, byCounty, byFamilyType, byStatus, completedCount };
};

const StatCard = ({ icon, label, value, sublabel }) => (
  <div className="rounded-box border bg-base-100 p-4 flex-sc gap-3">
    <div className="icon-box flex-none bg-primary/10 text-primary">
      <Icon name={icon} size={20} />
    </div>
    <div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs ktext-base-content/60">{label}</div>
      {sublabel && (
        <div className="text-xs ktext-base-content/40 mt-0.5">{sublabel}</div>
      )}
    </div>
  </div>
);

const BreakdownTable = ({ title, icon, data, sortByValue = true }) => {
  const entries = Object.entries(data);
  if (sortByValue) entries.sort((a, b) => b[1] - a[1]);
  else entries.sort((a, b) => a[0].localeCompare(b[0]));
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="rounded-box border bg-base-100 p-4">
      <div className="flex-sc gap-2 mb-3">
        <Icon name={icon} size={18} className="ktext-base-content/60" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map(([key, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{key}</span>
              <span className="font-mono text-xs ktext-base-content/60 w-8 text-right">
                {count}
              </span>
              <div className="w-24 h-2 bg-base-200 rounded-full overflow-hidden flex-none">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Inline-editable Family Type cell ───────────────────────────────── */

const InlineFamilyType = ({ projectId, currentTypes, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentTypes);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  const toggle = type =>
    setSelected(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );

  const save = useCallback(async () => {
    setSaving(true);
    const result = await updateSubmission({
      id: projectId,
      values: { 'Family Type': JSON.stringify(selected) },
    });
    setSaving(false);
    if (result?.error) {
      toastError({ title: 'Save failed', description: result.error.message });
    } else {
      toastSuccess({ title: 'Family type updated' });
      onSaved(projectId, 'Family Type', JSON.stringify(selected));
      setOpen(false);
    }
  }, [projectId, selected, onSaved]);

  const cancel = () => {
    setSelected(currentTypes);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="flex flex-wrap gap-1 items-center group cursor-pointer min-h-[28px] w-full text-left"
        onClick={() => setOpen(true)}
        title="Click to edit"
      >
        {currentTypes.length > 0 ? (
          currentTypes.map(t => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs"
            >
              {t}
            </span>
          ))
        ) : (
          <span className="ktext-base-content/40 text-xs">—</span>
        )}
        <Icon
          name="pencil"
          size={12}
          className="ml-1 opacity-0 group-hover:opacity-50 transition-opacity"
        />
      </button>
    );
  }

  return (
    <div ref={ref} className="flex flex-col gap-1.5 min-w-[180px]">
      {FAMILY_TYPES.map(type => (
        <label key={type} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            className="kcheckbox kcheckbox-primary kcheckbox-xs"
            checked={selected.includes(type)}
            onChange={() => toggle(type)}
            disabled={saving}
          />
          <span className="text-xs">{type}</span>
        </label>
      ))}
      <div className="flex gap-1 mt-1">
        <button
          type="button"
          className="kbtn kbtn-primary kbtn-xs"
          onClick={save}
          disabled={saving}
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          type="button"
          className="kbtn kbtn-ghost kbtn-xs"
          onClick={cancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

/* ─── Inline-editable Hours cell ─────────────────────────────────────── */

const InlineHours = ({ projectId, currentValue, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue || '');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    const result = await updateSubmission({
      id: projectId,
      values: { 'Total Project Man Hours': value || null },
    });
    setSaving(false);
    if (result?.error) {
      toastError({ title: 'Save failed', description: result.error.message });
    } else {
      toastSuccess({ title: 'Hours updated' });
      onSaved(projectId, 'Total Project Man Hours', value || null);
      setEditing(false);
    }
  }, [projectId, value, onSaved]);

  const cancel = () => {
    setValue(currentValue || '');
    setEditing(false);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="flex items-center gap-1 group cursor-pointer font-mono text-right w-full justify-end"
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        <span>{currentValue || '—'}</span>
        <Icon
          name="pencil"
          size={12}
          className="opacity-0 group-hover:opacity-50 transition-opacity"
        />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        className="kinput kinput-bordered kinput-xs w-20 text-right font-mono"
        value={value}
        min="0"
        step="0.5"
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        autoFocus
      />
      <button
        type="button"
        className="kbtn kbtn-primary kbtn-xs kbtn-circle"
        onClick={save}
        disabled={saving}
        title="Save"
      >
        <Icon name="check" size={12} />
      </button>
      <button
        type="button"
        className="kbtn kbtn-ghost kbtn-xs kbtn-circle"
        onClick={cancel}
        disabled={saving}
        title="Cancel"
      >
        <Icon name="x" size={12} />
      </button>
    </div>
  );
};

/* ─── Inline-editable Status cell ────────────────────────────────────── */

const InlineStatus = ({ projectId, currentValue, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(
    async e => {
      const newStatus = e.target.value;
      setSaving(true);
      const result = await updateSubmission({
        id: projectId,
        values: { 'Project Status': newStatus },
      });
      setSaving(false);
      if (result?.error) {
        toastError({ title: 'Save failed', description: result.error.message });
      } else {
        toastSuccess({ title: 'Status updated' });
        onSaved(projectId, 'Project Status', newStatus);
        setEditing(false);
      }
    },
    [projectId, onSaved],
  );

  if (!editing) {
    return (
      <button
        type="button"
        className="group cursor-pointer flex items-center gap-1"
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        <span
          className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            currentValue === 'Completed' && 'bg-success/15 text-success',
            currentValue === 'Active' && 'bg-info/15 text-info',
            currentValue === 'Canceled' && 'bg-error/15 text-error',
            !['Completed', 'Active', 'Canceled'].includes(currentValue) &&
              'bg-base-200 ktext-base-content/70',
          )}
        >
          {currentValue || '—'}
        </span>
        <Icon
          name="pencil"
          size={12}
          className="opacity-0 group-hover:opacity-50 transition-opacity"
        />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        className="kselect kselect-bordered kselect-xs"
        value={currentValue || ''}
        onChange={handleChange}
        disabled={saving}
        autoFocus
        onBlur={() => !saving && setEditing(false)}
      >
        <option value="">—</option>
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {saving && <span className="loading loading-spinner loading-xs" />}
    </div>
  );
};

/* ─── Main Reports component ─────────────────────────────────────────── */

export const Reports = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const { isLeadership } = useRoles();

  // Filters
  const [countyFilter, setCountyFilter] = useState('');
  const [familyTypeFilter, setFamilyTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Local overrides for optimistic updates after inline edits
  const [overrides, setOverrides] = useState({});

  // Fetch all projects in a single call
  const params = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'swat-projects',
      search: { include: ['details', 'values'], limit: 1000 },
    }),
    [kappSlug],
  );
  const { loading, response } = useData(searchSubmissions, params);
  const rawProjects = response?.submissions ?? [];

  // Merge optimistic overrides into project data
  const allProjects = useMemo(
    () =>
      rawProjects.map(p => {
        const o = overrides[p.id];
        if (!o) return p;
        return { ...p, values: { ...p.values, ...o } };
      }),
    [rawProjects, overrides],
  );

  // Callback for inline edit saves — applies optimistic update
  const handleFieldSaved = useCallback((id, field, value) => {
    setOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }, []);

  // Extract unique counties for the filter dropdown
  const counties = useMemo(() => {
    const set = new Set();
    for (const p of allProjects) {
      const c = p.values?.['County'];
      if (c) set.add(c);
    }
    return [...set].sort();
  }, [allProjects]);

  // Apply filters
  const filteredProjects = useMemo(() => {
    return allProjects.filter(p => {
      const v = p.values;

      if (countyFilter && v['County'] !== countyFilter) return false;

      if (familyTypeFilter) {
        const types = parseFamilyType(v['Family Type']);
        if (familyTypeFilter === 'Not Set') {
          if (types.length > 0) return false;
        } else if (!types.includes(familyTypeFilter)) return false;
      }

      if (statusFilter && v['Project Status'] !== statusFilter) return false;

      if (dateFrom || dateTo) {
        const scheduled = v['Scheduled Date']?.slice(0, 10);
        const completion = v['Completion Date']?.slice(0, 10);
        const date = completion || scheduled;
        if (!date) return false;
        if (dateFrom && date < dateFrom) return false;
        if (dateTo && date > dateTo) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const searchable = [
          v['Project Name'],
          v['County'],
          v['City'],
          v['Project Captain'],
          v['Project Status'],
          p.label,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [allProjects, countyFilter, familyTypeFilter, statusFilter, dateFrom, dateTo, search]);

  const stats = useMemo(() => computeStats(filteredProjects), [filteredProjects]);
  const hasFilters =
    countyFilter || familyTypeFilter || statusFilter || dateFrom || dateTo || search;

  const clearFilters = () => {
    setCountyFilter('');
    setFamilyTypeFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  if (loading && allProjects.length === 0) {
    return (
      <div className="max-w-screen-xl pt-6 pb-6">
        <PageHeading title="SWAT Reports" backTo="/admin" />
        <Loading />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl pt-6 pb-6">
      <PageHeading title="SWAT Reports" backTo="/admin" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon="hammer"
          label="Total Projects"
          value={filteredProjects.length}
          sublabel={hasFilters ? `of ${allProjects.length}` : undefined}
        />
        <StatCard
          icon="clock"
          label="Total Man Hours"
          value={stats.totalHours.toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })}
        />
        <StatCard
          icon="circle-check"
          label="Completed"
          value={stats.completedCount}
        />
        <StatCard
          icon="map-pin"
          label="Counties Served"
          value={
            Object.keys(stats.byCounty).filter(c => c !== 'Unknown').length
          }
        />
      </div>

      {/* Breakdown charts */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <BreakdownTable
          title="By County"
          icon="map-pin"
          data={stats.byCounty}
        />
        <BreakdownTable
          title="By Family Type"
          icon="heart-handshake"
          data={stats.byFamilyType}
        />
        <BreakdownTable
          title="By Status"
          icon="list-check"
          data={stats.byStatus}
          sortByValue={false}
        />
      </div>

      {/* Filters */}
      <div className="rounded-box border bg-base-100 p-4 mb-4">
        <div className="flex-sc gap-2 mb-3">
          <Icon name="filter" size={16} className="ktext-base-content/60" />
          <span className="text-sm font-semibold">Filter Projects</span>
          {hasFilters && (
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-xs ml-auto"
              onClick={clearFilters}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-base-content/40">Search</span>
            <input
              type="text"
              className="kinput kinput-bordered kinput-sm w-full"
              placeholder="Name, county, captain..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-base-content/40">County</span>
            <select
              className="kselect kselect-bordered kselect-sm w-full"
              value={countyFilter}
              onChange={e => setCountyFilter(e.target.value)}
            >
              <option value="">All Counties</option>
              {counties.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-base-content/40">Family Type</span>
            <select
              className="kselect kselect-bordered kselect-sm w-full"
              value={familyTypeFilter}
              onChange={e => setFamilyTypeFilter(e.target.value)}
            >
              <option value="">All Family Types</option>
              {FAMILY_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="Not Set">Not Set</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-base-content/40">Status</span>
            <select
              className="kselect kselect-bordered kselect-sm w-full"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-base-content/40">Completed / Scheduled After</span>
            <input
              type="date"
              className="kinput kinput-bordered kinput-sm w-full"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-base-content/40">Completed / Scheduled Before</span>
            <input
              type="date"
              className="kinput kinput-bordered kinput-sm w-full"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Projects table */}
      <div className="rounded-box border bg-base-100 overflow-x-auto">
        <table className="ktable ktable-zebra w-full text-sm">
          <thead>
            <tr>
              <th>Project</th>
              <th>County</th>
              <th>Status</th>
              <th className="text-right">Hours</th>
              <th>Family Type</th>
              <th>Date</th>
              <th>Captain</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 ktext-base-content/50"
                >
                  {hasFilters
                    ? 'No projects match the current filters.'
                    : 'No projects found.'}
                </td>
              </tr>
            ) : (
              filteredProjects.map(p => {
                const v = p.values;
                const types = parseFamilyType(v['Family Type']);
                const date =
                  v['Completion Date']?.slice(0, 10) ||
                  v['Scheduled Date']?.slice(0, 10);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link
                        to={`/project-captains/${p.id}/details`}
                        state={{ backPath: '/admin/reports' }}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {v['Project Name'] || p.label || p.id.slice(-6)}
                      </Link>
                    </td>
                    <td>{v['County'] || '—'}</td>
                    <td>
                      {isLeadership ? (
                        <InlineStatus
                          projectId={p.id}
                          currentValue={v['Project Status']}
                          onSaved={handleFieldSaved}
                        />
                      ) : (
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            v['Project Status'] === 'Completed' &&
                              'bg-success/15 text-success',
                            v['Project Status'] === 'Active' &&
                              'bg-info/15 text-info',
                            v['Project Status'] === 'Canceled' &&
                              'bg-error/15 text-error',
                            !['Completed', 'Active', 'Canceled'].includes(
                              v['Project Status'],
                            ) && 'bg-base-200 ktext-base-content/70',
                          )}
                        >
                          {v['Project Status'] || '—'}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {isLeadership ? (
                        <InlineHours
                          projectId={p.id}
                          currentValue={v['Total Project Man Hours']}
                          onSaved={handleFieldSaved}
                        />
                      ) : (
                        <span className="font-mono">
                          {v['Total Project Man Hours'] || '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      {isLeadership ? (
                        <InlineFamilyType
                          projectId={p.id}
                          currentTypes={types}
                          onSaved={handleFieldSaved}
                        />
                      ) : types.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {types.map(t => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="ktext-base-content/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{date || '—'}</td>
                    <td>{v['Project Captain'] || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Export hint */}
      {filteredProjects.length > 0 && (
        <div className="mt-3 text-xs ktext-base-content/50 flex-sc gap-1">
          <Icon name="info-circle" size={14} />
          Showing {filteredProjects.length} project
          {filteredProjects.length !== 1 ? 's' : ''}.
          {isLeadership && ' Click any editable field to update it inline.'}
          {' '}Use browser print (Ctrl+P) to export this report.
        </div>
      )}
    </div>
  );
};
