import { Icon } from '../../../atoms/Icon.jsx';
import { DroppableProjectCard } from './DroppableProjectCard.jsx';
import {
  DraggableVolunteerCard,
  VolunteerCardContent,
} from './DraggableVolunteerCard.jsx';

export const ProjectPanel = ({
  projects,
  stagedMap,
  serverMap,
  volunteersById,
  signupByVolunteerId,
  expandedProjects,
  onToggleProject,
  onUnstage,
  onViewProject,
  onViewVolunteer,
}) => {
  // Build a map of projectId → [volunteerIds] from the stagedMap
  const stagedByProject = {};
  for (const [vid, pid] of Object.entries(stagedMap)) {
    if (!stagedByProject[pid]) stagedByProject[pid] = [];
    stagedByProject[pid].push(vid);
  }

  return (
    <div className="flex-c-st gap-4">
      <div className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">
        Projects ({projects.length})
      </div>

      {projects.length === 0 && (
        <div className="rounded-box border border-base-200 bg-base-100 p-8 text-center">
          <p className="text-base-content/50 text-sm">
            No projects linked to this event yet.
          </p>
          <p className="text-base-content/40 text-xs mt-1">
            Link projects via the Project Details page.
          </p>
        </div>
      )}

      {projects.map(project => {
        const assignedVids = stagedByProject[project.id] ?? [];
        const isExpanded = expandedProjects[project.id] ?? true;
        const location = [
          project.values?.['City'],
          project.values?.['State'],
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <DroppableProjectCard
            key={project.id}
            projectId={project.id}
            projectName={project.values?.['Project Name']}
            location={location}
            volunteerCount={assignedVids.length}
            isExpanded={isExpanded}
            onToggle={() => onToggleProject(project.id)}
            onViewProject={() => onViewProject(project)}
          >
            {assignedVids.length === 0 && (
              <div className="px-4 py-3 text-sm text-base-content/40 italic flex items-center gap-2">
                <Icon name="user-plus" size={15} className="opacity-50" />
                Drag volunteers here to assign
              </div>
            )}
            {assignedVids.map(vid => {
              const vol = volunteersById[vid];
              const signup = signupByVolunteerId[vid];
              const isNewStaged = !serverMap[vid];
              const isMoved =
                !!serverMap[vid] && serverMap[vid] !== project.id;

              return (
                <DraggableVolunteerCard
                  key={vid}
                  signup={signup}
                  vol={vol}
                  volunteerId={vid}
                  isStaged={isNewStaged || isMoved}
                >
                  <VolunteerCardContent
                    signup={signup}
                    vol={vol}
                    volunteerId={vid}
                    isStaged={isNewStaged || isMoved}
                    onViewDetail={() =>
                      signup && onViewVolunteer({ signup, vol })
                    }
                    actions={
                      <button
                        type="button"
                        className="kbtn kbtn-xs kbtn-ghost text-error"
                        onClick={() => onUnstage(vid)}
                        onPointerDown={e => e.stopPropagation()}
                      >
                        Remove
                      </button>
                    }
                  />
                </DraggableVolunteerCard>
              );
            })}
          </DroppableProjectCard>
        );
      })}
    </div>
  );
};
