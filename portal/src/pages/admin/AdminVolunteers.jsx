import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { searchSubmissions } from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { useData } from '../../helpers/hooks/useData.js';
import { Loading } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';

const FORM_SLUG = 'volunteers';

const truncate = (str, max = 60) => {
  if (!str) return '—';
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
};

const parseSkillAreas = value => {
  if (!value) return '—';
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return truncate(parsed.join(', '));
  } catch {
    // not JSON, return as-is
  }
  return truncate(value);
};

export const AdminVolunteers = () => {
  const { kappSlug } = useSelector(state => state.app);

  const params = useMemo(
    () => ({
      kapp: kappSlug,
      form: FORM_SLUG,
      search: {
        include: ['details', 'values'],
        limit: 100,
      },
    }),
    [kappSlug],
  );

  const { initialized, loading, response } = useData(searchSubmissions, params);

  const isLoading = !initialized || (loading && !response);
  const volunteers = response?.submissions ?? [];

  return (
    <div className="max-w-screen-lg pt-1 pb-6">
      <PageHeading title="Admin / Volunteers" backTo="/admin" />

      {isLoading ? (
        <Loading />
      ) : response?.error ? (
        <Error error={response.error} />
      ) : (
        <div className="rounded-box border bg-base-100 overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Skill Areas</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-base-content/50 py-8"
                  >
                    No volunteers found.
                  </td>
                </tr>
              ) : (
                volunteers.map(v => {
                  const username = v.values?.['Username'];
                  const nameCell = username ? (
                    <Link
                      to={`/profile/${username}`}
                      className="link link-hover"
                    >
                      {v.values?.['First Name'] || '—'}
                    </Link>
                  ) : (
                    v.values?.['First Name'] || '—'
                  );

                  return (
                    <tr key={v.id}>
                      <td>{nameCell}</td>
                      <td>{v.values?.['Last Name'] || '—'}</td>
                      <td>{v.values?.['Email Address'] || '—'}</td>
                      <td>{v.values?.['Phone Number'] || '—'}</td>
                      <td className="text-sm text-base-content/70">
                        {parseSkillAreas(v.values?.['Skill Areas'])}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
