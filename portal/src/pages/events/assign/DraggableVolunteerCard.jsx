import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '../../../atoms/Icon.jsx';
import { getSignupName, toArray } from '../../../helpers/format.js';

/**
 * A volunteer card that can be dragged between panels.
 * Used in both the volunteer pool (left) and inside project cards (right).
 *
 * The `data` prop on useDraggable carries the volunteerId and signup so the
 * drop handler knows what was dragged.
 */
export const DraggableVolunteerCard = ({
  signup,
  volunteerId,
  isStaged,
  children,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `volunteer-${volunteerId}`,
      data: { type: 'volunteer', volunteerId, signup },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-4 py-3 flex-c-st gap-2 cursor-grab active:cursor-grabbing touch-none ${
        isStaged ? 'bg-primary/5' : ''
      }`}
    >
      {children}
    </div>
  );
};

/**
 * The inner content of a volunteer card — shared between draggable cards
 * and the DragOverlay preview.
 */
export const VolunteerCardContent = ({
  signup,
  vol,
  volunteerId,
  isStaged,
  statusBadge,
  onViewDetail,
  actions,
}) => {
  const signupStatus = signup?.values?.['Signup Status'];

  return (
    <>
      <div className="flex-bc gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon
            name="grip-vertical"
            size={14}
            className="text-base-content/25 flex-none"
          />
          <button
            type="button"
            className="font-medium text-sm text-left hover:text-primary hover:underline truncate"
            onClick={e => {
              e.stopPropagation();
              onViewDetail?.();
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            {getSignupName(signup, vol)}
          </button>
          {!volunteerId && (
            <span className="badge badge-ghost badge-sm text-base-content/50 flex-none">
              Unregistered
            </span>
          )}
          {isStaged && (
            <span className="badge badge-warning badge-sm flex-none">
              Staged
            </span>
          )}
          {!isStaged && signupStatus === 'Assigned' && (
            <span className="badge badge-primary badge-sm flex-none">
              Assigned
            </span>
          )}
          {signupStatus === 'Waitlisted' && (
            <span className="badge badge-warning badge-sm flex-none">
              Waitlisted
            </span>
          )}
          {statusBadge}
        </div>
        {actions && (
          <div
            className="flex-none"
            onPointerDown={e => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      <VolunteerMeta signup={signup} vol={vol} />
    </>
  );
};

const VolunteerMeta = ({ signup, vol }) => {
  const skills = toArray(vol?.values?.['Skill Areas']);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50 pl-5">
      {signup?.values?.['Who is Serving'] === 'With Others' &&
        signup?.values?.['Total Number of Volunteers'] && (
          <span className="flex items-center gap-1">
            <Icon name="users" size={13} />
            Group of {signup.values['Total Number of Volunteers']}
          </span>
        )}
      {signup?.values?.['Project Preference'] && (
        <span className="flex items-center gap-1">
          <Icon name="star" size={13} />
          Prefers: {signup.values['Project Preference']}
        </span>
      )}
      {toArray(vol?.values?.['Preferred Service Area']).length > 0 && (
        <span className="flex items-center gap-1">
          <Icon name="map-pin" size={13} />
          {toArray(vol.values['Preferred Service Area']).join(', ')}
        </span>
      )}
      {toArray(vol?.values?.['Dietary Restrictions']).length > 0 && (
        <span className="flex items-center gap-1">
          <Icon name="salad" size={13} />
          Dietary
        </span>
      )}
      {vol?.values?.['Photo Consent'] === 'No' && (
        <span className="flex items-center gap-1 text-warning">
          <Icon name="camera-off" size={13} />
          No Photo
        </span>
      )}
      {skills.length > 0 && (
        <span className="flex items-center gap-1">
          <Icon name="tool" size={13} />
          {skills.length} skill{skills.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

/**
 * Lightweight card used in the DragOverlay so the user sees what they're dragging.
 */
export const DragOverlayCard = ({ signup, vol }) => (
  <div className="bg-base-100 border border-primary/30 rounded-lg shadow-xl px-4 py-3 max-w-xs opacity-90">
    <div className="flex items-center gap-1.5">
      <Icon name="grip-vertical" size={14} className="text-primary/50" />
      <span className="font-medium text-sm">{getSignupName(signup, vol)}</span>
    </div>
  </div>
);
