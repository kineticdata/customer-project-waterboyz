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
const FIELD_ADDITIONAL_VOLUNTEERS = 'Additional Volunteers Needed';

// Build the KQL search used by the typeahead to find volunteers by last name.
// We keep this narrow for performance and predictable ordering.
const buildVolunteerSearch = term => {
  const search = defineKqlQuery();
  search.startsWith(`values[${FIELD_LAST_NAME}]`, 'term');

  return {
    q: search.end()({ term }),
    orderBy: `values[${FIELD_LAST_NAME}]`,
    include: ['details', 'values'],
    limit: 20,
  };
};

// Build the KQL search to list volunteers already associated to a project.
const buildVolunteersSearch = projectId => {
  const search = defineKqlQuery();
  search.equals(`values[${FIELD_PROJECT_ID}]`, 'projectId');
  search.end();

  return {
    q: search.end()({ projectId }),
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
  const data = response?.submissions || [];
  const error = response?.error;

  // IDs of volunteers already associated with this project.
  const volunteerIds = useMemo(
    () => data.map(item => item?.values?.[FIELD_VOLUNTEER_ID]).filter(Boolean),
    [data],
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

  // Typeahead search parameters (only when at least 2 chars are entered).
  const volunteerSearchParams = useMemo(
    () =>
      isSearchReady
        ? {
          kapp: kappSlug,
          form: VOLUNTEERS_FORM,
          search: buildVolunteerSearch(searchTermTrimmed),
        }
        : null,
    [isSearchReady, kappSlug, searchTermTrimmed],
  );

  const {
    initialized: searchInitialized,
    loading: searchLoading,
    response: searchResponse,
  } = useData(searchSubmissions, volunteerSearchParams);

  // Filter search results to exclude volunteers already associated.
  const searchResults = useMemo(() => {
    const results = searchResponse?.submissions || [];
    if (volunteerIds.length === 0) return results;
    const existingIds = new Set(volunteerIds);
    return results.filter(result => {
      const id = getVolunteerIdFromSubmission(result);
      return id && !existingIds.has(id);
    });
  }, [searchResponse, volunteerIds]);

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
        reloadData();
      }

      setSaving(s => ({ ...s, [submission.id]: false }));
    },
    [reloadData],
  );

  // Create the relationship submission to add a volunteer to this project.
  const handleAddVolunteer = useCallback(
    async volunteerId => {
      if (!projectId || !volunteerId) return;
      setAdding(true);
      const result = await createSubmission({
        kappSlug,
        formSlug: RELATIONSHIP_FORM,
        values: {
          [FIELD_PROJECT_ID]: projectId,
          [FIELD_VOLUNTEER_ID]: volunteerId,
          [FIELD_PRESENT]: 'No'
        },
      });

      if (result?.error) {
        toastError({
          title: 'Unable to add volunteer',
          description: result.error.message,
        });
      } else {
        toastSuccess({ title: 'Volunteer added' });
        setSearchTerm('');
        reloadData();
      }
      setAdding(false);
    },
    [kappSlug, projectId, reloadData],
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
        [FIELD_PRESENT]: 'No'
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
    reloadData();
    setCreatingVolunteer(false);
  }, [kappSlug, newVolunteerValues, projectId, reloadData]);

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
              If set to "No," volunteers won't see this project or receive it in
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
                        {values[FIELD_PHONE] || '—'}
                      </div>
                    </div>
                    <div className="mt-3">
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
                          {values[FIELD_PHONE] || '—'}
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
                placeholder="Search volunteers by LAST NAME"
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
                          onClick={() => setNewVolunteerOpen(true)}
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
                            <span className="ml-2 text-xs text-base-content/60">
                              {id}
                            </span>
                            {email && (
                              <span className="ml-2 text-xs text-base-content/60">
                                {email}
                              </span>
                            )}
                            {phone && (
                              <span className="ml-2 text-xs text-base-content/60">
                                {phone}
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
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="kinput kvalidator">
                First Name
                <input
                  type="text"
                  required="true"
                  className="grow"
                  value={newVolunteerValues.firstName}
                  onChange={event =>
                    setNewVolunteerValues(values => ({
                      ...values,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="kinput kvalidator">
                Last Name
                <input
                  type="text"
                  required="true"
                  className="grow"
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
            <label className="kinput kvalidator">
              <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </g>
              </svg>
              <input
                type="email"
                placeholder="mail@site.com"
                className="input input-bordered"
                title="Enter valid email address"
                value={newVolunteerValues.email}
                onChange={event =>
                  setNewVolunteerValues(values => ({
                    ...values,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="kinput kvalidator">
              <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                <g fill="none">
                  <path
                    d="M7.25 11.5C6.83579 11.5 6.5 11.8358 6.5 12.25C6.5 12.6642 6.83579 13 7.25 13H8.75C9.16421 13 9.5 12.6642 9.5 12.25C9.5 11.8358 9.16421 11.5 8.75 11.5H7.25Z"
                    fill="currentColor"
                  ></path>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6 1C4.61929 1 3.5 2.11929 3.5 3.5V12.5C3.5 13.8807 4.61929 15 6 15H10C11.3807 15 12.5 13.8807 12.5 12.5V3.5C12.5 2.11929 11.3807 1 10 1H6ZM10 2.5H9.5V3C9.5 3.27614 9.27614 3.5 9 3.5H7C6.72386 3.5 6.5 3.27614 6.5 3V2.5H6C5.44771 2.5 5 2.94772 5 3.5V12.5C5 13.0523 5.44772 13.5 6 13.5H10C10.5523 13.5 11 13.0523 11 12.5V3.5C11 2.94772 10.5523 2.5 10 2.5Z"
                    fill="currentColor"
                  ></path>
                </g>
              </svg>
              <input
                type="tel"
                className="ktabular-nums"
                value={newVolunteerValues.phone}
                onChange={event =>
                  setNewVolunteerValues(values => ({
                    ...values,
                    phone: event.target.value,
                  }))
                }
                placeholder="Phone"
                pattern="[0-9]*"
                minLength="10"
                maxLength="10"
                title="Must be 10 digits"
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
