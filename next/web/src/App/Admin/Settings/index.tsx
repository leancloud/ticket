import { Route, Routes } from 'react-router-dom';

import { SettingMenu } from './Menu';
import Triggers from './Automations/Triggers';
import NewTrigger from './Automations/Triggers/New';
import TriggerDetail from './Automations/Triggers/Detail';
import TimeTriggers from './Automations/TimeTriggers';
import NewTimeTrigger from './Automations/TimeTriggers/New';
import TimeTriggerDetail from './Automations/TimeTriggers/Detail';

const SettingRoutes = () => (
  <Routes>
    <Route path="/triggers">
      <Route index element={<Triggers />} />
      <Route path="new" element={<NewTrigger />} />
      <Route path=":id" element={<TriggerDetail />} />
    </Route>
    <Route path="/time-triggers">
      <Route index element={<TimeTriggers />} />
      <Route path="new" element={<NewTimeTrigger />} />
      <Route path=":id" element={<TimeTriggerDetail />} />
    </Route>
  </Routes>
);

export default function Setting() {
  return (
    <div className="h-full bg-white flex">
      <SettingMenu className="w-[330px] bg-[#F8F9F9] shrink-0" />
      <div className="grow overflow-auto">
        <div className="min-w-[770px] p-10">
          <SettingRoutes />
        </div>
      </div>
    </div>
  );
}
