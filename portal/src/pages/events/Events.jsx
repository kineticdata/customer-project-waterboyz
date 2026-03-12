import { Route, Routes } from 'react-router-dom';
import { EventsList } from './EventsList.jsx';
import { EventsAssign } from './EventsAssign.jsx';

export const Events = () => (
  <Routes>
    <Route path=":eventId/assign" element={<EventsAssign />} />
    <Route path="*" element={<EventsList />} />
  </Routes>
);
