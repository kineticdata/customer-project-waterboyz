import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { fetchForms } from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { useData } from '../../helpers/hooks/useData.js';
import { Admin } from './Admin.jsx';
import { AdminFormRecords } from './AdminFormRecords.jsx';
import { AdminVolunteers } from './AdminVolunteers.jsx';

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
    <div className="gutter">
      <Routes>
        <Route path="/" element={<Admin adminForms={adminForms} />} />
        <Route path="/volunteers" element={<AdminVolunteers />} />
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
  );
};
