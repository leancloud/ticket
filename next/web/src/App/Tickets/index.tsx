import { Route, Routes } from 'react-router-dom';

import { NewTicket } from './New';

export default function Tickets() {
  return (
    <Routes>
      <Route path="new" element={<NewTicket />} />
    </Routes>
  );
}
