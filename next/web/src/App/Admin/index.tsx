import { Route, Switch, useRouteMatch } from 'react-router-dom';

import Tickets from './Tickets';

function Routes() {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={path + '/tickets'}>
        <Tickets />
      </Route>
    </Switch>
  );
}

function Sidebar() {
  return (
    <aside className="w-16 h-full" style={{ backgroundColor: '#12344d' }}>
      <div className="bg-blue-500 w-16 h-16" />
      <div className="text-white"></div>
    </aside>
  );
}

function Topbar() {
  return (
    <nav className="h-16 box-border border-b border-gray-200">
      <section>Todo</section>
    </nav>
  );
}

export default function Admin() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-grow flex flex-col border">
        {/* <Topbar /> */}
        <div className="flex-grow overflow-hidden">
          <Routes />
        </div>
      </div>
    </div>
  );
}
