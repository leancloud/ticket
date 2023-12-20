import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TicketList from './TicketList';
import TicketDetail from './Ticket';
export default function Tickets() {
  return (
    <Routes>
      <Route index element={<TicketList />} />
      <Route path=":id" element={<TicketDetail />} />
    </Routes>
  );
}
