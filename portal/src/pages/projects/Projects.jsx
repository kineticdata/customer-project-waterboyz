import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { ProjectsList } from './ProjectsList.jsx';
import { Project } from './project/Project.jsx';
import { usePaginatedData } from '../../helpers/hooks/usePaginatedData.js';

const ALLOWED_TEAMS = ['SWAT Leadership', 'SWAT Project Captains'];

const buildProjectsSearch = (profile, filters, isLeadership) => {
  const search = defineKqlQuery();

  if (filters.status.open || filters.status.closed) {
    search.in('coreState', 'statuses');
  }

  // Captains always see only their own projects;
  // Leadership can optionally filter to their own
  if (!isLeadership || filters.assignment.mine) {
    search.equals('values[Project Captain]', 'username');
  }

  search.end();

  return {
    q: search.end()({
      statuses: [
        filters.status.open && 'Submitted',
        filters.status.closed && 'Closed',
      ].filter(Boolean),
      username: profile.username,
    }),
    include: ['details', 'values', 'form', 'form.attributesMap'],
    limit: 10,
  };
};

export const Projects = () => {
  const { profile, kappSlug } = useSelector(state => state.app);

  const hasAccess = profile?.memberships?.some(({ team }) =>
    ALLOWED_TEAMS.includes(team.name),
  );
  const isLeadership = profile?.memberships?.some(
    ({ team }) => team.name === 'SWAT Leadership',
  );

  // Set Projects Form Slug
  const formSlug = 'swat-projects';

  // State for filters — captains don't get assignment filters
  const [filters, setFilters] = useState({
    status: { open: true, closed: false },
    assignment: { mine: !isLeadership },
  });

  // Parameters for the query (if null, the query will not run)
  const params = useMemo(
    () => ({ kapp: kappSlug, form: formSlug, search: buildProjectsSearch(profile, filters, isLeadership) }),
    [kappSlug, formSlug, profile, filters, isLeadership],
  );

  // Retrieve the data for the projects list
  const { initialized, loading, response, pageNumber, actions } =
    usePaginatedData(searchSubmissions, params);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route
        path=":submissionId/*"
        element={<Project />}
      />
      <Route
        path="*"
        element={
          <ProjectsList
            listData={{
              initialized,
              loading,
              data: response?.submissions,
              error: response?.error,
              pageNumber,
            }}
            listActions={actions}
            filters={filters}
            setFilters={setFilters}
            isLeadership={isLeadership}
          />
        }
      />
    </Routes>
  );
};
