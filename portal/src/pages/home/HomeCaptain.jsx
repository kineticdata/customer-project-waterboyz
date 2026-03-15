import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { HomeHero } from '../../components/home/HomeHero.jsx';
import { HomeSection } from '../../components/home/HomeSection.jsx';
import { ActivityList, Shortcuts, WorkList } from './Home.jsx';

const activeProjectsQuery = defineKqlQuery()
  .equals('values[Project Captain]', 'username')
  .in('values[Project Status]', 'statuses')
  .end();

const fetchMyProjects = ({ kappSlug, username }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'swat-projects',
    search: {
      q: activeProjectsQuery({
        username,
        statuses: ['Scheduled', 'In Progress', 'Active'],
      }),
      include: ['details', 'values'],
      limit: 5,
    },
  });

const statusBadgeClass = status => {
  switch (status) {
    case 'In Progress':
    case 'Active':
      return 'badge badge-primary badge-sm';
    case 'Scheduled':
      return 'badge badge-info badge-sm';
    default:
      return 'badge badge-ghost badge-sm';
  }
};

export const HomeCaptain = () => {
  const { profile, kappSlug } = useSelector(state => state.app);

  const projectParams = useMemo(
    () => ({ kappSlug, username: profile?.username }),
    [kappSlug, profile?.username],
  );
  const { initialized, response } = useData(fetchMyProjects, projectParams);
  const projects = response?.submissions ?? [];

  return (
    <div className="flex-c-st gap-0 pb-24 md:pb-8">
      <HomeHero
        eyebrow="Project Captain"
        title={profile?.displayName}
        subtitle="Manage your projects and keep your team moving."
      />

      <HomeSection title="My Projects" viewAllTo="/project-captains">
        {!initialized ? (
          <div className="bg-base-100 rounded-box border border-base-200 p-6">
            <Loading />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-base-100 rounded-box border border-base-200 px-5 py-8 text-center">
            <Icon
              name="clipboard-list"
              size={36}
              className="mx-auto text-base-content/20 mb-3"
            />
            <p className="text-base-content/50 font-medium text-sm">
              No active projects.
            </p>
          </div>
        ) : (
          <ul className="bg-base-100 rounded-box border border-base-200 overflow-hidden divide-y divide-base-200">
            {projects.map(project => (
              <li key={project.id}>
                <Link
                  to={`/project-captains/${project.id}`}
                  className="flex-sc gap-3 px-4 py-3.5 hover:bg-base-200/50 transition-colors"
                >
                  <div className="flex-cc w-9 h-9 rounded-lg bg-primary/10 text-primary flex-none">
                    <Icon name="tool" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {project.values?.['Project Name'] || 'Unnamed Project'}
                    </p>
                    <p className="text-xs text-base-content/50 mt-0.5 line-clamp-1">
                      {project.values?.['City']
                        ? `${project.values['City']}, ${project.values['State'] || ''}`
                        : project.values?.['Address Line 1'] || ''}
                    </p>
                  </div>
                  <span className={statusBadgeClass(project.values?.['Project Status'])}>
                    {project.values?.['Project Status'] || 'Active'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </HomeSection>

      <HomeSection title="My Tasks" viewAllTo="/actions">
        <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
          <WorkList limit={3} />
        </div>
      </HomeSection>

      <HomeSection title="My Nominations" viewAllTo="/nominations">
        <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
          <ActivityList limit={3} />
        </div>
      </HomeSection>

      <Shortcuts className="gutter mt-8 md:mt-10 pb-4" />
    </div>
  );
};
