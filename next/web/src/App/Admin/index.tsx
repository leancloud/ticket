import { Redirect, Route, Switch, useRouteMatch } from 'react-router-dom';

import { useCategories } from 'api/category';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import Tickets from './Tickets';

function Routes() {
  const { path } = useRouteMatch();
  return (
    <Switch>
      <Route path={`${path}/tickets`}>
        <Tickets />
      </Route>
      <Redirect to={`${path}/tickets`} />
    </Switch>
  );
}

export default function AdminPage() {
  const { isLoading } = useCategories({
    queryOptions: {
      cacheTime: Infinity,
    },
  });

  if (isLoading) {
    return <>Loading...</>;
  }
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-grow flex-col overflow-hidden">
        <Topbar className="flex-shrink-0" />
        <div className="flex-grow overflow-hidden">
          <Routes />
        </div>
      </div>
    </div>
  );
}
