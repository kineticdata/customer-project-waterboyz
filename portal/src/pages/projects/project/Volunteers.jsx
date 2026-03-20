import t from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  createSubmission,
  defineKqlQuery,
  searchSubmissions,
  updateSubmission,
} from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { Loading } from '../../../components/states/Loading.jsx';
import { Error } from '../../../components/states/Error.jsx';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';
import { Icon } from '../../../atoms/Icon.jsx';
import { formatPhone } from '../../../helpers/format.js';
import { useRoles } from '../../../helpers/hooks/useRoles.js';
import { Tooltip } from '../../../atoms/Tooltip.jsx';
import { Modal } from '../../../atoms/Modal.jsx';
import { VolunteerDetailModal } from '../../../components/VolunteerDetailModal.jsx';

const RELATIONSHIP_FORM = 'swat-project-volunteers';
const VOLUNTEERS_FORM = 'volunteers';
const FIELD_PROJECT_ID = 'Project ID';
const FIELD_USERNAME = 'Username';
const FIELD_VOLUNTEER_ID = 'Volunteer ID';
const FIELD_PRESENT = 'Present';
const FIELD_FIRST_NAME = 'First Name';
const FIELD_LAST_NAME = 'Last Name';
const FIELD_EMAIL = 'Email Address';
const FIELD_PHONE = 'Phone Number';
const FIELD_DIETARY = 'Dietary Restrictions';
const FIELD_PHOTO_CONSENT = 'Photo Consent';
const FIELD_STATUS = 'Status';
const FIELD_ADDITIONAL_VOLUNTEERS = 'Additional Volunteers Needed';

// Build KQL searches for the typeahead. Range operators (startsWith / =*)
// require orderBy on the same field, so OR across two different fields needs
// two separate queries whose results are merged client-side.
const buildFirstNameSearch = term => ({
  q: defineKqlQuery().startsWith(`values[${FIELD_FIRST_NAME}]`, 'term').end()({ term }),
  orderBy: `values[${FIELD_FIRST_NAME}]`,
  include: ['details', 'values'],
  limit: 20,
});
const buildLastNameSearch = term => ({
  q: defineKqlQuery().startsWith(`values[${FIELD_LAST_NAME}]`, 'term').end()({ term }),
  orderBy: `values[${FIELD_LAST_NAME}]`,
  include: ['details', 'values'],
  limit: 20,
});

// Build the KQL search to list volunteers already associated to a project.
const buildVolunteersSearch = (projectId, status = 'Active') => {
  const q = defineKqlQuery()
    .equals(`values[${FIELD_PROJECT_ID}]`, 'projectId')
    .equals(`values[${FIELD_STATUS}]`, 'status')
    .end();

  return {
    q: q({ projectId, status }),
    include: ['details', 'values'],
    limit: 200,
  };
};

// Prefer the business ID when present, otherwise fall back to the submission id.
const getVolunteerIdFromSubmission = submission =>
  submission?.values?.[FIELD_VOLUNTEER_ID] || submission?.id;

// Render a display name from the volunteer values.
const formatVolunteerName = values =>
  [values?.[FIELD_FIRST_NAME], values?.[FIELD_LAST_NAME]]
    .filter(Boolean)
    .join(' ');

// Normalize phone numbers into a consistent +E.164-ish format for SMS links.
// This ensures downstream SMS URIs are stable and deduplicated correctly.
const normalizePhone = phone => {
  if (!phone) return '';
  let digits = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('1') && digits.length === 11) {
    digits = `+${digits}`;
  } else if (digits.startsWith('+')) {
    // keep as is
  } else if (digits.length === 10) {
    digits = `+1${digits}`;
  }
  return digits;
};


// Build a platform-appropriate sms: link (iOS/macOS require sms://open).
// Caller supplies the user agent to keep this function pure/testable.
const buildSmsHref = (phones, userAgent) => {
  if (!phones?.length) return '';
  const ua = userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const appleSeparator = ',';
  const defaultSeparator = ';';

  if (isIOS || isMac) {
    return `sms://open?addresses=${phones.join(appleSeparator)}`;
  }

  return `sms:${phones.join(defaultSeparator)}`;
};

