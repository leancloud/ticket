import { createElement } from 'react';
import { NavLink, Route, Switch, useRouteMatch } from 'react-router-dom';
import { HiOutlineTicket } from 'react-icons/hi';
import { AiOutlineSetting } from 'react-icons/ai';

import { useStaff } from 'api';
import { QueryResult } from 'components/QueryResult';
import Tickets, { TopbarFilter } from './Tickets';
import Settings from './Settings';

function Routes() {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={path + '/tickets'}>
        <Tickets />
      </Route>
      <Route path={path + '/settings'}>
        <Settings />
      </Route>
    </Switch>
  );
}

function SideBarLink({ to, icon }: { to: string; icon: (...args: any[]) => JSX.Element }) {
  return (
    <NavLink
      className="p-2 rounded transition-colors hover:bg-[#254D6D] hover:text-white"
      activeClassName="bg-[#254D6D] text-white"
      to={to}
    >
      {createElement(icon, { className: 'w-6 h-6' })}
    </NavLink>
  );
}

function Sidebar() {
  return (
    <aside className="w-16 h-full bg-[#183247]">
      <div className="bg-primary w-16 h-16 font-mono text-5xl text-white flex justify-center items-center cursor-default">
        L
      </div>
      <div className="pt-3 flex flex-col items-center gap-2 text-gray-300">
        <SideBarLink to="/admin/tickets" icon={HiOutlineTicket} />
        <a
          className="p-2 rounded transition-colors hover:bg-[#254D6D] hover:text-white"
          href="/settings"
        >
          <AiOutlineSetting className="w-6 h-6" />
        </a>
      </div>
    </aside>
  );
}

function TopbarUser() {
  return (
    <QueryResult result={useStaff('me')}>
      {(me) => (
        <div>
          <button className="w-8 h-8 border rounded border-gray-300 overflow-hidden">
            <img src={me.avatarUrl} />
          </button>
        </div>
      )}
    </QueryResult>
  );
}

function Topbar() {
  return (
    <nav className="flex-shrink-0 flex items-center h-16 border-b border-gray-200 px-4">
      <section className="flex-shrink-0">
        <TopbarFilter />
      </section>
      <section className="flex-grow text-center">
        <a
          className="text-red-500 font-bold tracking-widest"
          href="/customerService/tickets?assignee=me&stage=todo"
        >
          点我返回原来的客服工单列表
        </a>
      </section>

      <section className="flex-shrink-0 flex items-center">
        <TopbarUser />
      </section>
    </nav>
  );
}

export default function Admin() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-grow flex flex-col border">
        <Topbar />
        <div className="flex-grow overflow-hidden">
          <Routes />
        </div>
      </div>
    </div>
  );
}
