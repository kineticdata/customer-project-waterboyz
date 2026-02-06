import t from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { updateSubmission } from '@kineticdata/react';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const FIELD_PROJECT_STATUS = 'Project Status';
const FIELD_SCHEDULED_DATE = 'Scheduled Date';

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

export const ProjectDetails = ({
  project,
  family: _family,
  familyLoading: _familyLoading,
}) => {
  const [status, setStatus] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [saving, setSaving] = useState(false);
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
  }, [project]);

  const handleSave = useCallback(async () => {
    if (!project?.id) return;
    setSaving(true);
    const result = await updateSubmission({
      id: project.id,
      values: {
        [FIELD_PROJECT_STATUS]: status,
        [FIELD_SCHEDULED_DATE]: scheduledDate || null,
      },
    });

    if (result?.error) {
      toastError({
        title: 'Unable to update project details',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Project details updated.' });
    }

    setSaving(false);
  }, [project, scheduledDate, status]);

  return (
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Project Details</div>
      <p className="mt-2 ktext-base-content/70">
        Update project status and scheduled date.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="kform-control">
          <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
            Project Status
          </span>
          <select
            className="kselect kselect-bordered"
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
        <label className="kform-control">
          <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
            Scheduled Date
          </span>
          <input
            type="date"
            className="kinput kinput-bordered"
            value={scheduledDate}
            onChange={event => setScheduledDate(event.target.value)}
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
};
