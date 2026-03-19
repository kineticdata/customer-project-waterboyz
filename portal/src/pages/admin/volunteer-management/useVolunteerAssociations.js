import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  createSubmission,
  defineKqlQuery,
  searchSubmissions,
  updateSubmission,
} from '@kineticdata/react';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const ASSIGNMENTS_FORM = 'swat-project-volunteers';

const existingAssignmentQuery = defineKqlQuery()
  .equals('values[Volunteer ID]', 'volunteerId')
  .equals('values[Project ID]', 'projectId')
  .end();

/**
 * Hook that provides CRUD operations for volunteer-to-project and
 * volunteer-to-event associations. All mutations are async and show
 * toast feedback. Call `onSuccess` after any mutation to reload data.
 */
export const useVolunteerAssociations = ({ onSuccess }) => {
  const { kappSlug } = useSelector(state => state.app);

  // ── Project assignments ──

  /** Assign a volunteer to a project. Reactivates a "Removed" record if one exists. */
  const assignToProject = useCallback(
    async (volunteerId, projectId) => {
      if (!volunteerId || !projectId) return;

      // Check for existing removed assignment
      const existing = await searchSubmissions({
        kapp: kappSlug,
        form: ASSIGNMENTS_FORM,
        search: {
          q: existingAssignmentQuery({ volunteerId, projectId }),
          include: ['values'],
          limit: 1,
        },
      });
      const removed = existing?.submissions?.find(
        s => s.values?.Status === 'Removed',
      );

      let result;
      if (removed) {
        result = await updateSubmission({
          id: removed.id,
          values: { Status: 'Active', Present: 'No' },
        });
      } else {
        result = await createSubmission({
          kappSlug,
          formSlug: ASSIGNMENTS_FORM,
          values: {
            'Volunteer ID': volunteerId,
            'Project ID': projectId,
            Present: 'No',
            Status: 'Active',
          },
        });
      }

      if (result?.error) {
        toastError({
          title: 'Failed to assign volunteer',
          description: result.error.message,
        });
        return false;
      }
      toastSuccess({ title: 'Volunteer assigned to project.' });
      onSuccess?.();
      return true;
    },
    [kappSlug, onSuccess],
  );

  /** Remove a volunteer from a project by setting Status to "Removed". */
  const removeFromProject = useCallback(
    async assignmentId => {
      if (!assignmentId) return;
      const result = await updateSubmission({
        id: assignmentId,
        values: { Status: 'Removed' },
      });
      if (result?.error) {
        toastError({
          title: 'Failed to remove assignment',
          description: result.error.message,
        });
        return false;
      }
      toastSuccess({ title: 'Volunteer removed from project.' });
      onSuccess?.();
      return true;
    },
    [onSuccess],
  );

  // ── Event signups ──

  /** Create a signup for a volunteer to an event. */
  const signUpForEvent = useCallback(
    async (volunteer, event) => {
      if (!volunteer?.id || !event?.id) return;
      const formSlug =
        event.values?.['Sign Up Form Slug'] || 'serve-day-sign-up';
      const v = volunteer.values ?? {};

      const result = await createSubmission({
        kappSlug,
        formSlug,
        values: {
          'First Name': v['First Name'] || '',
          'Last Name': v['Last Name'] || '',
          Email: v['Email Address'] || '',
          'Phone Number': v['Phone Number'] || '',
          'Event ID': event.id,
          'Volunteer ID': volunteer.id,
          'Signup Status': 'Signed Up',
          'Who is Serving': 'Just Me',
        },
      });

      if (result?.error) {
        toastError({
          title: 'Failed to sign up volunteer',
          description: result.error.message,
        });
        return false;
      }
      toastSuccess({ title: 'Volunteer signed up for event.' });
      onSuccess?.();
      return true;
    },
    [kappSlug, onSuccess],
  );

  /** Cancel an event signup by setting Signup Status to "Cancelled". */
  const cancelSignup = useCallback(
    async signupId => {
      if (!signupId) return;
      const result = await updateSubmission({
        id: signupId,
        values: { 'Signup Status': 'Cancelled' },
      });
      if (result?.error) {
        toastError({
          title: 'Failed to cancel signup',
          description: result.error.message,
        });
        return false;
      }
      toastSuccess({ title: 'Signup cancelled.' });
      onSuccess?.();
      return true;
    },
    [onSuccess],
  );

  return {
    assignToProject,
    removeFromProject,
    signUpForEvent,
    cancelSignup,
  };
};
