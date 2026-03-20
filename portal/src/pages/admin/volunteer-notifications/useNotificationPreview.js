import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { executeIntegration } from '../../../helpers/api.js';

const parseJsonArray = value => {
  if (!value) return [];
  try {
    const arr = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const fetchUpcomingProjects = ({ kappSlug }) =>
  executeIntegration({
    kappSlug,
    integrationName: 'Upcoming SWAT Projects',
  });

export const useNotificationPreview = (notificationType, selectedSkills) => {
  const kappSlug = useSelector(state => state.app.kappSlug);

  // --- Fetch projects via integration (already filtered server-side) ---
  const projectParams = useMemo(() => ({ kappSlug }), [kappSlug]);
  const {
    loading: projectsLoading,
    response: projectsResponse,
    actions: { reloadData: reloadProjects },
  } = useData(fetchUpcomingProjects, projectParams);

  // --- Fetch all volunteers ---
  const volunteerParams = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'volunteers',
      search: {
        include: ['values'],
        limit: 1000,
      },
    }),
    [kappSlug],
  );
  const {
    loading: volunteersLoading,
    response: volunteersResponse,
    actions: { reloadData: reloadVolunteers },
  } = useData(searchSubmissions, volunteerParams);

  // --- Client-side filtering ---
  // Integration returns flat objects with keys like 'Project Name', 'Skills Needed'
  const projects = useMemo(() => {
    const raw = projectsResponse?.Projects ?? [];
    if (notificationType === 'Skills-Based' && selectedSkills.length > 0) {
      const skillSet = new Set(selectedSkills);
      return raw.filter(p => {
        const projectSkills = parseJsonArray(p['Skills Needed']);
        return projectSkills.some(skill => skillSet.has(skill));
      });
    }
    return raw;
  }, [projectsResponse, notificationType, selectedSkills]);

  const volunteers = useMemo(() => {
    if (!volunteersResponse?.submissions) return [];
    let filtered = volunteersResponse.submissions.filter(
      s => s.values['Email Address'],
    );
    if (notificationType === 'Skills-Based' && selectedSkills.length > 0) {
      const skillSet = new Set(selectedSkills);
      filtered = filtered.filter(s => {
        const volunteerSkills = parseJsonArray(s.values['Skill Areas']);
        return volunteerSkills.some(skill => skillSet.has(skill));
      });
    }
    return filtered;
  }, [volunteersResponse, notificationType, selectedSkills]);

  const loading = projectsLoading || volunteersLoading;

  const reload = useCallback(() => {
    reloadProjects();
    reloadVolunteers();
  }, [reloadProjects, reloadVolunteers]);

  return { loading, projects, volunteers, reload };
};
