import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home } from './home/Home.jsx';
import { Actions } from './tickets/actions/Actions.jsx';
import { Requests } from './tickets/requests/Requests.jsx';
import { Form } from './forms/Form.jsx';
import { Profile } from './profile/Profile.jsx';
import { SettingsRouting } from './settings/index.jsx';
import { Projects } from './projects/Projects.jsx';
import { UpcomingProjects } from './upcoming-projects/UpcomingProjects.jsx';
import { Events } from './events/Events.jsx';
import { Privacy } from './privacy/Privacy.jsx';
import { AdminRouting } from './admin/index.jsx';
import { MyVolunteering } from './my-volunteering/MyVolunteering.jsx';
import { NominationConfirmed } from './nominations/NominationConfirmed.jsx';

import { Header } from '../components/header/Header.jsx';
import { SiteFooter } from '../components/footer/SiteFooter.jsx';
import { SearchModal } from '../components/search/SearchModal.jsx';
import { VolunteerProfilePrompt } from '../components/VolunteerProfilePrompt.jsx';
import { Theme } from './theme/index.jsx';

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
  return (
    <Routes>
      {/* Theme page */}
      {spaceAdmin && <Route path="/theme" element={<Theme />} />}

      {/* Other Routes*/}
      <Route
        path="/*"
        element={
          <div className="flex-c-st min-h-full">
            {/* Shared header */}
            <Header />

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
              <Route path="/my-volunteering/*" element={<MyVolunteering />} />
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
