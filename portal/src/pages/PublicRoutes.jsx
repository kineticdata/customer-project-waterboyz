import { Route, Routes } from 'react-router-dom';
import { Login } from './login/Login.jsx';
import { ResetPassword } from './login/ResetPassword.jsx';
import { CreateAccount } from './login/CreateAccount.jsx';
import { Privacy } from './privacy/Privacy.jsx';
import { PublicEventsList } from './public/PublicEventsList.jsx';
import { PublicEventSignup } from './public/PublicEventSignup.jsx';
import { PublicEventConfirmed } from './public/PublicEventConfirmed.jsx';

export const PublicRoutes = ({ loginProps }) => {
  return (
    <Routes>
      <Route
        path="/public/events/:formSlug/confirmed"
        element={<PublicEventConfirmed />}
      />
      <Route
        path="/public/events/:formSlug"
        element={<PublicEventSignup />}
      />
      <Route path="/public/events" element={<PublicEventsList />} />
      <Route path="/reset-password/:token?" element={<ResetPassword />} />
      <Route path="/create-account" element={<CreateAccount />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={<Login {...loginProps} />} />
      <Route path="/*" element={<Login {...loginProps} />} />
    </Routes>
  );
};
