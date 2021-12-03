import { useMemo } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { Tabs, Typography } from '@/components/antd';
import Triggers from './Triggers';
import NewTrigger from './Triggers/New';
import TriggerDetail from './Triggers/Detail';
import TimeTriggers from './TimeTriggers';
import NewTimeTrigger from './TimeTriggers/New';
import TimeTriggerDetail from './TimeTriggers/Detail';

const { Title } = Typography;

function TriggerPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeKey = useMemo(() => {
    const i = pathname.lastIndexOf('/');
    if (i >= 0) {
      return pathname.slice(i + 1);
    }
  }, [pathname]);

  return (
    <>
      <Title level={4}>规则运行于：</Title>

      <Tabs activeKey={activeKey} onChange={navigate}>
        <Tabs.TabPane key="triggers" tab="流转触发器" />
        <Tabs.TabPane key="time-triggers" tab="定时触发器" />
      </Tabs>

      <Outlet />
    </>
  );
}

export default function Automations() {
  return (
    <div className="p-14">
      <Routes>
        <Route path="/*" element={<TriggerPage />}>
          <Route path="triggers" element={<Triggers />} />
          <Route path="time-triggers" element={<TimeTriggers />} />
          <Route path="*" element={<Navigate to="triggers" replace />} />
        </Route>
        <Route path="/triggers/new" element={<NewTrigger />} />
        <Route path="/triggers/:id" element={<TriggerDetail />} />
        <Route path="/time-triggers/new" element={<NewTimeTrigger />} />
        <Route path="/time-triggers/:id" element={<TimeTriggerDetail />} />
      </Routes>
    </div>
  );
}
