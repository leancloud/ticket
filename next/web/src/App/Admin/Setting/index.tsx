import { Route, Switch, useRouteMatch } from 'react-router-dom';

import Automations from './Automations';

function Routes() {
  const { path } = useRouteMatch();
  return (
    <Switch>
      <Route path={`${path}/automations`} component={Automations} />
    </Switch>
  );
}

export default function Setting() {
  return (
    <div className="h-[calc(100%-16px)] m-2 bg-white overflow-auto">
      <Routes />
    </div>
  );
}
