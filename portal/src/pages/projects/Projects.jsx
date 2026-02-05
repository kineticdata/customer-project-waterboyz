import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { ProjectsList } from './ProjectsList.jsx';
import { Project } from './project/Project.jsx';
import { usePaginatedData } from '../../helpers/hooks/usePaginatedData.js';
import { ProjectCaptain } from './ProjectCaptain.jsx';

const buildProjectsSearch = (profile, filters) => {
  // Start query builder
  const search = defineKqlQuery();

  // Add core state query if filtering by either status
  if (filters.status.open || filters.status.closed) {
    search.in('coreState', 'statuses');
  }

  // Add assignment query when at least one assignment filter is enabled
  if (filters.assignment.mine || filters.assignment.teams) {
    search.or();
    if (filters.assignment.mine) {
      search.equals('values[Project Captain]', 'username');
    }
    if (filters.assignment.teams) {
      search.in('values[Assigned Team]', 'teams');
    }
    // End or block
    search.end();
  }
  // End query builder
  search.end();

  return {
    q: search.end()({
      types: ['Approval', 'Task'],
      statuses: [
        filters.status.open && 'Draft',
        filters.status.closed && 'Submitted',
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

  // Set Projects Form Slug
  const formSlug = 'swat-projects';

  // State for filters
  const [filters, setFilters] = useState({
    status: { open: false, closed: false },
    assignment: { mine: true},
  });

  // Parameters for the query (if null, the query will not run)
  const params = useMemo(
    () => ({ kapp: kappSlug, form: formSlug, search: buildProjectsSearch(profile, filters) }),
    [kappSlug, formSlug, profile, filters],
  );

  // Retrieve the data for the projects list
  const { initialized, loading, response, pageNumber, actions } =
    usePaginatedData(searchSubmissions, params);

  return (
    <Routes>
      <Route path=":submissionId/captain" element={<ProjectCaptain />} />
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
          />
        }
      />
    </Routes>
  );
};
