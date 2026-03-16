import { useDroppable } from '@dnd-kit/core';
import { Icon } from '../../../atoms/Icon.jsx';

/**
 * Wraps a project card to make it a drop target for volunteer cards.
 */
export const DroppableProjectCard = ({
  projectId,
  projectName,
  location,
  volunteerCount,
  isExpanded,
  onToggle,
  onViewProject,
  children,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `project-${projectId}`,
    data: { type: 'project', projectId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-box border bg-base-100 overflow-hidden transition-colors ${
        isOver
          ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/20'
          : 'border-base-200'
      }`}
    >
      <div className="px-4 py-3 bg-base-200/40 flex-bc gap-2">
        <button
          type="button"
          className="text-left hover:text-primary"
          onClick={onViewProject}
        >
          <span className="font-semibold text-sm hover:underline">
            {projectName || '—'}
          </span>
          {location && (
            <span className="ml-2 text-xs text-base-content/50">
              {location}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <span className="badge badge-ghost badge-sm">
            {volunteerCount} volunteer{volunteerCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            className="kbtn kbtn-xs kbtn-ghost kbtn-circle"
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              className="text-base-content/40"
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="divide-y divide-base-200">
          {children}
          {isOver && (
            <div className="px-4 py-2.5 text-sm text-primary/60 italic flex items-center gap-2">
              <Icon name="plus" size={14} />
              Drop to assign here
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * The volunteer pool (left panel) as a drop target for unstaging.
 */
export const DroppableVolunteerPool = ({ children, isOver }) => (
  <div
    className={`flex-c-st gap-4 transition-colors rounded-box ${
      isOver ? 'ring-2 ring-warning/30 bg-warning/5 p-2 -m-2' : ''
    }`}
  >
    {children}
  </div>
);
