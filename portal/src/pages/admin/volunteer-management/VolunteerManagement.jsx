import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { Icon } from '../../../atoms/Icon.jsx';
import { PageHeading } from '../../../components/PageHeading.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { toArray, formatPhone } from '../../../helpers/format.js';
import { useVolunteerManagementData } from './useVolunteerManagementData.js';
import { VolunteerDetailDrawer } from './VolunteerDetailDrawer.jsx';
import { CreateVolunteerModal } from './CreateVolunteerModal.jsx';

// ---------------------------------------------------------------------------
// Filter components
// ---------------------------------------------------------------------------

const TextFilter = ({ column }) => {
  const value = column.getFilterValue() ?? '';
  return (
    <div className="relative group">
      <Icon
        name="search"
        size={13}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-base-content/25 group-focus-within:text-primary transition-colors"
      />
      <input
        type="text"
        value={value}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
        placeholder="Filter..."
        className={clsx(
          'w-full h-7 pl-7 pr-2 text-xs rounded-md bg-base-100 border outline-none transition-all',
          value
            ? 'border-primary/40 ring-1 ring-primary/10'
            : 'border-base-300/60 focus:border-primary/40 focus:ring-1 focus:ring-primary/10',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => column.setFilterValue(undefined)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60"
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
};

const MultiSelectFilter = ({ column, options }) => {
  const selected = column.getFilterValue() ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = val => {
    const next = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val];
    column.setFilterValue(next.length ? next : undefined);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          'w-full h-7 px-2 text-xs rounded-md bg-base-100 border outline-none flex-sc gap-1 transition-all text-left',
          selected.length > 0
            ? 'border-primary/40 ring-1 ring-primary/10'
            : 'border-base-300/60 hover:border-base-300',
        )}
      >
        {selected.length > 0 ? (
          <span className="flex-sc gap-1 truncate">
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-content text-[10px] font-bold leading-none">
              {selected.length}
            </span>
            <span className="text-base-content/60 truncate">selected</span>
          </span>
        ) : (
          <span className="text-base-content/30">All</span>
        )}
        <Icon
          name="chevron-down"
          size={12}
          className={clsx(
            'ml-auto flex-none transition-transform text-base-content/30',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-40 bg-base-100 border border-base-300 rounded-xl shadow-xl min-w-[220px] overflow-hidden">
            {/* Search within options */}
            <div className="p-2 border-b border-base-200">
              <div className="relative">
                <Icon
                  name="search"
                  size={13}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-base-content/30"
                />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-7 pl-7 pr-2 text-xs rounded-md bg-base-200/50 border-none outline-none"
                  autoFocus
                />
              </div>
            </div>
            {/* Options list */}
            <div className="max-h-52 overflow-auto p-1">
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    column.setFilterValue(undefined);
                    setOpen(false);
                  }}
                  className="w-full flex-sc gap-2 px-2.5 py-1.5 text-xs text-error/80 hover:bg-error/5 rounded-lg transition-colors"
                >
                  <Icon name="x" size={12} />
                  Clear selection
                </button>
              )}
              {filtered.map(opt => (
                <label
                  key={opt}
                  className="flex-sc gap-2 px-2.5 py-1.5 hover:bg-base-200/60 rounded-lg cursor-pointer transition-colors"
                >
                  <div
                    className={clsx(
                      'w-3.5 h-3.5 rounded border flex-cc flex-none transition-all',
                      selected.includes(opt)
                        ? 'bg-primary border-primary'
                        : 'border-base-300',
                    )}
                  >
                    {selected.includes(opt) && (
                      <Icon name="check" size={10} className="text-primary-content" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="sr-only"
                  />
                  <span className="text-xs truncate">{opt}</span>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-xs text-base-content/30 text-center">
                  No matches
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Filter functions
// ---------------------------------------------------------------------------

const arrayContainsFilter = (row, columnId, filterValue) => {
  if (!filterValue?.length) return true;
  const arr = row.getValue(columnId);
  return Array.isArray(arr) && filterValue.some(v => arr.includes(v));
};

const textFilter = (row, columnId, filterValue) => {
  if (!filterValue) return true;
  return String(row.getValue(columnId) ?? '')
    .toLowerCase()
    .includes(filterValue.toLowerCase());
};

const scalarContainsFilter = (row, columnId, filterValue) => {
  if (!filterValue?.length) return true;
  return filterValue.includes(row.getValue(columnId));
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const collectUniqueArrayValues = (volunteers, field) => {
  const set = new Set();
  for (const v of volunteers)
    for (const item of toArray(v.values?.[field])) set.add(item);
  return [...set].sort();
};

const collectUniqueValues = (volunteers, field) => {
  const set = new Set();
  for (const v of volunteers) {
    const val = v.values?.[field];
    if (val) set.add(val);
  }
  return [...set].sort();
};

// Cell renderers
const PillCell = ({ items, max = 2, color = 'primary' }) => {
  if (!items.length)
    return <span className="text-base-content/20">--</span>;
  const colors = {
    primary: 'bg-primary/8 text-primary/80',
    secondary: 'bg-secondary/8 text-secondary/80',
    accent: 'bg-accent/8 text-accent/80',
  };
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, max).map(s => (
        <span
          key={s}
          className={clsx(
            'inline-block px-1.5 py-0.5 rounded-md text-[11px] font-medium leading-tight whitespace-nowrap',
            colors[color],
          )}
        >
          {s}
        </span>
      ))}
      {items.length > max && (
        <span className="inline-block px-1.5 py-0.5 rounded-md text-[11px] font-medium leading-tight text-base-content/40 bg-base-200/60">
          +{items.length - max}
        </span>
      )}
    </div>
  );
};

const EmptyCell = () => <span className="text-base-content/20">--</span>;

const CountBadge = ({ count, color = 'primary' }) => {
  if (!count) return <span className="text-base-content/20">0</span>;
  const colors = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold',
        colors[color],
      )}
    >
      {count}
    </span>
  );
};

