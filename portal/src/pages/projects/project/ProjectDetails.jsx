import t from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { searchSubmissions, updateSubmission } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const FIELD_PROJECT_STATUS = 'Project Status';
const FIELD_SCHEDULED_DATE = 'Scheduled Date';
const FIELD_COMPLETION_DATE = 'Completion Date';
const FIELD_SKILLS_NEEDED = 'Skills Needed';
const FIELD_EQUIPMENT_NEEDED = 'Equipment Needed';
const FIELD_TASKS_MAN_HOURS_TOTAL = 'Project Tasks Man Hours Total';
const FIELD_TOTAL_MAN_HOURS = 'Total Project Man Hours';
const FIELD_ASSOCIATED_EVENT = 'Associated Event';

const normalizeDateValue = value =>
  value ? String(value).trim().slice(0, 10) : '';

const findFieldChoices = (elements = [], fieldName) => {
  for (const element of elements) {
    if (element?.type === 'field' && element?.name === fieldName) {
      return element?.choices || [];
    }
    if (Array.isArray(element?.elements) && element.elements.length > 0) {
      const result = findFieldChoices(element.elements, fieldName);
      if (result && result.length > 0) return result;
    }
  }
  return [];
};

const normalizeChoices = choices => {
  if (!Array.isArray(choices)) return [];
  return choices.map(choice =>
    typeof choice === 'string'
      ? { label: choice, value: choice }
      : {
          label: choice?.label ?? choice?.value ?? '',
          value: choice?.value ?? choice?.label ?? '',
        },
  );
};

const fetchEvents = ({ kappSlug }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'events',
    search: { include: ['details', 'values'], limit: 100 },
  });

