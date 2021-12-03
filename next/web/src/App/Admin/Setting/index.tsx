import { Route, Routes } from 'react-router-dom';

import Automations from './Automations';

export default function Setting() {
  return (
    <div className="h-[calc(100%-16px)] m-2 bg-white overflow-auto">
      <Routes>
        <Route path="/automations/*" element={<Automations />} />
      </Routes>
    </div>
  );
}