// Resolve the volunteer values from the details map, with fallback lookups
// for the possible id formats stored in relationship submissions.
const getVolunteerValues = (submission, volunteerDetails) => {
  const id = getVolunteerIdFromSubmission(submission);
  return (
    volunteerDetails.get(id) ||
    volunteerDetails.get(submission?.values?.[FIELD_VOLUNTEER_ID]) ||
    volunteerDetails.get(submission?.id) ||
    {}
  );
};

// Check if the volunteer has dietary/photo flags worth surfacing.
const isGlutenFree = values => {
  const dietary = values?.[FIELD_DIETARY];
  if (Array.isArray(dietary)) return dietary.includes('Gluten Free');
  if (typeof dietary === 'string') {
    try { return JSON.parse(dietary).includes('Gluten Free'); } catch { return false; }
  }
  return false;
};
const noPhotoConsent = values => values?.[FIELD_PHOTO_CONSENT] === 'No';


export const Volunteers = ({ project }) => {
  const { kappSlug } = useSelector(state => state.app);
  const mobile = useSelector(state => state.view.mobile);
  const { isLeadership, isProjectCaptain } = useRoles();
  const canRemove = isLeadership || isProjectCaptain;
  const projectId = project?.id;
  // Search term for the typeahead input.
  const [searchTerm, setSearchTerm] = useState('');
  // Tracks loading state when associating an existing volunteer.
  const [adding, setAdding] = useState(false);
  // Tracks in-flight "present" toggles by relationship submission id.
  const [saving, setSaving] = useState({});
  // Controls the "Add New Volunteer" modal.
  const [newVolunteerOpen, setNewVolunteerOpen] = useState(false);
  // Tracks in-flight new-volunteer creation flow.
  const [creatingVolunteer, setCreatingVolunteer] = useState(false);
  // Local form state for the quick-add modal.
  const [newVolunteerValues, setNewVolunteerValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [additionalNeeded, setAdditionalNeeded] = useState('');
  const [savingAdditional, setSavingAdditional] = useState(false);
  // Controls the volunteer detail modal.
  const [detailVolunteer, setDetailVolunteer] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Pre-trimmed search term and ready flag to avoid repeating trim logic.
  const searchTermTrimmed = searchTerm.trim();
  const isSearchReady = searchTermTrimmed.length >= 2;

  // Query relationship submissions for the current project.
  const params = useMemo(
    () =>
      projectId
        ? {
          kapp: kappSlug,
          form: RELATIONSHIP_FORM,
          search: buildVolunteersSearch(projectId),
        }
        : null,
    [kappSlug, projectId],
  );

  const {
    initialized,
    loading,
    response,
    actions: { reloadData },
  } = useData(searchSubmissions, params);

  // Relationship submissions (project -> volunteer).
  const data = useMemo(() => response?.submissions || [], [response]);
  const error = response?.error;

  // Query pending-approval relationship submissions for the current project.
  const pendingParams = useMemo(
    () =>
      projectId
        ? {
            kapp: kappSlug,
            form: RELATIONSHIP_FORM,
            search: buildVolunteersSearch(projectId, 'Pending Approval'),
          }
        : null,
    [kappSlug, projectId],
  );

  const {
    initialized: pendingInit,
    loading: pendingLoading,
    response: pendingResponse,
    actions: { reloadData: reloadPending },
  } = useData(searchSubmissions, pendingParams);

  const pendingData = useMemo(() => pendingResponse?.submissions || [], [pendingResponse]);

  const reloadAll = useCallback(() => {
    reloadData();
    reloadPending();
  }, [reloadData, reloadPending]);

  // IDs of volunteers already associated with this project (active + pending).
  const volunteerIds = useMemo(
    () => [...new Set([
      ...data.map(item => item?.values?.[FIELD_VOLUNTEER_ID]).filter(Boolean),
      ...pendingData.map(item => item?.values?.[FIELD_VOLUNTEER_ID]).filter(Boolean),
    ])],
    [data, pendingData],
  );

  // Fetch the volunteer details for all associated volunteer IDs.
  const volunteerDetailsParams = useMemo(
    () =>
      volunteerIds.length > 0
        ? {
          kapp: kappSlug,
          form: VOLUNTEERS_FORM,
          search: {
            q: defineKqlQuery().in('id', 'volunteerIds').end()({
              volunteerIds,
            }),
            include: ['details', 'values'],
            limit: 200,
          },
        }
        : null,
    [kappSlug, volunteerIds],
  );

  const {
    response: volunteerDetailsResponse,
    loading: volunteerDetailsLoading,
  } = useData(searchSubmissions, volunteerDetailsParams);

  // Map volunteer id -> volunteer values for fast lookups in the table.
  const volunteerDetails = useMemo(() => {
    const list = volunteerDetailsResponse?.submissions || [];
    const map = new Map();
    list.forEach(item => {
      const values = item?.values || {};
      const id = values[FIELD_VOLUNTEER_ID];
      if (id) map.set(id, values);
      // Fallback to submission id in case the relationship stores that id
      if (item?.id) map.set(item.id, values);
    });
    return map;
  }, [volunteerDetailsResponse]);

  // Typeahead search parameters — two queries (first name, last name) merged.
  const firstNameSearchParams = useMemo(
    () =>
      isSearchReady
        ? { kapp: kappSlug, form: VOLUNTEERS_FORM, search: buildFirstNameSearch(searchTermTrimmed) }
        : null,
    [isSearchReady, kappSlug, searchTermTrimmed],
  );
  const lastNameSearchParams = useMemo(
    () =>
      isSearchReady
        ? { kapp: kappSlug, form: VOLUNTEERS_FORM, search: buildLastNameSearch(searchTermTrimmed) }
        : null,
    [isSearchReady, kappSlug, searchTermTrimmed],
  );

  const {
    initialized: fnInitialized,
    loading: fnLoading,
    response: fnResponse,
  } = useData(searchSubmissions, firstNameSearchParams);
  const {
    initialized: lnInitialized,
    loading: lnLoading,
    response: lnResponse,
  } = useData(searchSubmissions, lastNameSearchParams);

  const searchInitialized = fnInitialized && lnInitialized;
  const searchLoading = fnLoading || lnLoading;

  // Merge and deduplicate results from both queries, excluding already-associated.
  const searchResults = useMemo(() => {
    const fnResults = fnResponse?.submissions || [];
    const lnResults = lnResponse?.submissions || [];
    const seen = new Set();
    const existingIds = new Set(volunteerIds);
    const merged = [];
    for (const result of [...lnResults, ...fnResults]) {
      const id = getVolunteerIdFromSubmission(result);
      if (!id || seen.has(id) || existingIds.has(id)) continue;
      seen.add(id);
      merged.push(result);
    }
    return merged;
  }, [fnResponse, lnResponse, volunteerIds]);

  useEffect(() => {
    setAdditionalNeeded(
      project?.values?.[FIELD_ADDITIONAL_VOLUNTEERS] || '',
    );
  }, [project]);

  // Toggle the Present flag on the relationship submission.
  const handleTogglePresent = useCallback(
    async submission => {
      const current = submission?.values?.[FIELD_PRESENT] === 'Yes';
      setSaving(s => ({ ...s, [submission.id]: true }));
      const result = await updateSubmission({
        id: submission.id,
        values: { [FIELD_PRESENT]: current ? 'No' : 'Yes' },
      });

      if (result?.error) {
        toastError({
          title: 'Unable to update volunteer',
          description: result.error.message,
        });
      } else {
        toastSuccess({ title: 'Volunteer updated' });
        reloadAll();
      }

      setSaving(s => ({ ...s, [submission.id]: false }));
    },
    [reloadAll],
  );

  // Remove a volunteer from this project by setting Status to "Removed".
  const handleRemoveVolunteer = useCallback(
    async submission => {
      if (!submission?.id) return;
      setSaving(s => ({ ...s, [submission.id]: true }));
      const result = await updateSubmission({
        id: submission.id,
        values: { [FIELD_STATUS]: 'Removed' },
      });

      if (result?.error) {
        toastError({
          title: 'Unable to remove volunteer',
          description: result.error.message,
        });
      } else {
        toastSuccess({ title: 'Volunteer removed' });
        reloadAll();
      }

      setSaving(s => ({ ...s, [submission.id]: false }));
    },
    [reloadAll],
  );

  // Approve a pending volunteer request by setting Status to "Active".
  const handleApproveVolunteer = useCallback(
    async submission => {
      if (!submission?.id) return;
      setSaving(s => ({ ...s, [submission.id]: true }));
      const result = await updateSubmission({
        id: submission.id,
        values: { [FIELD_STATUS]: 'Active' },
      });

      if (result?.error) {
        toastError({
          title: 'Unable to approve volunteer',
          description: result.error.message,
        });
      } else {
        toastSuccess({ title: 'Volunteer approved' });
        reloadAll();
      }

      setSaving(s => ({ ...s, [submission.id]: false }));
    },
    [reloadAll],
  );

  // Add a volunteer to this project. If a "Removed" record already exists
  // (unique index on [Volunteer ID, Project ID]), reactivate it instead.
  const handleAddVolunteer = useCallback(
    async volunteerId => {
      if (!projectId || !volunteerId) return;
      setAdding(true);

      // Check for an existing removed association (uses unique index on [Volunteer ID, Project ID])
      const existingQuery = defineKqlQuery()
        .equals(`values[${FIELD_VOLUNTEER_ID}]`, 'volunteerId')
        .equals(`values[${FIELD_PROJECT_ID}]`, 'projectId')
        .end();
      const existing = await searchSubmissions({
        kapp: kappSlug,
        form: RELATIONSHIP_FORM,
        search: {
          q: existingQuery({ volunteerId, projectId }),
          include: ['values'],
          limit: 1,
        },
      });
      const removedRecord = existing?.submissions?.find(
        s => s.values?.[FIELD_STATUS] === 'Removed',
      );

      let result;
      if (removedRecord) {
        result = await updateSubmission({
          id: removedRecord.id,
          values: { [FIELD_STATUS]: 'Active', [FIELD_PRESENT]: 'No' },
        });
      } else {
        result = await createSubmission({
          kappSlug,
          formSlug: RELATIONSHIP_FORM,
          values: {
            [FIELD_PROJECT_ID]: projectId,
            [FIELD_VOLUNTEER_ID]: volunteerId,
            [FIELD_PRESENT]: 'No',
            [FIELD_STATUS]: 'Active',
          },
        });
      }

      if (result?.error) {
        toastError({
          title: 'Unable to add volunteer',
          description: result.error.message,
        });
      } else {
        toastSuccess({ title: 'Volunteer added' });
        setSearchTerm('');
        reloadAll();
      }
      setAdding(false);
    },
    [kappSlug, projectId, reloadAll],
  );

  // Open the detail modal for a volunteer row.
  const openVolunteerDetail = useCallback(
    submission => {
      const values = getVolunteerValues(submission, volunteerDetails);
      setDetailVolunteer({
        id: getVolunteerIdFromSubmission(submission),
        values,
      });
      setDetailOpen(true);
    },
    [volunteerDetails],
  );

  // Create a volunteer record and then immediately associate it to the project.
  const handleCreateNewVolunteer = useCallback(async () => {
    if (!projectId) return;
    const firstName = newVolunteerValues.firstName.trim();
    const lastName = newVolunteerValues.lastName.trim();
    const email = newVolunteerValues.email.trim();
    const phone = newVolunteerValues.phone.trim();

    if (!lastName) {
      toastError({ title: 'Last Name is Required' });
      return;
    }

    setCreatingVolunteer(true);
    const createVolunteerResult = await createSubmission({
      kappSlug,
      formSlug: VOLUNTEERS_FORM,
      values: {
        [FIELD_FIRST_NAME]: firstName,
        [FIELD_LAST_NAME]: lastName,
        [FIELD_EMAIL]: email,
        [FIELD_PHONE]: phone,
        [FIELD_USERNAME]: email,
      },
    });

    if (createVolunteerResult?.error) {
      toastError({
        title: 'Unable to create volunteer',
        description: createVolunteerResult.error.message,
      });
      setCreatingVolunteer(false);
      return;
    }

    const volunteerSubmission = createVolunteerResult?.submission;
    const volunteerId =
      volunteerSubmission?.values?.[FIELD_VOLUNTEER_ID] ||
      volunteerSubmission?.id;

    if (!volunteerId) {
      toastError({
        title: 'Volunteer created, but no ID was returned.',
      });
      setCreatingVolunteer(false);
      return;
    }

    const associationResult = await createSubmission({
      kappSlug,
      formSlug: RELATIONSHIP_FORM,
      values: {
        [FIELD_PROJECT_ID]: projectId,
        [FIELD_VOLUNTEER_ID]: volunteerId,
        [FIELD_PRESENT]: 'No',
          [FIELD_STATUS]: 'Active'
      },
    });

    if (associationResult?.error) {
      toastError({
        title: 'Volunteer created, but could not link to project',
        description: associationResult.error.message,
      });
      setCreatingVolunteer(false);
      return;
    }

    toastSuccess({ title: 'Volunteer added' });
    setSearchTerm('');
    setNewVolunteerValues({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });
    setNewVolunteerOpen(false);
    reloadAll();
    setCreatingVolunteer(false);
  }, [kappSlug, newVolunteerValues, projectId, reloadAll]);

  const handleAdditionalNeeded = useCallback(
    async value => {
      if (!project?.id) return;
      setSavingAdditional(true);
      const result = await updateSubmission({
        id: project.id,
        values: { [FIELD_ADDITIONAL_VOLUNTEERS]: value },
      });

      if (result?.error) {
        toastError({
          title: 'Unable to update volunteer needs',
          description: result.error.message,
        });
      } else {
        toastSuccess({ title: 'Volunteer needs updated.' });
        setAdditionalNeeded(value);
      }
      setSavingAdditional(false);
    },
    [project],
  );

  // Aggregate unique emails and phones for bulk messaging buttons.
  const volunteerContacts = useMemo(() => {
    const emailSet = new Set();
    const phoneSet = new Set();

    volunteerIds.forEach(id => {
      const values = volunteerDetails.get(id);
      if (!values) return;
      const email = values[FIELD_EMAIL];
      const phone = values[FIELD_PHONE];
      if (email) emailSet.add(email);
      if (phone) {
        const digits = normalizePhone(phone);
        if (digits) phoneSet.add(digits);
      }
    });

    return {
      emails: Array.from(emailSet),
      phones: Array.from(phoneSet),
    };
  }, [volunteerIds, volunteerDetails]);

  // Mailto link for bulk email.
  const mailtoHref =
    volunteerContacts.emails.length > 0
      ? `mailto:${volunteerContacts.emails.join(',')}`
      : '';
  // SMS link for bulk text.
  const userAgent =
    typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  const smsHref = buildSmsHref(volunteerContacts.phones, userAgent);

  return (
    <div className="flex-c-st gap-4">
      <div className="rounded-box border border-base-200 bg-base-200/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Additional Volunteers Needed</div>
            <div className="mt-0.5 text-xs text-base-content/50">
              If set to &quot;No,&quot; volunteers won&apos;t see this project or receive it in
              the weekly upcoming projects digest.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`kbtn kbtn-sm ${
                additionalNeeded === 'Yes' ? 'kbtn-primary' : 'kbtn-outline'
              }`}
              onClick={() => handleAdditionalNeeded('Yes')}
              disabled={savingAdditional}
            >
              Yes
            </button>
            <button
              type="button"
              className={`kbtn kbtn-sm ${
                additionalNeeded === 'No' ? 'kbtn-primary' : 'kbtn-outline'
              }`}
              onClick={() => handleAdditionalNeeded('No')}
              disabled={savingAdditional}
            >
              No
            </button>
          </div>
        </div>
      </div>

      {canRemove && pendingData.length > 0 && (
        <div className="rounded-box border border-warning/30 bg-warning/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="clock" size={20} className="text-warning" />
            <span className="text-base font-semibold">Pending Requests</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning text-warning-content">
              {pendingData.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {pendingData.map(submission => {
              const values = getVolunteerValues(submission, volunteerDetails);
              const name = formatVolunteerName(values);
              const requestNotes = submission?.values?.['Request Notes'];
              return (
                <div
                  key={submission.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-base-100 border border-base-200 px-4 py-3"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => openVolunteerDetail(submission)}
                  >
                    <div className="font-medium text-sm truncate">
                      {name || 'Volunteer'}
                    </div>
                    <div className="flex gap-3 text-xs text-base-content/60 mt-0.5">
                      {values[FIELD_EMAIL] && <span>{values[FIELD_EMAIL]}</span>}
                      {values[FIELD_PHONE] && (
                        <span>{formatPhone(values[FIELD_PHONE])}</span>
                      )}
                    </div>
                    {requestNotes && (
                      <div className="mt-1.5 text-xs text-base-content/50 italic line-clamp-2">
                        &ldquo;{requestNotes}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <Tooltip content="Approve">
                      <button
                        slot="trigger"
                        type="button"
                        className="kbtn kbtn-sm kbtn-success kbtn-circle"
                        onClick={() => handleApproveVolunteer(submission)}
                        disabled={!!saving[submission.id]}
                        aria-label="Approve volunteer"
                      >
                        <Icon name="check" size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Remove">
                      <button
                        slot="trigger"
                        type="button"
                        className="kbtn kbtn-sm kbtn-ghost text-error kbtn-circle"
                        onClick={() => handleRemoveVolunteer(submission)}
                        disabled={!!saving[submission.id]}
                        aria-label="Remove request"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-box border bg-base-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-semibold">Volunteers</div>
        <div className="flex items-center gap-2">
          <Tooltip content="Email volunteers">
            <a
              slot="trigger"
              className={`kbtn kbtn-ghost kbtn-sm ${mailtoHref ? '' : 'opacity-40'
                }`}
              href={mailtoHref}
              aria-disabled={!mailtoHref}
              aria-label="Email volunteers"
              onClick={event => {
                if (!mailtoHref) event.preventDefault();
              }}
            >
              <Icon name="mail" size={18} />
            </a>
          </Tooltip>
          <Tooltip content="Text volunteers">
            <a
              slot="trigger"
              className={`kbtn kbtn-ghost kbtn-sm ${smsHref ? '' : 'opacity-40'
                }`}
              href={smsHref}
              aria-disabled={!smsHref}
              aria-label="Text volunteers"
              onClick={event => {
                if (!smsHref) event.preventDefault();
              }}
            >
              <Icon name="message" size={18} />
            </a>
          </Tooltip>
        </div>
      </div>
      {!mailtoHref && !smsHref && (
        <div className="mt-2 text-xs text-base-content/60">
          Add volunteers with emails or phone numbers to enable messaging.
        </div>
      )}

      {(!initialized || (loading && !data.length)) ? (
        <div className="mt-3">
          <Loading />
        </div>
      ) : error ? (
        <div className="mt-3">
          <Error error={error} />
        </div>
      ) : data.length === 0 ? (
        <div className="mt-3 text-sm text-base-content/60">
          No volunteers have been added yet.
        </div>
      ) : (
        <>
          {mobile ? (
            <div className="mt-3 grid gap-3">
              {data.map(submission => {
                const present = submission?.values?.[FIELD_PRESENT] === 'Yes';
                const values = getVolunteerValues(submission, volunteerDetails);
                const name = formatVolunteerName(values);
                return (
                  <div
                    key={submission.id}
                    className="rounded-box border bg-base-100 p-3"
                    onClick={() => openVolunteerDetail(submission)}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {name || 'Volunteer'}
                      {isGlutenFree(values) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                          <Icon name="bread-off" size={13} />
                          Gluten Free
                        </span>
                      )}
                      {noPhotoConsent(values) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-xs font-medium text-error">
                          <Icon name="camera-off" size={13} />
                          No Photo
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-base-content/70">
                      <div>
                        <span className="font-medium text-base-content/80">
                          Email:
                        </span>{' '}
                        {values[FIELD_EMAIL] || '—'}
                      </div>
                      <div>
                        <span className="font-medium text-base-content/80">
                          Phone:
                        </span>{' '}
                        {formatPhone(values[FIELD_PHONE]) || '—'}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className={`kbtn kbtn-sm gap-1.5 ${present ? 'kbtn-success' : 'kbtn-outline'}`}
                        onClick={event => {
                          event.stopPropagation();
                          handleTogglePresent(submission);
                        }}
                        disabled={!!saving[submission.id]}
                      >
                        {saving[submission.id] ? (
                          'Saving...'
                        ) : present ? (
                          <>
                            <Icon name="circle-check" size={16} />
                            Present
                          </>
                        ) : (
                          <>
                            <Icon name="circle-dashed" size={16} />
                            Mark Present
                          </>
                        )}
                      </button>
                      {canRemove && (
                        <button
                          type="button"
                          className="kbtn kbtn-sm kbtn-ghost text-error"
                          onClick={event => {
                            event.stopPropagation();
                            handleRemoveVolunteer(submission);
                          }}
                          disabled={!!saving[submission.id]}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {volunteerDetailsLoading && (
                <div className="text-xs text-base-content/60">
                  Loading volunteer details...
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-box border bg-base-100">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-base-200 text-xs uppercase tracking-wide text-base-content/70">
                  <tr>
                    <th className="px-4 py-2">Volunteer</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Attendance</th>
                    {canRemove && <th className="px-4 py-2 w-12"></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map(submission => {
                    const present =
                      submission?.values?.[FIELD_PRESENT] === 'Yes';
                    const values = getVolunteerValues(
                      submission,
                      volunteerDetails,
                    );
                    const name = formatVolunteerName(values);
                    return (
                      <tr
                        key={submission.id}
                        className="border-t border-base-200"
                        onClick={() => openVolunteerDetail(submission)}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2 font-medium">
                            {name || 'Volunteer'}
                            {isGlutenFree(values) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                                <Icon name="bread-off" size={13} />
                                Gluten Free
                              </span>
                            )}
                            {noPhotoConsent(values) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-xs font-medium text-error">
                                <Icon name="camera-off" size={13} />
                                No Photo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {values[FIELD_EMAIL] || '—'}
                        </td>
                        <td className="px-4 py-2">
                          {formatPhone(values[FIELD_PHONE]) || '—'}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className={`kbtn kbtn-sm gap-1.5 ${present ? 'kbtn-success' : 'kbtn-outline'}`}
                            onClick={event => {
                              event.stopPropagation();
                              handleTogglePresent(submission);
                            }}
                            disabled={!!saving[submission.id]}
                          >
                            {saving[submission.id] ? (
                              'Saving...'
                            ) : present ? (
                              <>
                                <Icon name="circle-check" size={16} />
                                Present
                              </>
                            ) : (
                              <>
                                <Icon name="circle-dashed" size={16} />
                                Mark Present
                              </>
                            )}
                          </button>
                        </td>
                        {canRemove && (
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              className="kbtn kbtn-sm kbtn-ghost text-error kbtn-circle"
                              onClick={event => {
                                event.stopPropagation();
                                handleRemoveVolunteer(submission);
                              }}
                              disabled={!!saving[submission.id]}
                              aria-label="Remove volunteer"
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {volunteerDetailsLoading && (
                <div className="px-4 py-2 text-xs text-base-content/60">
                  Loading volunteer details...
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="mt-6 rounded-box border bg-base-100/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-wide text-base-content/60">
            Add A Volunteer
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="relative">
            <label className="kinput w-full">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Search volunteers by name"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
              />
            </label>

            {isSearchReady && (
              <div className="absolute left-0 right-0 z-20 mt-1 rounded-box border bg-base-100 shadow">
                <div className="max-h-56 overflow-auto p-2">
                  {searchLoading && (
                    <div className="text-xs text-base-content/60">
                      Searching...
                    </div>
                  )}
                  {!searchLoading &&
                    searchInitialized &&
                    searchResults.length === 0 && (
                      <div className="flex flex-col gap-2 text-xs text-base-content/60">
                        <div>No volunteers found.</div>
                        <button
                          type="button"
                          className="kbtn kbtn-ghost kbtn-sm w-fit"
                          onClick={() => {
                            setNewVolunteerValues(v => ({ ...v, lastName: searchTermTrimmed }));
                            setNewVolunteerOpen(true);
                          }}
                        >
                          Add New Volunteer
                        </button>
                      </div>
                    )}
                  {!searchLoading && searchResults.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {searchResults.map(result => {
                        const values = result.values || {};
                        const id = getVolunteerIdFromSubmission(result);
                        const name = formatVolunteerName(values);
                        const email = values[FIELD_EMAIL];
                        const phone = values[FIELD_PHONE];
                        return (
                          <button
                            key={result.id}
                            type="button"
                            className="kbtn kbtn-ghost justify-start"
                            onClick={() => handleAddVolunteer(id)}
                            disabled={adding}
                          >
                            <span className="font-medium">
                              {name || 'Volunteer'}
                            </span>
                            {email && (
                              <span className="ml-2 text-xs text-base-content/60">
                                {email}
                              </span>
                            )}
                            {phone && (
                              <span className="ml-2 text-xs text-base-content/60">
                                {formatPhone(phone)}
                              </span>
                            )}
                            <span className="ml-auto text-xs font-semibold">
                              Add
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={newVolunteerOpen}
        onOpenChange={({ open }) => setNewVolunteerOpen(open)}
        title="Add New Volunteer"
        size="md"
      >
        <div slot="body">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  First Name
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered w-full"
                  value={newVolunteerValues.firstName}
                  onChange={event =>
                    setNewVolunteerValues(values => ({
                      ...values,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  Last Name <span className="text-error">*</span>
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered w-full"
                  required
                  value={newVolunteerValues.lastName}
                  onChange={event =>
                    setNewVolunteerValues(values => ({
                      ...values,
                      lastName: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className="klabel flex flex-col items-start gap-2">
              <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                Email
              </span>
              <input
                type="email"
                className="kinput kinput-bordered w-full"
                placeholder="mail@site.com"
                value={newVolunteerValues.email}
                onChange={event =>
                  setNewVolunteerValues(values => ({
                    ...values,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="klabel flex flex-col items-start gap-2">
              <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                Phone
              </span>
              <input
                type="tel"
                className="kinput kinput-bordered w-full"
                placeholder="(555) 555-5555"
                value={newVolunteerValues.phone}
                onChange={event =>
                  setNewVolunteerValues(values => ({
                    ...values,
                    phone: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </div>
        <div slot="footer" className="flex-ee gap-2">
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={handleCreateNewVolunteer}
            disabled={creatingVolunteer}
          >
            {creatingVolunteer ? 'Adding...' : 'Add Volunteer'}
          </button>
          <button
            type="button"
            className="kbtn kbtn-ghost"
            onClick={() => setNewVolunteerOpen(false)}
            disabled={creatingVolunteer}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <VolunteerDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        volunteer={detailVolunteer}
      />
    </div>
    </div>
  );
};

Volunteers.propTypes = {
  project: t.object,
};
