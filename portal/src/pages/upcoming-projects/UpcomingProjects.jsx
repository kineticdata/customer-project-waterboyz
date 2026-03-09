import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route } from 'react-router-dom';
import { useData } from '../../helpers/hooks/useData.js';
import { executeIntegration } from '../../helpers/api.js';
import { UpcomingProjectsList } from './UpcomingProjectsList.jsx';
import { UpcomingProjectDetail } from './UpcomingProjectDetail.jsx';

const fetchUpcomingProjects = ({ kappSlug }) =>
  executeIntegration({
    kappSlug,
    integrationName: 'Upcoming SWAT Projects',
  });

export const UpcomingProjects = () => {
  const { kappSlug } = useSelector(state => state.app);

  const params = useMemo(() => ({ kappSlug }), [kappSlug]);
  const { initialized, loading, response } = useData(fetchUpcomingProjects, params);

  // Integration returns { Projects: [...], Error: "..." }
  // Each project has flat keys: "Project Id", "Project Name", etc.
  const projects = response?.Projects ?? [];
  const error = response?.Error
    ? { message: response.Error }
    : response?.error;

  return (
    <Routes>
      <Route
        path=":projectId"
        element={
          <UpcomingProjectDetail
            projects={projects}
            loading={loading}
            error={error}
          />
        }
      />
      <Route
        path="*"
        element={
          <UpcomingProjectsList
            initialized={initialized}
            loading={loading}
            projects={projects}
            error={error}
          />
        }
      />
    </Routes>
  );
};
