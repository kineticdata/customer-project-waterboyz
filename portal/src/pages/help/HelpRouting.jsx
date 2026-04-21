// portal/src/pages/help/HelpRouting.jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { SwatLeadersGuide } from './SwatLeadersGuide.jsx';
import { TeamCaptainsGuide } from './TeamCaptainsGuide.jsx';

export function HelpRouting() {
  const { isLeadership, isAdmin } = useRoles();
  const canSeeLeadershipGuide = isLeadership || isAdmin;
  return (
    <Routes>
      <Route
        path="swat-leaders"
        element={canSeeLeadershipGuide ? <SwatLeadersGuide /> : <Navigate to="team-captains" replace />}
      />
      <Route path="team-captains" element={<TeamCaptainsGuide />} />
      <Route
        path="*"
        element={<Navigate to={canSeeLeadershipGuide ? 'swat-leaders' : 'team-captains'} replace />}
      />
    </Routes>
  );
}
