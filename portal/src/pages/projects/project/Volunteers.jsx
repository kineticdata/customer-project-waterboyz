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
  search.or();
  search.equals(`values[${FIELD_VOLUNTEER_ID}]`, 'term');
  search.like(`values[${FIELD_FIRST_NAME}]`, 'term');
  search.like(`values[${FIELD_LAST_NAME}]`, 'term');
  search.like(`values[${FIELD_EMAIL}]`, 'term');
  search.like(`values[${FIELD_PHONE}]`, 'term');
  search.end();
  search.end();

  return {
    q: search.end()({ term }),
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

export const Volunteers = ({ project }) => {
  const { kappSlug } = useSelector(state => state.app);
  const projectId = project?.id;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState({});

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
    () =>
      data
        .map(item => item?.values?.[FIELD_VOLUNTEER_ID])
        .filter(Boolean),
    [data],
  );

  const volunteerDetailsParams = useMemo(
    () =>
      volunteerIds.length > 0
        ? {
            kapp: kappSlug,
            form: VOLUNTEERS_FORM,
            search: {
              q: defineKqlQuery()
                .in("id", 'volunteerIds')
                .end()({ volunteerIds }),
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
      searchTerm.trim().length >= 2
        ? {
            kapp: kappSlug,
            form: VOLUNTEERS_FORM,
            search: buildVolunteerSearch(searchTerm.trim()),
          }
        : null,
    [kappSlug, searchTerm],
  );

  const {
    initialized: searchInitialized,
    loading: searchLoading,
    response: searchResponse,
  } = useData(searchSubmissions, volunteerSearchParams);

  const searchResults = searchResponse?.submissions || [];

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

  const handleAddVolunteer = useCallback(async () => {
    if (!projectId || !selectedVolunteerId.trim()) return;
    setAdding(true);
    const result = await createSubmission({
      kapp: kappSlug,
      form: RELATIONSHIP_FORM,
      values: {
        [FIELD_PROJECT_ID]: projectId,
        [FIELD_VOLUNTEER_ID]: selectedVolunteerId.trim(),
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
      setSelectedVolunteerId('');
      setSearchTerm('');
      reloadData();
    }
    setAdding(false);
  }, [kappSlug, projectId, selectedVolunteerId, reloadData]);

  const volunteerContacts = useMemo(() => {
    const emailSet = new Set();
    const phoneSet = new Set();

    volunteerIds.forEach(id => {
      const values = volunteerDetails.get(id);
      if (!values) return;
      const email = values[FIELD_EMAIL];
      const phone = values[FIELD_PHONE];
      if (email) emailSet.add(email);
      if (phone) phoneSet.add(String(phone).replace(/[^\d+]/g, ''));
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
  const smsSeparator = (() => {
    if (typeof navigator === 'undefined') return ',';
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    return isIOS ? ',' : ';';
  })();
  const smsHref =
    volunteerContacts.phones.length > 0
      ? `sms:${volunteerContacts.phones.join(smsSeparator)}`
      : '';

  return (
    <div className="rounded-box border bg-base-100 p-6">
      <div className="text-lg font-semibold">Volunteers</div>
      <p className="mt-2 text-base-content/70">
        Crew assignments, attendance, and contact info.
      </p>

      <div className="mt-4 rounded-box border bg-base-100/60 p-4">
        <div className="text-xs uppercase tracking-wide text-base-content/60">
          Add Volunteer
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            type="text"
            className="input input-bordered"
            placeholder="Search volunteers by name, email, phone, or ID"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={handleAddVolunteer}
            disabled={adding || !selectedVolunteerId.trim()}
          >
            {adding ? 'Adding...' : 'Add Volunteer'}
          </button>
        </div>
        {searchTerm.trim().length > 0 && (
          <div className="mt-3 rounded-box border bg-base-100 p-2">
            {searchLoading && (
              <div className="text-xs text-base-content/60">Searching...</div>
            )}
            {!searchLoading &&
              searchInitialized &&
              searchResults.length === 0 && (
                <div className="text-xs text-base-content/60">
                  No volunteers found.
                </div>
              )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="flex flex-col gap-1">
                {searchResults.map(result => {
                  const values = result.values || {};
                  const id = values[FIELD_VOLUNTEER_ID] || result.id;
                  const name = [values[FIELD_FIRST_NAME], values[FIELD_LAST_NAME]]
                    .filter(Boolean)
                    .join(' ');
                  const email = values[FIELD_EMAIL];
                  const phone = values[FIELD_PHONE];
                  return (
                    <button
                      key={result.id}
                      type="button"
                      className={`kbtn kbtn-ghost justify-start ${
                        selectedVolunteerId === id ? 'kbtn-neutral' : ''
                      }`}
                      onClick={() => setSelectedVolunteerId(id)}
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-box border bg-base-100/60 p-4">
        <div className="text-xs uppercase tracking-wide text-base-content/60">
          Volunteers
        </div>

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
                  const present = submission?.values?.[FIELD_PRESENT] === 'Yes';
                  const id =
                    submission?.values?.[FIELD_VOLUNTEER_ID] || submission?.id;
                  const values =
                    volunteerDetails.get(id) ||
                    volunteerDetails.get(submission?.values?.[FIELD_VOLUNTEER_ID]) ||
                    volunteerDetails.get(submission?.id) ||
                    {};
                  const name = [values[FIELD_FIRST_NAME], values[FIELD_LAST_NAME]]
                    .filter(Boolean)
                    .join(' ');
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
                        {present ? 'Yes' : 'No'}
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
      </div>

      <div className="mt-6 rounded-box border bg-base-100/60 p-4">
        <div className="text-xs uppercase tracking-wide text-base-content/60">
          Message Volunteers
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            className="kbtn kbtn-ghost"
            href={mailtoHref}
            aria-disabled={!mailtoHref}
            onClick={event => {
              if (!mailtoHref) event.preventDefault();
            }}
          >
            Send an Email
          </a>
          <a
            className="kbtn kbtn-ghost"
            href={smsHref}
            aria-disabled={!smsHref}
            onClick={event => {
              if (!smsHref) event.preventDefault();
            }}
          >
            Send a Text
          </a>
        </div>
        {!mailtoHref && !smsHref && (
          <div className="mt-2 text-xs text-base-content/60">
            Add volunteers with emails or phone numbers to enable messaging.
          </div>
        )}
      </div>
    </div>
  );
};

Volunteers.propTypes = {
  project: t.object,
};
