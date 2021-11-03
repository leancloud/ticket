import {
  Link,
  Redirect,
  RouteComponentProps,
  Switch,
  Route,
  useRouteMatch,
} from 'react-router-dom';

import { Menu, Typography } from '@/components/antd';
import Triggers from './Triggers';
import NewTrigger from './Triggers/New';
import TriggerDetail from './Triggers/Detail';
import TimeTriggers from './TimeTriggers';
import NewTimeTrigger from './TimeTriggers/New';
import TimeTriggerDetail from './TimeTriggers/Detail';

const { Title } = Typography;

function useSelectedKeys(path: string): string[] | undefined {
  const match = useRouteMatch<{ key: string }>(path + '/:key');
  if (match?.params.key) {
    return [match.params.key];
  }
}

function TriggerMenu({ match: { path } }: RouteComponentProps) {
  const selectedKeys = useSelectedKeys(path);

  return (
    <>
      <Title level={4}>规则运行于：</Title>

      <Menu selectedKeys={selectedKeys} mode="horizontal">
        <Menu.Item key="triggers">
          <Link to={`${path}/triggers`}>流转触发器</Link>
        </Menu.Item>
        <Menu.Item key="time-triggers">
          <Link to={`${path}/time-triggers`}>定时触发器</Link>
        </Menu.Item>
      </Menu>

      <Switch>
        <Route path={`${path}/triggers`} component={Triggers} />
        <Route path={`${path}/time-triggers`} component={TimeTriggers} />
        <Redirect to={`${path}/triggers`} />
      </Switch>
    </>
  );
}

export default function Automations({ match: { path } }: RouteComponentProps) {
  return (
    <div className="p-14">
      <Switch>
        <Route path={`${path}/triggers/new`} component={NewTrigger} />
        <Route path={`${path}/triggers/:id`} component={TriggerDetail} />
        <Route path={`${path}/time-triggers/new`} component={NewTimeTrigger} />
        <Route path={`${path}/time-triggers/:id`} component={TimeTriggerDetail} />
        <Route path={path} component={TriggerMenu} />
      </Switch>
    </div>
  );
}
