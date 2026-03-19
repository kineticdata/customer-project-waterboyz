import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useEffect, useMemo } from 'react';
import { Icon } from '../../atoms/Icon.jsx';
import { Error } from '../../components/states/Error.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { getAttributeValue } from '../../helpers/records.js';
import { appActions } from '../../helpers/state.js';
import { StatusPill } from '../../components/tickets/StatusPill.jsx';
import { HomeNominator } from './HomeNominator.jsx';
import { HomeVolunteer } from './HomeVolunteer.jsx';
import { HomeCaptain } from './HomeCaptain.jsx';
import { HomeAdmin } from './HomeAdmin.jsx';

export const Home = () => {
  const { isAdmin, hasProjectAccess, isVolunteer } = useRoles();

  if (isAdmin) return <HomeAdmin />;
  if (hasProjectAccess) return <HomeCaptain />;
  if (isVolunteer) return <HomeVolunteer />;
  return <HomeNominator />;
};

export const ActivityList = ({ limit = 5, onLoaded }) => {
  const { profile, kappSlug } = useSelector(state => state.app);
  const { username } = profile;

  const params = useMemo(
    () => ({
      kapp: kappSlug,
      search: {
        q: defineKqlQuery()
          .in('type', 'types')
          .or()
          .equals('createdBy', 'username')
          .equals('submittedBy', 'username')
          .equals('values[Requested For]', 'username')
          .end()
          .end()({ types: ['Nominations'], username }),
        include: ['details', 'form', 'form.attributesMap'],
        limit,
      },
    }),
    [kappSlug, username, limit],
  );

  const data = useData(searchSubmissions, params);
  const { error, submissions } = data.response || {};

  useEffect(() => {
    if (data.initialized && !data.loading && submissions) {
      onLoaded?.(submissions.length);
      // Keep the Redux flag in sync so the header nav stays accurate
      appActions.setHasNominations(submissions.length > 0);
    }
  }, [data.initialized, data.loading, submissions, onLoaded]);

  if (data.initialized) {
    return error ? (
      <div className="p-4">
        <Error error={error} />
      </div>
    ) : data.loading ? (
      <div className="p-6">
        <Loading />
      </div>
    ) : (
      <ul className="divide-y divide-base-200">
        {submissions?.map(submission => (
          <li key={submission.id} className="relative">
            <Link
              to={`/nominations/${submission.id}${submission.coreState === 'Draft' ? '/edit' : ''}`}
              className="flex-sc gap-3 px-4 py-3.5 hover:bg-base-200/50 transition-colors"
            >
              <div className="flex-cc w-9 h-9 rounded-lg bg-base-200 flex-none">
                <Icon
                  name={getAttributeValue(
                    submission?.form,
                    'Icon',
                    'checklist',
                  )}
                  size={18}
                />
              </div>
              <span className="flex-1 line-clamp-1 text-sm font-medium">
                {submission.label}
              </span>
              <StatusPill status={submission.coreState} />
            </Link>
          </li>
        ))}
        {submissions?.length === 0 && (
          <li className="px-4 py-8 text-center text-base-content/50 text-sm">
            No recent activity
          </li>
        )}
      </ul>
    );
  }
};

export const WorkList = ({ limit = 5 }) => {
  const { profile, kappSlug } = useSelector(state => state.app);
  const { username, memberships } = profile;

  const params = useMemo(
    () => ({
      kapp: kappSlug,
      search: {
        q: defineKqlQuery()
          .in('type', 'types')
          .or()
          .equals('values[Assigned Individual]', 'username')
          .in('values[Assigned Team]', 'teams')
          .end()
          .end()({
          types: ['Approval', 'Task'],
          username,
          teams: memberships.map(({ team }) => team.name),
        }),
        include: ['details', 'form', 'form.attributesMap'],
        limit,
      },
    }),
    [kappSlug, username, memberships, limit],
  );

  const data = useData(searchSubmissions, params);
  const { error, submissions } = data.response || {};

  if (data.initialized) {
    return error ? (
      <div className="p-4">
        <Error error={error} />
      </div>
    ) : data.loading ? (
      <div className="p-6">
        <Loading />
      </div>
    ) : (
      <ul className="divide-y divide-base-200">
        {submissions?.map(submission => (
          <li key={submission.id} className="relative">
            <Link
              to={`/actions/${submission.id}`}
              className="flex-sc gap-3 px-4 py-3.5 hover:bg-base-200/50 transition-colors"
            >
              <div className="flex-cc w-9 h-9 rounded-lg bg-base-200 flex-none">
                <Icon
                  name={getAttributeValue(
                    submission?.form,
                    'Icon',
                    'checklist',
                  )}
                  size={18}
                />
              </div>
              <span className="flex-1 line-clamp-1 text-sm font-medium">
                {submission.label}
              </span>
              <StatusPill
                status={submission.coreState === 'Draft' ? 'Open' : 'Closed'}
              />
            </Link>
          </li>
        ))}
        {submissions?.length === 0 && (
          <li className="px-4 py-8 text-center text-base-content/50 text-sm">
            No work items assigned
          </li>
        )}
      </ul>
    );
  }
};

