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

const fetchCaptains = ({ kappSlug }) =>
  executeIntegration({
    kappSlug,
    integrationName: 'Project Captains Retrieve',
  });

export const UpcomingProjects = () => {
  const { kappSlug } = useSelector(state => state.app);

  const params = useMemo(() => ({ kappSlug }), [kappSlug]);
  const { initialized, loading, response } = useData(fetchUpcomingProjects, params);
  const { response: captainsResponse } = useData(fetchCaptains, params);

  // Integration returns { Projects: [...], Error: "..." }
  // Each project has flat keys: "Project Id", "Project Name", etc.
  const projects = response?.Projects ?? [];
  const error = response?.Error
    ? { message: response.Error }
    : response?.error;

  const captainsByUsername = useMemo(() => {
    const map = {};
    for (const c of captainsResponse?.['Team Captains'] ?? []) {
      map[c['User Name']] = c;
    }
    return map;
  }, [captainsResponse]);

  return (
    <Routes>
      <Route
        path=":projectId"
        element={
          <UpcomingProjectDetail
            projects={projects}
            captainsByUsername={captainsByUsername}
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
