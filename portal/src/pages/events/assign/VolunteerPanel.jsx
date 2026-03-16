import { useDroppable } from '@dnd-kit/core';
import { Icon } from '../../../atoms/Icon.jsx';
import {
  DraggableVolunteerCard,
  VolunteerCardContent,
} from './DraggableVolunteerCard.jsx';

const StageDropdown = ({ projects, onStage }) => {
  if (projects.length === 0) return null;
  return (
    <select
      className="kselect kselect-bordered kselect-xs"
      value=""
      onChange={e => {
        if (e.target.value) onStage(e.target.value);
      }}
    >
      <option value="">Assign…</option>
      {projects.map(p => (
        <option key={p.id} value={p.id}>
          {p.values?.['Project Name'] || '—'}
        </option>
      ))}
    </select>
  );
};

export const VolunteerPanel = ({
  signupsByOrg,
  filteredCount,
  totalCount,
  filterSignups,
  projects,
  volunteersById,
  stagedMap,
  onStage,
  onViewVolunteer,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'volunteer-pool',
    data: { type: 'volunteer-pool' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-c-st gap-4 transition-all rounded-box ${
        isOver ? 'ring-2 ring-warning/30 bg-warning/5 p-2 -m-2' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">
          Volunteers ({filteredCount}
          {filteredCount !== totalCount ? ` of ${totalCount}` : ''})
        </div>
        {isOver && (
          <span className="text-xs text-warning font-medium animate-pulse">
            Drop to unassign
          </span>
        )}
      </div>

      {signupsByOrg.length === 0 && (
        <div className="rounded-box border border-base-200 bg-base-100 p-8 text-center">
          <p className="text-base-content/50">No volunteers signed up yet.</p>
        </div>
      )}

      {signupsByOrg.map(([org, orgSignups]) => {
        const visible = filterSignups(orgSignups);
        if (visible.length === 0) return null;
        return (
          <div
            key={org}
            className="rounded-box border border-base-200 bg-base-100 overflow-hidden"
          >
            <div className="px-4 py-3 bg-base-200/40 flex items-center gap-2">
              <Icon
                name="building"
                size={15}
                className="text-base-content/50"
              />
              <span className="font-semibold text-sm">{org}</span>
              <span className="ml-auto text-xs text-base-content/50">
                {visible.length}
              </span>
            </div>

            <div className="divide-y divide-base-200">
              {visible.map(signup => {
                const vid = signup.values?.['Volunteer ID'];
                const vol = volunteersById[vid];
                // Don't render if volunteer has no ID (can't be dragged/assigned)
                // or is already staged to a project
                const isStagedToProject = vid && !!stagedMap[vid];

                if (!vid) {
                  // Unregistered volunteer — show but not draggable
                  return (
                    <div key={signup.id} className="px-4 py-3 flex-c-st gap-2">
                      <VolunteerCardContent
                        signup={signup}
                        vol={vol}
                        volunteerId={vid}
                        isStaged={false}
                        onViewDetail={() =>
                          onViewVolunteer({ signup, vol })
                        }
                      />
                    </div>
                  );
                }

                if (isStagedToProject) return null;

                return (
                  <DraggableVolunteerCard
                    key={signup.id}
                    signup={signup}
                    vol={vol}
                    volunteerId={vid}
                    isStaged={false}
                  >
                    <VolunteerCardContent
                      signup={signup}
                      vol={vol}
                      volunteerId={vid}
                      isStaged={false}
                      onViewDetail={() =>
                        onViewVolunteer({ signup, vol })
                      }
                      actions={
                        <StageDropdown
                          projects={projects}
                          onStage={projectId => onStage(vid, projectId)}
                        />
                      }
                    />
                  </DraggableVolunteerCard>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
