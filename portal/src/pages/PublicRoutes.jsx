import { Route, Routes } from 'react-router-dom';
import { Placeholder } from './Placeholder.jsx';
import { Login } from './login/Login.jsx';
import { ResetPassword } from './login/ResetPassword.jsx';
import { CreateAccount } from './login/CreateAccount.jsx';
import { Privacy } from './privacy/Privacy.jsx';

export const PublicRoutes = ({ loginProps }) => {
  return (
    <Routes>
      <Route path="/public/*" element={<Placeholder title="Public App" />} />
      <Route path="/reset-password/:token?" element={<ResetPassword />} />
      <Route path="/create-account" element={<CreateAccount />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={<Login {...loginProps} />} />
      <Route path="/*" element={<Login {...loginProps} />} />
    </Routes>
  );
};
