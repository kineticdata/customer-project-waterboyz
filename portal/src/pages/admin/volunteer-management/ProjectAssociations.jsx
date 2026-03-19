import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { openConfirm } from '../../../helpers/confirm.js';

/**
 * Projects tab inside the volunteer detail drawer.
 * Shows current assignments and allows adding/removing projects.
 *
 * @param {object}   props
 * @param {object}   props.volunteer       - Enriched volunteer row from the table
 * @param {object[]} props.allProjects     - All swat-projects submissions (from parent data)
 * @param {object[]} props.allAssignments  - All swat-project-volunteers submissions
 * @param {object}   props.actions         - { assignToProject, removeFromProject }
 */
export const ProjectAssociations = ({
  volunteer,
  allProjects,
  allAssignments,
  actions,
}) => {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(null); // assignment id being processed

  // Current assignments for this volunteer
  const currentAssignments = useMemo(
    () =>
      (allAssignments ?? []).filter(
        a =>
          a.values?.['Volunteer ID'] === volunteer?.id &&
          a.values?.['Status'] === 'Active',
      ),
    [allAssignments, volunteer?.id],
  );

  const assignedProjectIds = useMemo(
    () => new Set(currentAssignments.map(a => a.values?.['Project ID'])),
    [currentAssignments],
  );

  // Projects available to assign (not already assigned)
  const availableProjects = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (allProjects ?? [])
      .filter(p => !assignedProjectIds.has(p.id))
      .filter(
        p =>
          !term ||
          (p.values?.['Project Name'] || '').toLowerCase().includes(term),
      )
      .slice(0, 20);
  }, [allProjects, assignedProjectIds, search]);

  // Resolve project details for current assignments
  const projectsById = useMemo(() => {
    const map = {};
    for (const p of allProjects ?? []) map[p.id] = p;
    return map;
  }, [allProjects]);

  const handleAssign = useCallback(
    async projectId => {
      setAdding(true);
      await actions.assignToProject(volunteer.id, projectId);
      setAdding(false);
      setShowPicker(false);
      setSearch('');
    },
    [actions, volunteer?.id],
  );

  const handleRemove = useCallback(
    (assignment, projectName) => {
      openConfirm({
        title: 'Remove from project?',
        description: `Remove this volunteer from "${projectName}"?`,
        acceptLabel: 'Remove',
        cancelLabel: 'Cancel',
        accept: async () => {
          setBusy(assignment.id);
          await actions.removeFromProject(assignment.id);
          setBusy(null);
        },
      });
    },
    [actions],
  );

  return (
    <div className="flex-c-st h-full">
      {/* Current assignments */}
      <div className="p-4 flex-c-st gap-2 flex-1 overflow-auto">
        {currentAssignments.length === 0 && !showPicker ? (
          <EmptyState />
        ) : (
          currentAssignments.map(a => {
            const proj = projectsById[a.values?.['Project ID']];
            const name = proj?.values?.['Project Name'] || 'Unknown Project';
            const status = proj?.values?.['Project Status'];
            const date = proj?.values?.['Scheduled Date'];
            return (
              <div
                key={a.id}
                className="group rounded-xl border border-base-200/80 p-4 flex-bs gap-3 hover:border-base-300 transition-colors"
              >
                <Link
                  to={`/project-captains/${proj?.id}`}
                  className="flex-1 min-w-0"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex-sc gap-2">
                    <p className="font-medium text-sm text-base-content hover:text-primary transition-colors">
                      {name}
                    </p>
                    <Icon
                      name="arrow-right"
                      size={13}
                      className="opacity-0 group-hover:opacity-40 transition-opacity text-primary"
                    />
                  </div>
                  {date && (
                    <div className="flex-sc gap-1.5 mt-1 text-xs text-base-content/40">
                      <Icon name="calendar" size={12} />
                      {date}
                    </div>
                  )}
                </Link>
                <div className="flex-sc gap-2 flex-none">
                  {status && <StatusPill status={status} />}
                  <button
                    type="button"
                    onClick={() => handleRemove(a, name)}
                    disabled={busy === a.id}
                    className="kbtn kbtn-sm kbtn-ghost kbtn-square text-base-content/30 hover:text-error transition-colors"
                    title="Remove from project"
                  >
                    <Icon name="x" size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add project bar */}
      <div className="flex-none border-t border-base-200/80 p-4">
        {showPicker ? (
          <div className="flex-c-st gap-2">
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30"
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects to assign..."
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-base-200/40 border border-base-300/60 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border border-base-200/60">
              {availableProjects.length === 0 ? (
                <p className="px-3 py-4 text-xs text-base-content/30 text-center">
                  {search ? 'No matching projects' : 'No projects available'}
                </p>
              ) : (
                availableProjects.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAssign(p.id)}
                    disabled={adding}
                    className="w-full flex-sc gap-2 px-3 py-2 text-sm hover:bg-base-200/50 transition-colors text-left border-b border-base-200/40 last:border-0"
                  >
                    <span className="flex-1 truncate font-medium">
                      {p.values?.['Project Name'] || 'Unnamed'}
                    </span>
                    {p.values?.['Project Status'] && (
                      <StatusPill status={p.values['Project Status']} />
                    )}
                    <Icon name="plus" size={14} className="text-primary flex-none" />
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPicker(false);
                setSearch('');
              }}
              className="kbtn kbtn-sm kbtn-ghost self-end text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="kbtn kbtn-sm kbtn-ghost text-primary gap-1.5 w-full"
          >
            <Icon name="plus" size={15} />
            Assign to Project
          </button>
        )}
      </div>
    </div>
  );
};

// -- Shared --

const EmptyState = () => (
  <div className="flex-c-cc gap-3 py-12 px-6">
    <div className="w-14 h-14 rounded-full bg-base-200/50 flex-cc">
      <Icon name="hammer" size={24} className="text-base-content/15" />
    </div>
    <div className="text-center">
      <p className="text-sm font-medium text-base-content/40">
        No project assignments
      </p>
      <p className="text-xs text-base-content/30 mt-0.5">
        Use the button below to assign this volunteer.
      </p>
    </div>
  </div>
);

const statusMap = {
  Active: { bg: 'bg-success/20', text: 'text-success-content' },
  'In Progress': { bg: 'bg-info/20', text: 'text-info-content' },
  Completed: { bg: 'bg-info/20', text: 'text-info-content' },
  'On Hold': { bg: 'bg-warning/20', text: 'text-warning-content' },
  Cancelled: { bg: 'bg-error/20', text: 'text-error-content' },
};

const StatusPill = ({ status }) => {
  const s = statusMap[status] || { bg: 'bg-base-200/60', text: 'text-base-content/50' };
  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap',
        s.bg,
        s.text,
      )}
    >
      {status}
    </span>
  );
};
