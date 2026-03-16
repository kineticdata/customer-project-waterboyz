import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { DragOverlayCard } from './DraggableVolunteerCard.jsx';

/**
 * Top-level DnD wrapper.
 *
 * Handles onDragEnd to route the drop into the correct staging action:
 * - Dropped on a project   → stageAssignment(volunteerId, projectId)
 * - Dropped on the pool     → unstageAssignment(volunteerId)
 * - Dropped on nothing      → no-op
 */
export const AssignDragDropContext = ({
  stageAssignment,
  unstageAssignment,
  volunteersById,
  signupByVolunteerId,
  children,
}) => {
  const [activeData, setActiveData] = useState(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = useCallback(event => {
    setActiveData(event.active.data.current);
  }, []);

  const handleDragEnd = useCallback(
    event => {
      setActiveData(null);
      const { active, over } = event;
      if (!over || !active.data.current) return;

      const { volunteerId } = active.data.current;
      const overData = over.data.current;

      if (overData?.type === 'project') {
        stageAssignment(volunteerId, overData.projectId);
      } else if (overData?.type === 'volunteer-pool') {
        unstageAssignment(volunteerId);
      }
    },
    [stageAssignment, unstageAssignment],
  );

  const handleDragCancel = useCallback(() => {
    setActiveData(null);
  }, []);

  // Resolve the volunteer + signup for the drag overlay
  const overlayVol = activeData
    ? volunteersById[activeData.volunteerId]
    : null;
  const overlaySignup = activeData
    ? signupByVolunteerId[activeData.volunteerId] ?? activeData.signup
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeData ? (
          <DragOverlayCard signup={overlaySignup} vol={overlayVol} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
