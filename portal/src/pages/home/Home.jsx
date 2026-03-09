import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useMemo } from 'react';
import { Icon } from '../../atoms/Icon.jsx';
import { Error } from '../../components/states/Error.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { sortBy } from '../../helpers/index.js';
import { useData } from '../../helpers/hooks/useData.js';
import { getAttributeValue } from '../../helpers/records.js';
import { openSearch } from '../../helpers/search.js';
import { StatusPill } from '../../components/tickets/StatusPill.jsx';

export const Home = () => {
  const { mobile } = useSelector(state => state.view);
  const { profile } = useSelector(state => state.app);

  return (
    <div className="flex-c-st gap-0 pb-24 md:pb-8">
      {/* Hero Section */}
      <div className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10 gutter py-10 md:py-16">
          <div className="max-w-screen-xl mx-auto">
            <p className="text-primary-content/60 text-sm font-medium uppercase tracking-wider mb-2">
              Welcome back
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-primary-content mb-3">
              {profile.displayName}
            </h1>
            <p className="text-primary-content/70 text-lg max-w-lg">
              Ready to make a difference? Check your projects, volunteer for new ones, or submit a request.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="gutter -mt-6 md:-mt-8 relative z-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            <button
              type="button"
              onClick={() => openSearch()}
              className={clsx(
                'group relative flex flex-col items-center gap-3 p-4 md:p-6',
                'bg-base-100 rounded-box shadow-lg border border-base-200',
                'hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer',
              )}
            >
              <div className="flex-cc w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors">
                <Icon name="heart-handshake" size={mobile ? 22 : 26} />
              </div>
              <span className="text-sm md:text-base font-semibold text-center">
                Get Involved
              </span>
            </button>
            <Link
              to="/requests"
              className={clsx(
                'group relative flex flex-col items-center gap-3 p-4 md:p-6',
                'bg-base-100 rounded-box shadow-lg border border-base-200',
                'hover:shadow-xl hover:-translate-y-0.5 transition-all',
              )}
            >
              <div className="flex-cc w-12 h-12 md:w-14 md:h-14 rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-content transition-colors">
                <Icon name="file-text" size={mobile ? 22 : 26} />
              </div>
              <span className="text-sm md:text-base font-semibold text-center">
                My Requests
              </span>
            </Link>
            <Link
              to="/actions"
              className={clsx(
                'group relative flex flex-col items-center gap-3 p-4 md:p-6',
                'bg-base-100 rounded-box shadow-lg border border-base-200',
                'hover:shadow-xl hover:-translate-y-0.5 transition-all',
              )}
            >
              <div className="flex-cc w-12 h-12 md:w-14 md:h-14 rounded-full bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-content transition-colors">
                <Icon name="clipboard-check" size={mobile ? 22 : 26} />
              </div>
              <span className="text-sm md:text-base font-semibold text-center">
                My Work
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="gutter mt-8 md:mt-10">
        <div className="max-w-screen-xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Recent Activity */}
          <div className="flex-c-st gap-4">
            <div className="flex-bc">
              <h2 className="text-lg md:text-xl font-bold">Recent Activity</h2>
              <Link
                to="/requests"
                className="text-sm text-primary font-medium hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
              <ActivityList />
            </div>
          </div>

          {/* Recent Work */}
          <div className="flex-c-st gap-4">
            <div className="flex-bc">
              <h2 className="text-lg md:text-xl font-bold">My Work</h2>
              <Link
                to="/actions"
                className="text-sm text-primary font-medium hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
              <WorkList />
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <Shortcuts className="gutter mt-8 md:mt-10 pb-4" />
    </div>
  );
};

const ActivityList = () => {
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
          .end()({ types: ['Service'], username }),
        include: ['details', 'form', 'form.attributesMap'],
        limit: 5,
      },
    }),
    [kappSlug, username],
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
              to={`/requests/${submission.id}${submission.coreState === 'Draft' ? '/edit' : ''}`}
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

const WorkList = () => {
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
        limit: 5,
      },
    }),
    [kappSlug, username, memberships],
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

const shortcutsTransform = submissions =>
  submissions
    ?.map(({ values }) => ({
      title: values['Title'],
      link: values['URL'],
      image: values['Image'],
      newTab: values['New Tab']?.includes('Yes'),
      sortOrder: parseInt(values['Sort Order'], 10) || 999,
    }))
    ?.sort(sortBy('sortOrder'));

const Shortcuts = ({ className }) => {
  const { kappSlug } = useSelector(state => state.app);

  const params = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'portal-shortcuts',
      search: {
        q: defineKqlQuery().equals('values[Status]', 'status').end()({
          status: 'Active',
        }),
        include: ['values'],
        limit: 10,
      },
    }),
    [kappSlug],
  );

  const { initialized, loading, response } = useData(searchSubmissions, params);
  const shortcuts = shortcutsTransform(response?.submissions);

  if (!initialized || loading || !shortcuts?.length) return null;

  return (
    <div className={className}>
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold mb-4">Quick Links</h2>
        <div
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {shortcuts.map((shortcut, index) => (
            <a
              key={index}
              href={shortcut.link}
              target={shortcut.newTab ? '_blank' : undefined}
              rel="noreferrer"
              className={clsx(
                'group relative flex-none w-56 md:w-64 h-36 md:h-40',
                'bg-base-300 rounded-box overflow-hidden',
                'hover:scale-[1.02] transition-transform',
              )}
            >
              {shortcut.image && (
                <img
                  src={shortcut.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-8 pb-3 px-3">
                <span className="text-white text-sm font-semibold line-clamp-2">
                  {shortcut.title}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
