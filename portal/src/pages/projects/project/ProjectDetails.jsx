import t from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getCsrfToken, searchSubmissions, updateSubmission } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { useRoles } from '../../../helpers/hooks/useRoles.js';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';
import { FamilyInformation } from './FamilyInformation.jsx';
import { Icon } from '../../../atoms/Icon.jsx';

const FIELD_PROJECT_CAPTAIN = 'Project Captain';
const FIELD_PROJECT_STATUS = 'Project Status';
const FIELD_SCHEDULED_DATE = 'Scheduled Date';
const FIELD_COMPLETION_DATE = 'Completion Date';
const FIELD_SKILLS_NEEDED = 'Skills Needed';
const FIELD_EQUIPMENT_NEEDED = 'Equipment Needed';
const FIELD_TASKS_MAN_HOURS_TOTAL = 'Project Tasks Man Hours Total';
const FIELD_TOTAL_MAN_HOURS = 'Total Project Man Hours';
const FIELD_ASSOCIATED_EVENT = 'Associated Event';
const FIELD_FAMILY_COMM_COMPLETE = 'Family Communication Complete';
const FIELD_FAMILY_TYPE = 'Family Type';

const FAMILY_TYPE_OPTIONS = [
  'Foster Family',
  'Special Needs Family',
  'Single Parent Family',
  'Senior Citizen',
  'Other',
];

