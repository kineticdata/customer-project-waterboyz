import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home } from './home/Home.jsx';
import { Form } from './forms/Form.jsx';
import { Privacy } from './privacy/Privacy.jsx';
import { NominationConfirmed } from './nominations/NominationConfirmed.jsx';

import { Header } from '../components/header/Header.jsx';
import { SiteFooter } from '../components/footer/SiteFooter.jsx';
import { SearchModal } from '../components/search/SearchModal.jsx';
import { VolunteerProfilePrompt } from '../components/VolunteerProfilePrompt.jsx';
import { useInitHasNominations } from '../helpers/hooks/useHasNominations.js';
import { Loading } from '../components/states/Loading.jsx';

// Lazy-loaded route chunks
const Actions = lazy(() => import('./tickets/actions/Actions.jsx').then(m => ({ default: m.Actions })));
const Requests = lazy(() => import('./tickets/requests/Requests.jsx').then(m => ({ default: m.Requests })));
const Profile = lazy(() => import('./profile/Profile.jsx').then(m => ({ default: m.Profile })));
const SettingsRouting = lazy(() => import('./settings/index.jsx').then(m => ({ default: m.SettingsRouting })));
const Projects = lazy(() => import('./projects/Projects.jsx').then(m => ({ default: m.Projects })));
const UpcomingProjects = lazy(() => import('./upcoming-projects/UpcomingProjects.jsx').then(m => ({ default: m.UpcomingProjects })));
const Events = lazy(() => import('./events/Events.jsx').then(m => ({ default: m.Events })));
const AdminRouting = lazy(() => import('./admin/index.jsx').then(m => ({ default: m.AdminRouting })));
const HelpRouting = lazy(() => import('./help/HelpRouting.jsx').then(m => ({ default: m.HelpRouting })));
const MyVolunteeringPage = lazy(() => import('./my-volunteering/MyVolunteeringPage.jsx').then(m => ({ default: m.MyVolunteeringPage })));
const Theme = lazy(() => import('./theme/index.jsx').then(m => ({ default: m.Theme })));

const Redirect = ({ to }) => {
  const params = useParams();
  return (
    <Navigate
      to={(typeof to === 'function' ? to(params) : to) || '/'}
      replace={true}
    />
  );
};

export const PrivateRoutes = () => {
  const spaceAdmin = useSelector(state => state.app.profile?.spaceAdmin);
  // Fetch nominations once on login and store result in Redux
  useInitHasNominations();
  return (
    <Routes>
      {/* Theme page */}
      {spaceAdmin && (
        <Route path="/theme" element={<Suspense fallback={<Loading />}><Theme /></Suspense>} />
      )}

      {/* Other Routes*/}
      <Route
        path="/*"
        element={
          <div className="flex-c-st min-h-full">
            {/* Shared header */}
            <Header />

            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Canonical route for submissions */}
                <Route
                  path="/kapps/:kappSlug/forms/:formSlug/submissions/:submissionId"
                  element={
                    <Redirect
                      to={params =>
                        `/kapps/${params.kappSlug}/forms/${params.formSlug}/${params.submissionId}`
                      }
                    />
                  }
                />
                {/* Canonical route for forms */}
                <Route
                  path="/kapps/:kappSlug/forms/:formSlug/:submissionId?"
                  element={<Form />}
                />
                {/* Canonical route for kapps */}
                <Route path="/kapps/:kappSlug" element={<Redirect to="/" />} />

                {/* Portal routes */}
                <Route path="/admin/*" element={<AdminRouting />} />
                <Route path="/help/*" element={<HelpRouting />} />
                <Route path="/my-volunteering/*" element={<MyVolunteeringPage />} />
                <Route path="/actions/*" element={<Actions />} />
                <Route path="/nominations/confirmed" element={<NominationConfirmed />} />
                <Route path="/nominations/*" element={<Requests />} />
                <Route
                  path="/requests/*"
                  element={
                    <Redirect
                      to={params =>
                        `/nominations${params['*'] ? `/${params['*']}` : ''}`
                      }
                    />
                  }
                />
                <Route path="/project-captains/*" element={<Projects />} />
                <Route path="/upcoming-projects/*" element={<UpcomingProjects />} />
                <Route path="/events/*" element={<Events />} />
                <Route
                  path="/forms/:formSlug/:submissionId?"
                  element={<Form />}
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings/*" element={<SettingsRouting />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/public/events/*" element={<Navigate to="/events" replace />} />
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="/*" element={<Home />} />
              </Routes>
            </Suspense>

            {/* Site footer */}
            <SiteFooter />

            {/* Global search modal */}
            <SearchModal />

            {/* Prompt volunteers with stale profiles to update */}
            <VolunteerProfilePrompt />
          </div>
        }
      />
    </Routes>
  );
};
