import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ChristmasAliveLayout } from './ChristmasAliveLayout.jsx';
import { Landing } from './Landing.jsx';
import { useChristmasAlive } from './hooks/useChristmasAlive.js';
import { Loading } from '../../components/states/Loading.jsx';

const BrowseFamilies = lazy(() =>
  import('./browse/BrowseFamilies.jsx').then(m => ({ default: m.BrowseFamilies })),
);
const MySponsorships = lazy(() =>
  import('./my-sponsorships/MySponsorships.jsx').then(m => ({ default: m.MySponsorships })),
);
const FamilyPacket = lazy(() =>
  import('./packet/FamilyPacket.jsx').then(m => ({ default: m.FamilyPacket })),
);
const Responsibilities = lazy(() =>
  import('./packet/Responsibilities.jsx').then(m => ({ default: m.Responsibilities })),
);
const NominateFamily = lazy(() =>
  import('./nominate/NominateFamily.jsx').then(m => ({ default: m.NominateFamily })),
);
const Approvals = lazy(() =>
  import('./approvals/Approvals.jsx').then(m => ({ default: m.Approvals })),
);

/**
 * Christmas Alive route subtree.
 *
 * Route guards here are UX, not security — they decide what renders. Every one
 * has a server-side counterpart on the operation, WebAPI, or form that the
 * page calls. Never rely on these to protect data.
 */
export const ChristmasAliveRouting = () => {
  const { canNominate, isCAAdmin, loading } = useChristmasAlive();

  if (loading) return <Loading />;

  return (
    <ChristmasAliveLayout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/families" element={<BrowseFamilies />} />
          <Route path="/my-sponsorships" element={<MySponsorships />} />
          <Route path="/packet/:sponsorshipId" element={<FamilyPacket />} />
          <Route path="/responsibilities" element={<Responsibilities />} />
          <Route
            path="/nominate"
            element={canNominate ? <NominateFamily /> : <Navigate to="/christmas-alive" replace />}
          />
          <Route
            path="/approvals"
            element={isCAAdmin ? <Approvals /> : <Navigate to="/christmas-alive" replace />}
          />
          <Route path="/*" element={<Navigate to="/christmas-alive" replace />} />
        </Routes>
      </Suspense>
    </ChristmasAliveLayout>
  );
};
