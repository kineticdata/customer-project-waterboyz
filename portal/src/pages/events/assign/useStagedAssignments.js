import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  createSubmission,
  deleteSubmission,
  updateSubmission,
} from '@kineticdata/react';
import { openConfirm } from '../../../helpers/confirm.js';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const ASSIGNMENTS_FORM = 'swat-project-volunteers';

/**
 * Manages local (staged) volunteer-to-project assignments.
 *
 * `stagedMap`  — the desired state: { volunteerId → projectId }
 * `serverMap`  — the persisted state: { volunteerId → projectId }
 * `serverAssignments` — the raw assignment submissions from the server,
 *   needed so we can look up submission IDs for deletes/moves.
 *
 * All drag-and-drop and dropdown actions mutate `stagedMap` only.
 * "Save Changes" computes a diff and writes to the server.
 */
export const useStagedAssignments = ({
  assignments,
  signupByVolunteerId,
  reload,
}) => {
  const { kappSlug } = useSelector(state => state.app);
  const [stagedMap, setStagedMap] = useState({});
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);

  // Build serverMap from assignment submissions
  const serverMap = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      const vid = a.values?.['Volunteer ID'];
      const pid = a.values?.['Project ID'];
      if (vid && pid) map[vid] = pid;
    }
    return map;
  }, [assignments]);

  // Map volunteerId → assignment submission id (for deletes)
  const serverAssignmentIdByVol = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      const vid = a.values?.['Volunteer ID'];
      if (vid) map[vid] = a.id;
    }
    return map;
  }, [assignments]);

  // Initialize stagedMap from server on first load
  useEffect(() => {
    if (!initializedRef.current && assignments.length >= 0) {
      setStagedMap({ ...serverMap });
      initializedRef.current = true;
    }
  }, [serverMap, assignments]);

  // Compute diff
  const pendingChanges = useMemo(() => {
    const toCreate = []; // { volunteerId, projectId }
    const toDelete = []; // { volunteerId, assignmentId }
    const toMove = []; // { volunteerId, fromProjectId, toProjectId, assignmentId }

    // Check for new and moved assignments
    for (const [vid, pid] of Object.entries(stagedMap)) {
      const serverPid = serverMap[vid];
      if (!serverPid) {
        toCreate.push({ volunteerId: vid, projectId: pid });
      } else if (serverPid !== pid) {
        toMove.push({
          volunteerId: vid,
          fromProjectId: serverPid,
          toProjectId: pid,
          assignmentId: serverAssignmentIdByVol[vid],
        });
      }
    }

    // Check for removals (in server but not in staged)
    for (const [vid, pid] of Object.entries(serverMap)) {
      if (!stagedMap[vid]) {
        toDelete.push({
          volunteerId: vid,
          projectId: pid,
          assignmentId: serverAssignmentIdByVol[vid],
        });
      }
    }

    return { toCreate, toDelete, toMove };
  }, [stagedMap, serverMap, serverAssignmentIdByVol]);

  const dirty =
    pendingChanges.toCreate.length > 0 ||
    pendingChanges.toDelete.length > 0 ||
    pendingChanges.toMove.length > 0;

  // Stage a volunteer to a project (local only)
  const stageAssignment = useCallback((volunteerId, projectId) => {
    if (!volunteerId || !projectId) return;
    setStagedMap(prev => ({ ...prev, [volunteerId]: projectId }));
  }, []);

  // Unstage a volunteer (remove from staged map)
  const unstageAssignment = useCallback(volunteerId => {
    if (!volunteerId) return;
    setStagedMap(prev => {
      const next = { ...prev };
      delete next[volunteerId];
      return next;
    });
  }, []);

  // Discard all local changes
  const discardChanges = useCallback(() => {
    setStagedMap({ ...serverMap });
  }, [serverMap]);

  // Save: compute diff and execute API calls
  const executeSave = useCallback(async () => {
    const { toCreate, toDelete, toMove } = pendingChanges;
    setSaving(true);

    try {
      const errors = [];

      // Delete removed assignments
      for (const { volunteerId, assignmentId } of toDelete) {
        const result = await deleteSubmission({ id: assignmentId });
        if (result?.error) {
          errors.push(`Delete failed for volunteer: ${result.error.message}`);
        } else {
          // Revert signup status
          const signup = signupByVolunteerId[volunteerId];
          if (signup) {
            await updateSubmission({
              id: signup.id,
              values: { 'Signup Status': 'Signed Up' },
            });
          }
        }
      }

      // Handle moves: delete old assignment, create new one
      for (const { volunteerId, toProjectId, assignmentId } of toMove) {
        const delResult = await deleteSubmission({ id: assignmentId });
        if (delResult?.error) {
          errors.push(`Move failed for volunteer: ${delResult.error.message}`);
          continue;
        }
        const createResult = await createSubmission({
          kappSlug,
          formSlug: ASSIGNMENTS_FORM,
          values: {
            'Volunteer ID': volunteerId,
            'Project ID': toProjectId,
            Present: 'No',
          },
        });
        if (createResult?.error) {
          errors.push(`Move create failed: ${createResult.error.message}`);
        }
      }

      // Create new assignments
      for (const { volunteerId, projectId } of toCreate) {
        const result = await createSubmission({
          kappSlug,
          formSlug: ASSIGNMENTS_FORM,
          values: {
            'Volunteer ID': volunteerId,
            'Project ID': projectId,
            Present: 'No',
          },
        });
        if (result?.error) {
          errors.push(`Assign failed: ${result.error.message}`);
        } else {
          // Update signup status to Assigned
          const signup = signupByVolunteerId[volunteerId];
          if (signup) {
            await updateSubmission({
              id: signup.id,
              values: { 'Signup Status': 'Assigned' },
            });
          }
        }
      }

      if (errors.length > 0) {
        toastError({
          title: 'Some changes failed',
          description: errors[0],
        });
      } else {
        const total = toCreate.length + toDelete.length + toMove.length;
        toastSuccess({
          title: `${total} change${total !== 1 ? 's' : ''} saved successfully.`,
        });
      }

      // Reload server data and re-sync staged map
      reload();
      initializedRef.current = false; // allow re-init from fresh server data
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, kappSlug, signupByVolunteerId, reload]);

  // Show confirmation dialog before saving
  const saveChanges = useCallback(() => {
    const { toCreate, toDelete, toMove } = pendingChanges;
    const parts = [];
    if (toCreate.length > 0) parts.push(`${toCreate.length} new assignment${toCreate.length !== 1 ? 's' : ''}`);
    if (toDelete.length > 0) parts.push(`${toDelete.length} removal${toDelete.length !== 1 ? 's' : ''}`);
    if (toMove.length > 0) parts.push(`${toMove.length} move${toMove.length !== 1 ? 's' : ''}`);

    openConfirm({
      title: 'Save assignment changes?',
      description: `This will apply ${parts.join(', ')}. Newly assigned volunteers will be notified via email.`,
      acceptLabel: 'Save Changes',
      cancelLabel: 'Cancel',
      accept: executeSave,
    });
  }, [pendingChanges, executeSave]);

  return {
    stagedMap,
    serverMap,
    pendingChanges,
    dirty,
    saving,
    stageAssignment,
    unstageAssignment,
    discardChanges,
    saveChanges,
  };
};
