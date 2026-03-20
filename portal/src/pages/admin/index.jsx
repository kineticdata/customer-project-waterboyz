import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { fetchForms } from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { useData } from '../../helpers/hooks/useData.js';
import { Admin } from './Admin.jsx';
import { AdminFormRecords } from './AdminFormRecords.jsx';
import { VolunteerManagement } from './volunteer-management/VolunteerManagement.jsx';
import { Reports } from './Reports.jsx';
import { ScheduledJobs } from './ScheduledJobs.jsx';
import { ScheduledJobHistory } from './ScheduledJobHistory.jsx';

export const AdminRouting = () => {
  const { isAdmin, isLeadership } = useRoles();
  const kappSlug = useSelector(state => state.app.kappSlug);

  const adminFormsParams = useMemo(
    () => ({
      kappSlug,
      include: 'attributesMap,fields',
      q: 'type = "Admin" AND (status = "Active" OR status = "New")',
    }),
    [kappSlug],
  );

  const { response } = useData(fetchForms, adminFormsParams);
  const adminForms = response?.forms ?? null;

  if (!isAdmin && !isLeadership) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      {/* Full-bleed route (no gutter — table needs max width) */}
      <Route path="/volunteer-management" element={<VolunteerManagement />} />

      {/* Standard gutter routes */}
      <Route
        path="/*"
        element={
          <div className="gutter">
            <Routes>
              <Route path="/" element={<Admin adminForms={adminForms} />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/scheduled-jobs" element={<ScheduledJobs />} />
              <Route path="/scheduled-jobs/:jobId/history" element={<ScheduledJobHistory />} />
              <Route
                path="/:formSlug"
                element={<AdminFormRecords adminForms={adminForms} />}
              />
              <Route
                path="/:formSlug/:id"
                element={<AdminFormRecords adminForms={adminForms} />}
              />
            </Routes>
          </div>
        }
      />
    </Routes>
  );
};
