import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { fetchForms } from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { useData } from '../../helpers/hooks/useData.js';
import { Admin } from './Admin.jsx';
import { AdminFormRecords } from './AdminFormRecords.jsx';
import { Loading } from '../../components/states/Loading.jsx';

const VolunteerManagement = lazy(() => import('./volunteer-management/VolunteerManagement.jsx').then(m => ({ default: m.VolunteerManagement })));
const Reports = lazy(() => import('./Reports.jsx').then(m => ({ default: m.Reports })));
const VolunteerNotifications = lazy(() => import('./volunteer-notifications/VolunteerNotifications.jsx').then(m => ({ default: m.VolunteerNotifications })));
const CaptainManagement = lazy(() => import('./CaptainManagement.jsx').then(m => ({ default: m.CaptainManagement })));

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
      <Route path="/volunteer-management" element={<Suspense fallback={<Loading />}><VolunteerManagement /></Suspense>} />

      {/* Standard gutter routes */}
      <Route
        path="/*"
        element={
          <div className="gutter">
            <Routes>
              <Route path="/" element={<Admin adminForms={adminForms} />} />
              <Route path="/reports" element={<Suspense fallback={<Loading />}><Reports /></Suspense>} />
              <Route path="/notify-volunteers/*" element={<Suspense fallback={<Loading />}><VolunteerNotifications /></Suspense>} />
              <Route path="/captain-management" element={<Suspense fallback={<Loading />}><CaptainManagement /></Suspense>} />
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