const STATUS_VISIBILITY_NOTE = {
  Planning:
    'Volunteers can only see projects in "Ready to Work" status. Update the status when you\'re ready to recruit.',
  'Ready to Work':
    'This project is visible to volunteers on the Upcoming Projects page.',
  Active: 'This project is no longer listed for new volunteers.',
  Ongoing: 'This project is no longer listed for new volunteers.',
  Completed: 'Project has been completed.',
  Canceled: 'This project is closed.',
};

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
  familyRecord,
  familyLoading,
  reloadProject,
  captains,
  isClosed,
}) => {
  const { kappSlug } = useSelector(state => state.app);
  const { isLeadership } = useRoles();
  const [projectCaptain, setProjectCaptain] = useState('');
  const [status, setStatus] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState('');
  const [equipmentNeeded, setEquipmentNeeded] = useState('');
  const [totalManHours, setTotalManHours] = useState('');
  const [associatedEventId, setAssociatedEventId] = useState('');
  const [familyCommComplete, setFamilyCommComplete] = useState(false);
  const [familyType, setFamilyType] = useState([]);
  const [saving, setSaving] = useState(false);

  const eventsParams = useMemo(() => ({ kappSlug }), [kappSlug]);
  const { response: eventsResponse } = useData(fetchEvents, eventsParams);
  const events = useMemo(
    () => eventsResponse?.submissions ?? [],
    [eventsResponse],
  );

  const captainOptions = useMemo(
    () =>
      (captains ?? []).map(c => ({
        username: c['User Name'],
        displayName: c['User Display Name'],
        hasVolunteerProfile: !!c['Volunteer Id'],
      })),
    [captains],
  );
  const requiresVolunteerInfo = status && status !== 'Planning';
  const isCompleted = status === 'Completed';
  const taskHoursTotal = parseFloat(
    project?.values?.[FIELD_TASKS_MAN_HOURS_TOTAL],
  ) || 0;
  const statusOptions = useMemo(() => {
    const pages = project?.form?.pages || [];
    const allElements = pages.flatMap(page => page?.elements || []);
    const choices = findFieldChoices(allElements, FIELD_PROJECT_STATUS);
    const normalized = normalizeChoices(choices);
    if (!isLeadership) {
      return normalized.filter(o => o.value !== 'Closed');
    }
    return normalized;
  }, [project, isLeadership]);

  useEffect(() => {
    setProjectCaptain(project?.values?.[FIELD_PROJECT_CAPTAIN] || '');
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
    setFamilyCommComplete(
      (project?.values?.[FIELD_FAMILY_COMM_COMPLETE] || '').includes('true'),
    );
    try {
      const raw = project?.values?.[FIELD_FAMILY_TYPE];
      setFamilyType(raw ? JSON.parse(raw) : []);
    } catch { setFamilyType([]); }
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
    const missing = [];
    if (requiresVolunteerInfo && !familyCommComplete) missing.push('Family Communication Complete');
    if (requiresVolunteerInfo && !skillsNeeded) missing.push('Skills Needed');
    if (requiresVolunteerInfo && !equipmentNeeded) missing.push('Equipment Needed');
    if (isCompleted && !completionDate) missing.push('Completion Date');
    if (isCompleted && !totalManHours) missing.push('Total Project Man Hours');
    if (missing.length > 0) {
      toastError({
        title: 'Required fields missing',
        description: missing.join(', '),
      });
      return;
    }
    setSaving(true);
    const result = await updateSubmission({
      id: project.id,
      values: {
        [FIELD_PROJECT_CAPTAIN]: projectCaptain || null,
        [FIELD_PROJECT_STATUS]: status,
        [FIELD_SCHEDULED_DATE]: scheduledDate || null,
        [FIELD_COMPLETION_DATE]: completionDate || null,
        [FIELD_SKILLS_NEEDED]: skillsNeeded || null,
        [FIELD_EQUIPMENT_NEEDED]: equipmentNeeded || null,
        [FIELD_TOTAL_MAN_HOURS]: totalManHours || null,
        [FIELD_ASSOCIATED_EVENT]: associatedEventId || null,
        [FIELD_FAMILY_COMM_COMPLETE]: familyCommComplete ? '["true"]' : '[]',
        [FIELD_FAMILY_TYPE]: JSON.stringify(familyType),
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
  }, [project, projectCaptain, scheduledDate, completionDate, status, requiresVolunteerInfo, isCompleted, skillsNeeded, equipmentNeeded, totalManHours, associatedEventId, familyCommComplete, familyType, reloadProject]);

  const [closingOut, setClosingOut] = useState(false);
  const canCloseOut =
    isLeadership && (status === 'Completed' || status === 'Canceled');

  const handleCloseOut = useCallback(async () => {
    if (!project?.id) return;
    setClosingOut(true);
    try {
      const response = await fetch(
        `/app/kapps/${kappSlug}/webApis/project-close-out?timeout=10`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getCsrfToken(),
          },
          body: JSON.stringify({ 'Submission ID': project.id }),
        },
      );
      if (response.status !== 200) {
        throw new Error('Failed to close out project');
      }
      toastSuccess({ title: 'Project closed out successfully.' });
      reloadProject?.();
    } catch (err) {
      toastError({
        title: 'Unable to close out project',
        description: err.message,
      });
    }
    setClosingOut(false);
  }, [project, kappSlug, reloadProject]);

  return (
    <>
    <FamilyInformation familyRecord={familyRecord} familyLoading={familyLoading} />

    {/* Status Card — promoted for visibility */}
    <div className="krounded-box border kbg-base-100 p-6">
      <label className="klabel flex flex-col items-start gap-2">
        <span className="klabel-text text-lg font-semibold">Project Status</span>
        <select
          className="kselect kselect-bordered w-full"
          value={status}
          onChange={event => setStatus(event.target.value)}
          disabled={isClosed}
        >
          <option value="">Select a status</option>
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {status && STATUS_VISIBILITY_NOTE[status] && (
          <div className="flex items-start gap-2 mt-3 text-sm text-base-content/60">
            <Icon
              name={status === 'Ready to Work' ? 'eye' : 'eye-off'}
              size={16}
              className="mt-0.5 flex-none"
            />
            <span>{STATUS_VISIBILITY_NOTE[status]}</span>
          </div>
        )}
      </label>
    </div>

    {/* Close Out Banner — leadership only, when Completed or Canceled and not already closed */}
    {canCloseOut && !isClosed && (
      <div className="krounded-box border border-warning/30 bg-warning/5 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Icon name="lock" size={22} className="text-warning mt-0.5 flex-none" />
            <div>
              <p className="font-semibold text-base-content">Close Out Project</p>
              <p className="text-sm text-base-content/60 mt-0.5">
                Lock this project so no future changes can be made.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="kbtn kbtn-warning kbtn-sm flex-none"
            onClick={handleCloseOut}
            disabled={closingOut}
          >
            {closingOut ? 'Closing...' : 'Close Out Project'}
          </button>
        </div>
      </div>
    )}

    <fieldset disabled={isClosed} className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Project Details</div>
      <p className="mt-2 text-base-content/70">
        {isClosed ? 'This project is closed and read-only.' : 'Update project details and scheduled date.'}
      </p>

      {isLeadership && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="klabel flex flex-col items-start gap-2">
            <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
              Project Captain
            </span>
            <select
              className="kselect kselect-bordered w-full"
              value={projectCaptain}
              onChange={e => setProjectCaptain(e.target.value)}
            >
              <option value="">— Select a captain —</option>
              {captainOptions.map(c => (
                <option
                  key={c.username}
                  value={c.username}
                  disabled={!c.hasVolunteerProfile}
                >
                  {c.hasVolunteerProfile
                    ? `${c.displayName} (${c.username})`
                    : `${c.displayName || c.username} (No Volunteer Profile Created)`}
                </option>
              ))}
            </select>
          </label>
          <label className="klabel flex flex-col items-start gap-2">
            <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
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
              <span className="text-xs text-base-content/60">
                Scheduled Date will be set to the event date when saved.
              </span>
            )}
          </label>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
            Approved Budget
          </span>
          <input
            type="text"
            className="kinput kinput-bordered w-full"
            value={(() => {
              const raw = project?.values?.['Approved Budget'];
              if (!raw) return '—';
              const num = Number(String(raw).replace(/[^0-9.-]/g, ''));
              if (isNaN(num)) return raw;
              return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            })()}
            readOnly
            tabIndex={-1}
          />
        </label>
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
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
              <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
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
              <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
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
                <span className="text-xs text-base-content/60">
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

      {/* Family Type — visible to leadership, shown prominently during close-out */}
      {isLeadership && (
        <div className="mt-4">
          <div className="text-sm font-medium">
            Family Type
            {isCompleted && familyType.length === 0 && (
              <span className="text-warning ml-1 text-xs">(recommended for grant reporting)</span>
            )}
          </div>
          <p className="mt-1 text-xs text-base-content/60">
            Select all that apply. Used for grant reporting.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {FAMILY_TYPE_OPTIONS.map(option => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="kcheckbox kcheckbox-primary kcheckbox-sm"
                  checked={familyType.includes(option)}
                  onChange={e => {
                    setFamilyType(prev =>
                      e.target.checked
                        ? [...prev, option]
                        : prev.filter(v => v !== option),
                    );
                  }}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="kcheckbox kcheckbox-primary mt-0.5"
            checked={familyCommComplete}
            onChange={e => setFamilyCommComplete(e.target.checked)}
          />
          <div>
            <span className="text-sm font-medium">
              Family Communication Complete
              {requiresVolunteerInfo && !familyCommComplete && (
                <span className="text-error ml-1">*</span>
              )}
            </span>
            <p className="text-xs text-base-content/60 mt-0.5">
              Check this after you have contacted the family, reviewed the
              project, and clearly communicated the scope of work.
            </p>
            {requiresVolunteerInfo && !familyCommComplete && (
              <span className="text-error text-xs mt-1 block">
                Family communication must be completed before progressing past
                Planning.
              </span>
            )}
          </div>
        </label>
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium">Volunteer Requirements</div>
        <p className="mt-1 text-xs text-base-content/60">
          This information will be included in email notifications sent to
          prospective volunteers.
        </p>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
            Skills Needed {requiresVolunteerInfo && <span className="text-error">*</span>}
          </span>
          <textarea
            className="ktextarea ktextarea-bordered w-full"
            rows={4}
            placeholder="List skills needed for this project..."
            value={skillsNeeded}
            required={requiresVolunteerInfo}
            onChange={event => setSkillsNeeded(event.target.value)}
          />
          {requiresVolunteerInfo && !skillsNeeded && (
            <span className="text-error text-xs mt-1">
              Skills needed is required.
            </span>
          )}
        </label>
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
            Equipment Needed {requiresVolunteerInfo && <span className="text-error">*</span>}
          </span>
          <textarea
            className="ktextarea ktextarea-bordered w-full"
            rows={4}
            placeholder="List equipment needed for this project..."
            value={equipmentNeeded}
            required={requiresVolunteerInfo}
            onChange={event => setEquipmentNeeded(event.target.value)}
          />
          {requiresVolunteerInfo && !equipmentNeeded && (
            <span className="text-error text-xs mt-1">
              Equipment needed is required.
            </span>
          )}
        </label>
      </div>

      {!isClosed && (
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
      )}
    </fieldset>
    </>
  );
};

ProjectDetails.propTypes = {
  project: t.object,
  familyRecord: t.object,
  familyLoading: t.bool,
  reloadProject: t.func,
  captains: t.array,
  isClosed: t.bool,
};
