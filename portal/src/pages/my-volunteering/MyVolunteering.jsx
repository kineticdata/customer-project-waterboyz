import { Routes, Route } from 'react-router-dom';
import { MyVolunteeringPage } from './MyVolunteeringPage.jsx';

export const MyVolunteering = () => (
  <Routes>
    <Route path="/*" element={<MyVolunteeringPage />} />
  </Routes>
);
