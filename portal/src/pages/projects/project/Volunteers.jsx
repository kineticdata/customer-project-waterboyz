import t from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
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

const RELATIONSHIP_FORM = 'swat-project-volunteers';
const VOLUNTEERS_FORM = 'volunteers';
const FIELD_PROJECT_ID = 'Project ID';
const FIELD_VOLUNTEER_ID = 'Volunteer ID';
const FIELD_PRESENT = 'Present';
const FIELD_FIRST_NAME = 'First Name';
const FIELD_LAST_NAME = 'Last Name';
const FIELD_EMAIL = 'Email Address';
const FIELD_PHONE = 'Phone Number';

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

const getVolunteerIdFromSubmission = submission =>
  submission?.values?.[FIELD_VOLUNTEER_ID] || submission?.id;

const formatVolunteerName = values =>
  [values?.[FIELD_FIRST_NAME], values?.[FIELD_LAST_NAME]]
    .filter(Boolean)
    .join(' ');

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

const getVolunteerValues = (submission, volunteerDetails) => {
  const id = getVolunteerIdFromSubmission(submission);
  return (
    volunteerDetails.get(id) ||
    volunteerDetails.get(submission?.values?.[FIELD_VOLUNTEER_ID]) ||
    volunteerDetails.get(submission?.id) ||
    {}
  );
};

export const Volunteers = ({ project }) => {
  const { kappSlug } = useSelector(state => state.app);
  const mobile = useSelector(state => state.view.mobile);
  const projectId = project?.id;
  const [searchTerm, setSearchTerm] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState({});
  const [newVolunteerOpen, setNewVolunteerOpen] = useState(false);
  const [creatingVolunteer, setCreatingVolunteer] = useState(false);
  const [newVolunteerValues, setNewVolunteerValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const searchTermTrimmed = searchTerm.trim();
  const isSearchReady = searchTermTrimmed.length >= 2;

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

  const data = response?.submissions || [];
  const error = response?.error;

  const volunteerIds = useMemo(
    () => data.map(item => item?.values?.[FIELD_VOLUNTEER_ID]).filter(Boolean),
    [data],
  );

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

  const searchResults = useMemo(() => {
    const results = searchResponse?.submissions || [];
    if (volunteerIds.length === 0) return results;
    const existingIds = new Set(volunteerIds);
    return results.filter(result => {
      const id = getVolunteerIdFromSubmission(result);
      return id && !existingIds.has(id);
    });
  }, [searchResponse, volunteerIds]);

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
          [FIELD_PRESENT]: 'No',
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

  const handleCreateNewVolunteer = useCallback(async () => {
    if (!projectId) return;
    const firstName = newVolunteerValues.firstName.trim();
    const lastName = newVolunteerValues.lastName.trim();
    const email = newVolunteerValues.email.trim();
    const phone = newVolunteerValues.phone.trim();

    if (!firstName && !lastName) {
      toastError({ title: 'Enter at least a first or last name.' });
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

  const mailtoHref =
    volunteerContacts.emails.length > 0
      ? `mailto:${volunteerContacts.emails.join(',')}`
      : '';
  const userAgent =
    typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  const smsHref = buildSmsHref(volunteerContacts.phones, userAgent);

  return (
    <div className="rounded-box border bg-base-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-semibold">Volunteers</div>
        <div className="flex items-center gap-2">
          <Tooltip content="Email volunteers">
            <a
              slot="trigger"
              className={`kbtn kbtn-ghost kbtn-sm ${
                mailtoHref ? '' : 'opacity-40'
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
              className={`kbtn kbtn-ghost kbtn-sm ${
                smsHref ? '' : 'opacity-40'
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

      {!initialized || (loading && !data.length) ? (
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
                  >
                    <div className="text-sm font-semibold">
                      {name || 'Volunteer'}
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
                      <div>
                        <span className="font-medium text-base-content/80">
                          Present:
                        </span>{' '}
                        {present ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        className="kbtn kbtn-ghost kbtn-sm"
                        onClick={() => handleTogglePresent(submission)}
                        disabled={!!saving[submission.id]}
                      >
                        {saving[submission.id]
                          ? 'Saving...'
                          : present
                            ? 'Mark Not Present'
                            : 'Mark Present'}
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
                    <th className="px-4 py-2">Present</th>
                    <th className="px-4 py-2">Actions</th>
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
                      >
                        <td className="px-4 py-2">
                          <div className="font-medium">
                            {name || 'Volunteer'}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {values[FIELD_EMAIL] || '—'}
                        </td>
                        <td className="px-4 py-2">
                          {values[FIELD_PHONE] || '—'}
                        </td>
                        <td className="px-4 py-2">
                          {present ? (
                            <Icon
                              name="check"
                              size={18}
                              className="text-success"
                            />
                          ) : (
                            <Icon
                              name="x"
                              size={18}
                              className="text-error"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className="kbtn kbtn-ghost kbtn-sm"
                            onClick={() => handleTogglePresent(submission)}
                            disabled={!!saving[submission.id]}
                          >
                            {saving[submission.id]
                              ? 'Saving...'
                              : present
                                ? 'Mark Not Present'
                                : 'Mark Present'}
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
              <label className="form-control">
                <span className="label-text text-xs uppercase tracking-wide text-base-content/60">
                  First Name
                </span>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newVolunteerValues.firstName}
                  onChange={event =>
                    setNewVolunteerValues(values => ({
                      ...values,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form-control">
                <span className="label-text text-xs uppercase tracking-wide text-base-content/60">
                  Last Name
                </span>
                <input
                  type="text"
                  className="input input-bordered"
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
            <label className="form-control">
              <span className="label-text text-xs uppercase tracking-wide text-base-content/60">
                Email Address
              </span>
              <input
                type="email"
                className="input input-bordered"
                value={newVolunteerValues.email}
                onChange={event =>
                  setNewVolunteerValues(values => ({
                    ...values,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs uppercase tracking-wide text-base-content/60">
                Phone Number
              </span>
              <input
                type="tel"
                className="input input-bordered"
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
            className="kbtn kbtn-ghost"
            onClick={() => setNewVolunteerOpen(false)}
            disabled={creatingVolunteer}
          >
            Cancel
          </button>
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={handleCreateNewVolunteer}
            disabled={creatingVolunteer}
          >
            {creatingVolunteer ? 'Adding...' : 'Add Volunteer'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

Volunteers.propTypes = {
  project: t.object,
};