const EmptyResults = ({ activeFilterCount, onClear }) => (
  <div className="flex-c-cc gap-3 py-8">
    <div className="w-12 h-12 rounded-full bg-base-200/60 flex-cc">
      <Icon name="users" size={24} className="text-base-content/20" />
    </div>
    <p className="text-sm font-medium text-base-content/50">
      No volunteers match your filters
    </p>
    {activeFilterCount > 0 && (
      <button type="button" onClick={onClear} className="text-sm text-primary hover:underline">
        Clear all filters
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const VolunteerManagement = () => {
  const {
    initialized,
    loading,
    volunteers,
    affiliates,
    allProjects,
    allEvents,
    allAssignments,
    allSignups,
    eventsById,
    reload,
  } = useVolunteerManagementData();

  const mobile = useSelector(state => state.view.mobile);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState({
    'Address Line 1': false,
    Zip: false,
    'Other Skills': false,
    Bio: false,
    'Other Availability': false,
    'Dietary Restrictions': false,
    'Photo Consent': false,
    Username: false,
    'How often can you volunteer': false,
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Collect filter options
  const skillOptions = useMemo(() => collectUniqueArrayValues(volunteers, 'Skill Areas'), [volunteers]);
  const toolOptions = useMemo(() => collectUniqueArrayValues(volunteers, 'Tools'), [volunteers]);
  const serviceAreaOptions = useMemo(() => collectUniqueArrayValues(volunteers, 'Preferred Service Area'), [volunteers]);
  const availabilityOptions = useMemo(() => collectUniqueValues(volunteers, 'How often can you volunteer'), [volunteers]);
  const orgOptions = useMemo(() => collectUniqueValues(volunteers, 'Affiliated Organization'), [volunteers]);
  const stateOptions = useMemo(() => collectUniqueValues(volunteers, 'State'), [volunteers]);
  const cityOptions = useMemo(() => collectUniqueValues(volunteers, 'City'), [volunteers]);
  const languageOptions = useMemo(() => collectUniqueArrayValues(volunteers, 'Languages You Know'), [volunteers]);

  const columns = useMemo(
    () => [
      {
        id: 'First Name',
        header: 'First Name',
        accessorFn: r => r.values?.['First Name'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) => {
          const name = getValue();
          return name ? (
            <span className="font-medium text-base-content">{name}</span>
          ) : (
            <EmptyCell />
          );
        },
        size: 110,
      },
      {
        id: 'Last Name',
        header: 'Last Name',
        accessorFn: r => {
          const v = r.values?.['Last Name'];
          return v && v !== 'undefined' ? v : '';
        },
        filterFn: textFilter,
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="font-medium text-base-content">{getValue()}</span>
          ) : (
            <EmptyCell />
          ),
        size: 110,
      },
      {
        id: 'Email Address',
        header: 'Email',
        accessorFn: r => r.values?.['Email Address'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) => {
          const email = getValue();
          return email ? (
            <a
              href={`mailto:${email}`}
              onClick={e => e.stopPropagation()}
              className="text-primary/70 hover:text-primary hover:underline underline-offset-2 transition-colors truncate block max-w-[200px]"
            >
              {email}
            </a>
          ) : (
            <EmptyCell />
          );
        },
        size: 180,
      },
      {
        id: 'Phone Number',
        header: 'Phone',
        accessorFn: r => r.values?.['Phone Number'] ?? '',
        cell: ({ getValue }) => {
          const phone = getValue();
          return phone ? (
            <span className="tabular-nums text-base-content/70">
              {formatPhone(phone)}
            </span>
          ) : (
            <EmptyCell />
          );
        },
        filterFn: textFilter,
        size: 130,
      },
      {
        id: 'Affiliated Organization',
        header: 'Org',
        accessorFn: r => r.values?.['Affiliated Organization'] ?? '',
        filterFn: scalarContainsFilter,
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="truncate block max-w-[140px]">{getValue()}</span>
          ) : (
            <EmptyCell />
          ),
        size: 140,
        meta: { filterType: 'multiselect', filterOptions: orgOptions },
      },
      {
        id: 'Languages You Know',
        header: 'Languages',
        accessorFn: r => toArray(r.values?.['Languages You Know']),
        cell: ({ getValue }) => <PillCell items={getValue()} max={2} color="accent" />,
        filterFn: arrayContainsFilter,
        meta: { filterType: 'multiselect', filterOptions: languageOptions },
        size: 130,
      },
      {
        id: 'Skill Areas',
        header: 'Skills',
        accessorFn: r => toArray(r.values?.['Skill Areas']),
        cell: ({ getValue }) => <PillCell items={getValue()} max={2} color="primary" />,
        filterFn: arrayContainsFilter,
        meta: { filterType: 'multiselect', filterOptions: skillOptions },
        size: 180,
      },
      {
        id: 'Other Skills',
        header: 'Other Skills',
        accessorFn: r => r.values?.['Other Skills'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="text-base-content/60 truncate block max-w-[140px]">{getValue()}</span>
          ) : (
            <EmptyCell />
          ),
        size: 140,
      },
      {
        id: 'Tools',
        header: 'Tools',
        accessorFn: r => toArray(r.values?.['Tools']),
        cell: ({ getValue }) => <PillCell items={getValue()} max={2} color="secondary" />,
        filterFn: arrayContainsFilter,
        meta: { filterType: 'multiselect', filterOptions: toolOptions },
        size: 160,
      },
      {
        id: 'Preferred Service Area',
        header: 'Service Area',
        accessorFn: r => toArray(r.values?.['Preferred Service Area']),
        cell: ({ getValue }) => {
          const areas = getValue();
          return areas.length ? (
            <span className="text-base-content/70 truncate block max-w-[160px]">{areas.join(', ')}</span>
          ) : (
            <EmptyCell />
          );
        },
        filterFn: arrayContainsFilter,
        meta: { filterType: 'multiselect', filterOptions: serviceAreaOptions },
        size: 140,
      },
      {
        id: 'How often can you volunteer',
        header: 'Availability',
        accessorFn: r => r.values?.['How often can you volunteer'] ?? '',
        filterFn: scalarContainsFilter,
        cell: ({ getValue }) =>
          getValue() || <EmptyCell />,
        meta: { filterType: 'multiselect', filterOptions: availabilityOptions },
        size: 140,
      },
      {
        id: 'Other Availability',
        header: 'Other Avail.',
        accessorFn: r => r.values?.['Other Availability'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) =>
          getValue()?.trim() ? (
            <span className="text-base-content/60 line-clamp-1">{getValue()}</span>
          ) : (
            <EmptyCell />
          ),
        size: 140,
      },
      {
        id: 'City',
        header: 'City',
        accessorFn: r => r.values?.['City'] ?? '',
        filterFn: scalarContainsFilter,
        cell: ({ getValue }) => getValue() || <EmptyCell />,
        meta: { filterType: 'multiselect', filterOptions: cityOptions },
        size: 100,
      },
      {
        id: 'State',
        header: 'St',
        accessorFn: r => r.values?.['State'] ?? '',
        filterFn: scalarContainsFilter,
        cell: ({ getValue }) => getValue() || <EmptyCell />,
        meta: { filterType: 'multiselect', filterOptions: stateOptions },
        size: 60,
      },
      {
        id: 'Address Line 1',
        header: 'Address',
        accessorFn: r => r.values?.['Address Line 1'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) =>
          getValue() || <EmptyCell />,
        size: 180,
      },
      {
        id: 'Zip',
        header: 'Zip',
        accessorFn: r => r.values?.['Zip'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) => getValue() || <EmptyCell />,
        size: 80,
      },
      {
        id: 'Dietary Restrictions',
        header: 'Dietary',
        accessorFn: r => toArray(r.values?.['Dietary Restrictions']),
        cell: ({ getValue }) => {
          const items = getValue();
          return items.length ? items.join(', ') : <EmptyCell />;
        },
        filterFn: arrayContainsFilter,
        size: 140,
      },
      {
        id: 'Photo Consent',
        header: 'Photos OK',
        accessorFn: r => r.values?.['Photo Consent'] ?? '',
        cell: ({ getValue }) => {
          const val = getValue();
          if (val === 'No')
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-warning/20 text-warning-content">
                <Icon name="camera-off" size={11} /> No
              </span>
            );
          if (val === 'Yes')
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-success/20 text-success-content">
                <Icon name="check" size={11} /> Yes
              </span>
            );
          return <EmptyCell />;
        },
        filterFn: textFilter,
        size: 90,
      },
      {
        id: 'Bio',
        header: 'Bio',
        accessorFn: r => r.values?.['Bio'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="text-base-content/60 line-clamp-1">{getValue()}</span>
          ) : (
            <EmptyCell />
          ),
        size: 200,
      },
      {
        id: 'Username',
        header: 'Username',
        accessorFn: r => r.values?.['Username'] ?? '',
        filterFn: textFilter,
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="font-mono text-xs text-base-content/50">{getValue()}</span>
          ) : (
            <EmptyCell />
          ),
        size: 160,
      },
      {
        id: 'projectCount',
        header: 'Proj',
        accessorFn: r => r.projectCount,
        cell: ({ getValue }) => <CountBadge count={getValue()} color="primary" />,
        enableColumnFilter: false,
        size: 55,
      },
      {
        id: 'eventCount',
        header: 'Evts',
        accessorFn: r => r.eventCount,
        cell: ({ getValue }) => <CountBadge count={getValue()} color="secondary" />,
        enableColumnFilter: false,
        size: 55,
      },
    ],
    [skillOptions, toolOptions, serviceAreaOptions, availabilityOptions, orgOptions, stateOptions, cityOptions, languageOptions],
  );

  const table = useReactTable({
    data: volunteers,
    columns,
    state: { globalFilter, columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const search = filterValue.toLowerCase();
      const v = row.original.values ?? {};
      return [
        v['First Name'], v['Last Name'], v['Email Address'], v['Phone Number'],
        v['Affiliated Organization'], v['City'], v['State'],
        ...toArray(v['Skill Areas']), ...toArray(v['Tools']),
        ...toArray(v['Languages You Know']),
      ]
        .filter(Boolean)
        .some(val => val.toLowerCase().includes(search));
    },
  });

  const activeFilterCount =
    table.getAllColumns().filter(c => c.getIsFiltered()).length +
    (globalFilter ? 1 : 0);

  const clearAllFilters = useCallback(() => {
    setGlobalFilter('');
    table.getAllColumns().forEach(col => col.setFilterValue(undefined));
  }, [table]);

  const filteredCount = table.getFilteredRowModel().rows.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!initialized || loading) {
    return (
      <div className="pt-6 pb-6">
        <PageHeading title="Volunteer Management" backTo="/admin" />
        <Loading />
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className="gutter pb-6">
      {/* ── Toolbar ── */}
      <div className="pt-5 pb-3">
        <PageHeading title="Volunteer Management" backTo="/admin">
          <div className="ml-auto">
            <button
              type="button"
              className="kbtn kbtn-primary kbtn-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Icon name="plus" size={16} />
              Add Volunteer
            </button>
          </div>
        </PageHeading>

        <div className="flex-sc gap-2 text-xs text-base-content/50 mb-3">
          <span>
            <span className="font-semibold text-base-content/70">{filteredCount}</span>
            {filteredCount !== volunteers.length && <> of {volunteers.length}</>}
            {' '}volunteers
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex-sc gap-1 text-xs text-primary hover:text-primary/80 font-medium"
            >
              <Icon name="x" size={12} />
              Clear
            </button>
          )}
        </div>

        <div className="flex-sc flex-wrap gap-2">
          {/* Global search */}
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Icon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30"
            />
            <input
              type="text"
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search name, email, skills..."
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-base-200/40 border border-base-300/60 outline-none transition-all focus:bg-base-100 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>

          {/* Toggle filters (desktop only — table filters) */}
          {!mobile && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'kbtn kbtn-sm kbtn-ghost gap-1.5 text-xs font-medium',
                showFilters && 'bg-primary/8 text-primary',
              )}
            >
              <Icon name="filter" size={15} />
              Filters
            </button>
          )}

          {/* Column picker (desktop only) */}
          {!mobile && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="kbtn kbtn-sm kbtn-ghost gap-1.5 text-xs font-medium"
              >
                <Icon name="columns-3" size={15} />
                Columns
              </button>
              {showColumnPicker && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowColumnPicker(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-40 bg-base-100 border border-base-300 rounded-xl shadow-xl min-w-[220px] overflow-hidden">
                    <div className="p-1.5 max-h-72 overflow-auto">
                      {table.getAllLeafColumns().map(column => (
                        <label
                          key={column.id}
                          className="flex-sc gap-2.5 px-2.5 py-1.5 hover:bg-base-200/60 rounded-lg cursor-pointer transition-colors"
                        >
                          <div
                            className={clsx(
                              'w-3.5 h-3.5 rounded border flex-cc flex-none transition-all',
                              column.getIsVisible()
                                ? 'bg-primary border-primary'
                                : 'border-base-300',
                            )}
                          >
                            {column.getIsVisible() && (
                              <Icon name="check" size={10} className="text-primary-content" />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                            className="sr-only"
                          />
                          <span className="text-xs">{column.columnDef.header}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={reload}
            className="kbtn kbtn-sm kbtn-ghost"
            title="Refresh data"
          >
            <Icon name="refresh" size={15} />
          </button>
        </div>
      </div>

      {/* ── Mobile: Card list ── */}
      {mobile ? (
        <div className="flex-c-st gap-2">
          {rows.length === 0 ? (
            <EmptyResults activeFilterCount={activeFilterCount} onClear={clearAllFilters} />
          ) : (
            rows.map(row => {
              const v = row.original.values ?? {};
              const name = [v['First Name'], v['Last Name']].filter(s => s && s !== 'undefined').join(' ') || 'Volunteer';
              const skills = toArray(v['Skill Areas']);
              const tools = toArray(v['Tools']);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedVolunteer(row.original)}
                  className={clsx(
                    'w-full text-left rounded-xl border p-3 transition-colors',
                    selectedVolunteer?.id === row.original.id
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-base-200 bg-base-100 hover:border-base-300',
                  )}
                >
                  <div className="flex-bc gap-2">
                    <span className="font-semibold text-sm">{name}</span>
                    <div className="flex-sc gap-1">
                      {row.original.projectCount > 0 && (
                        <CountBadge count={row.original.projectCount} color="primary" />
                      )}
                      {row.original.eventCount > 0 && (
                        <CountBadge count={row.original.eventCount} color="secondary" />
                      )}
                    </div>
                  </div>
                  {(v['Email Address'] || v['Phone Number']) && (
                    <div className="flex-sc gap-3 mt-1 text-xs text-base-content/50">
                      {v['Email Address'] && (
                        <span className="truncate">{v['Email Address']}</span>
                      )}
                      {v['Phone Number'] && (
                        <span className="flex-none">{formatPhone(v['Phone Number'])}</span>
                      )}
                    </div>
                  )}
                  {(skills.length > 0 || tools.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skills.slice(0, 3).map(s => (
                        <span key={s} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-primary/8 text-primary/80">{s}</span>
                      ))}
                      {skills.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-base-200/60 text-base-content/40">+{skills.length - 3}</span>
                      )}
                      {tools.slice(0, 2).map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-secondary/8 text-secondary/80">{t}</span>
                      ))}
                      {tools.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-base-200/60 text-base-content/40">+{tools.length - 2}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      ) : (
        /* ── Desktop: Table ── */
        <div className="rounded-xl border border-base-300/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="bg-base-200/95 backdrop-blur-sm text-left font-semibold text-[11px] uppercase tracking-wider text-base-content/50 whitespace-nowrap select-none border-b border-base-300/50 border-r border-r-base-300/20 last:border-r-0"
                        style={{ width: header.getSize() }}
                      >
                        <button
                          type="button"
                          className="w-full flex-sc gap-1 px-3 py-2 hover:text-base-content/80 transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="ml-auto">
                            {header.column.getIsSorted() === 'asc' ? (
                              <Icon name="chevron-up" size={13} className="text-primary" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <Icon name="chevron-down" size={13} className="text-primary" />
                            ) : (
                              <Icon name="selector" size={13} className="opacity-20" />
                            )}
                          </span>
                        </button>
                        {showFilters && header.column.getCanFilter() && (
                          <div className="px-2 pb-2">
                            {header.column.columnDef.meta?.filterType === 'multiselect' ? (
                              <MultiSelectFilter
                                column={header.column}
                                options={header.column.columnDef.meta?.filterOptions ?? []}
                              />
                            ) : (
                              <TextFilter column={header.column} />
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.getVisibleLeafColumns().length} className="text-center py-16">
                      <EmptyResults activeFilterCount={activeFilterCount} onClear={clearAllFilters} />
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={clsx(
                        'group cursor-pointer transition-colors border-b border-base-200/50',
                        selectedVolunteer?.id === row.original.id
                          ? 'bg-primary/6'
                          : i % 2 === 0
                            ? 'bg-base-100 hover:bg-primary/[0.03]'
                            : 'bg-base-200/15 hover:bg-primary/[0.03]',
                      )}
                      onClick={() => setSelectedVolunteer(row.original)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className="px-3 py-2.5 whitespace-nowrap border-r border-r-base-200/20 last:border-r-0"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ── */}
      <VolunteerDetailDrawer
        volunteer={selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
        allProjects={allProjects}
        allEvents={allEvents}
        allAssignments={allAssignments}
        allSignups={allSignups}
        eventsById={eventsById}
        onDataChanged={reload}
      />

      {/* ── Create Volunteer Modal ── */}
      <CreateVolunteerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        affiliates={affiliates}
        onCreated={submission => {
          reload();
          if (submission) {
            setSelectedVolunteer({
              id: submission.id,
              values: submission.values ?? {},
              projects: [],
              events: [],
              projectCount: 0,
              eventCount: 0,
            });
          }
        }}
      />
    </div>
  );
};
