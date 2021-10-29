import { Redirect, Switch, useRouteMatch } from 'react-router-dom';
import { SentryRoute } from 'components/Sentry';
import { useCategories } from 'api/category';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import Tickets from './Tickets';
import Setting from './Setting';

function Routes() {
  const { path } = useRouteMatch();
  return (
    <Switch>
      <SentryRoute path={`${path}/tickets`}>
        <Tickets />
      </SentryRoute>
      <SentryRoute path={`${path}/setting`}>
        <Setting />
      </SentryRoute>
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
    <div className="flex h-full bg-[#ebeff3]">
      <Sidebar className="z-40" />
      <div className="flex flex-grow flex-col overflow-hidden">
        <Topbar className="flex-shrink-0" />
        <div className="flex-grow overflow-hidden">
          <Routes />
        </div>
      </div>
    </div>
  );
}
