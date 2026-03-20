import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';

const parseJsonArray = value => {
  if (!value) return [];
  try {
    const arr = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const useNotificationPreview = (notificationType, selectedSkills) => {
  const kappSlug = useSelector(state => state.app.kappSlug);

  const projectParams = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'swat-projects',
      search: {
        include: ['values'],
        limit: 1000,
        q: 'values[Project Status]="Ready to Work" AND values[Additional Volunteers Needed]="Yes"',
      },
    }),
    [kappSlug],
  );
  const {
    loading: projectsLoading,
    response: projectsResponse,
    actions: { reloadData: reloadProjects },
  } = useData(searchSubmissions, projectParams);

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

  const projects = useMemo(() => {
    if (!projectsResponse?.submissions) return [];
    let filtered = projectsResponse.submissions.filter(
      s => !s.values['Associated Event'],
    );
    if (notificationType === 'Skills-Based' && selectedSkills.length > 0) {
      const skillSet = new Set(selectedSkills);
      filtered = filtered.filter(s => {
        const projectSkills = parseJsonArray(s.values['Skills Needed']);
        return projectSkills.some(skill => skillSet.has(skill));
      });
    }
    return filtered;
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