export const ProjectDetails = ({
  project,
  family: _family,
  familyLoading: _familyLoading,
  reloadProject,
}) => {
  const { kappSlug } = useSelector(state => state.app);
  const [status, setStatus] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState('');
  const [equipmentNeeded, setEquipmentNeeded] = useState('');
  const [totalManHours, setTotalManHours] = useState('');
  const [associatedEventId, setAssociatedEventId] = useState('');
  const [saving, setSaving] = useState(false);

  const eventsParams = useMemo(() => ({ kappSlug }), [kappSlug]);
  const { response: eventsResponse } = useData(fetchEvents, eventsParams);
  const events = useMemo(
    () => eventsResponse?.submissions ?? [],
    [eventsResponse],
  );
  const isCompleted = status === 'Completed';
  const taskHoursTotal = parseFloat(
    project?.values?.[FIELD_TASKS_MAN_HOURS_TOTAL],
  ) || 0;
  const statusOptions = useMemo(() => {
    const pages = project?.form?.pages || [];
    const allElements = pages.flatMap(page => page?.elements || []);
    const choices = findFieldChoices(allElements, FIELD_PROJECT_STATUS);
    return normalizeChoices(choices);
  }, [project]);

  useEffect(() => {
    setStatus(project?.values?.[FIELD_PROJECT_STATUS] || '');
    setScheduledDate(
      normalizeDateValue(project?.values?.[FIELD_SCHEDULED_DATE]),
    );
    setCompletionDate(
      normalizeDateValue(project?.values?.[FIELD_COMPLETION_DATE]),
    );
    setSkillsNeeded(project?.values?.[FIELD_SKILLS_NEEDED] || '');
    setEquipmentNeeded(project?.values?.[FIELD_EQUIPMENT_NEEDED] || '');
    setTotalManHours(project?.values?.[FIELD_TOTAL_MAN_HOURS] || '');
    setAssociatedEventId(project?.values?.[FIELD_ASSOCIATED_EVENT] || '');
  }, [project]);

  // When an event is selected, auto-populate Scheduled Date from the event date.
  const handleEventChange = useCallback(
    eventId => {
      setAssociatedEventId(eventId);
      if (eventId) {
        const event = events.find(e => e.id === eventId);
        const eventDate = normalizeDateValue(event?.values?.['Event Date']);
        if (eventDate) setScheduledDate(eventDate);
      }
    },
    [events],
  );

  const handleSave = useCallback(async () => {
    if (!project?.id) return;
    if (isCompleted && !completionDate) return;
    if (isCompleted && !totalManHours) return;
    setSaving(true);
    const result = await updateSubmission({
      id: project.id,
      values: {
        [FIELD_PROJECT_STATUS]: status,
        [FIELD_SCHEDULED_DATE]: scheduledDate || null,
        [FIELD_COMPLETION_DATE]: completionDate || null,
        [FIELD_SKILLS_NEEDED]: skillsNeeded || null,
        [FIELD_EQUIPMENT_NEEDED]: equipmentNeeded || null,
        [FIELD_TOTAL_MAN_HOURS]: totalManHours || null,
        [FIELD_ASSOCIATED_EVENT]: associatedEventId || null,
      },
    });

    if (result?.error) {
      toastError({
        title: 'Unable to update project details',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Project details updated.' });
      reloadProject?.();
    }

    setSaving(false);
  }, [project, scheduledDate, completionDate, status, isCompleted, skillsNeeded, equipmentNeeded, totalManHours, associatedEventId, reloadProject]);

  return (
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Project Details</div>
      <p className="mt-2 ktext-base-content/70">
        Update project status and scheduled date.
      </p>

      <div className="mt-4">
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
            Associated Event
          </span>
          <select
            className="kselect kselect-bordered w-full"
            value={associatedEventId}
            onChange={e => handleEventChange(e.target.value)}
          >
            <option value="">— No event —</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.values?.['Event Name']}
                {e.values?.['Event Date'] ? ` — ${e.values['Event Date']}` : ''}
              </option>
            ))}
          </select>
          {associatedEventId && (
            <span className="text-xs ktext-base-content/60">
              Scheduled Date will be set to the event date when saved.
            </span>
          )}
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
            Project Status
          </span>
          <select
            className="kselect kselect-bordered w-full"
            value={status}
            onChange={event => setStatus(event.target.value)}
          >
            <option value="">Select a status</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
            Scheduled Date
          </span>
          <input
            type="date"
            className="kinput kinput-bordered w-full"
            value={scheduledDate}
            onChange={event => setScheduledDate(event.target.value)}
          />
        </label>
        {isCompleted && (
          <>
            <label className="klabel flex flex-col items-start gap-2">
              <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                Completion Date <span className="text-error">*</span>
              </span>
              <input
                type="date"
                className="kinput kinput-bordered w-full"
                value={completionDate}
                required
                onChange={event => setCompletionDate(event.target.value)}
              />
              {!completionDate && (
                <span className="text-error text-xs mt-1">
                  Completion date is required when status is Completed.
                </span>
              )}
            </label>
            <label className="klabel flex flex-col items-start gap-2">
              <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                Total Project Man Hours <span className="text-error">*</span>
              </span>
              <input
                type="number"
                className="kinput kinput-bordered w-full"
                min="0"
                step="0.5"
                value={totalManHours}
                required
                onChange={event => setTotalManHours(event.target.value)}
              />
              {taskHoursTotal > 0 && (
                <span className="text-xs ktext-base-content/60">
                  Task estimates total:{' '}
                  <span className="font-semibold">{taskHoursTotal} hrs</span>
                </span>
              )}
              {!totalManHours && (
                <span className="text-error text-xs mt-1">
                  Total man hours is required when status is Completed.
                </span>
              )}
            </label>
          </>
        )}
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium">Volunteer Requirements</div>
        <p className="mt-1 text-xs ktext-base-content/60">
          This information will be included in email notifications sent to
          prospective volunteers.
        </p>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
            Skills Needed
          </span>
          <textarea
            className="ktextarea ktextarea-bordered w-full"
            rows={4}
            placeholder="List skills needed for this project..."
            value={skillsNeeded}
            onChange={event => setSkillsNeeded(event.target.value)}
          />
        </label>
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
            Equipment Needed
          </span>
          <textarea
            className="ktextarea ktextarea-bordered w-full"
            rows={4}
            placeholder="List equipment needed for this project..."
            value={equipmentNeeded}
            onChange={event => setEquipmentNeeded(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="kbtn kbtn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

ProjectDetails.propTypes = {
  project: t.object,
  family: t.any,
  familyLoading: t.bool,
  reloadProject: t.func,
};
