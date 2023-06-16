import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { AiOutlineContainer, AiOutlineSetting } from 'react-icons/ai';
import { HiOutlinePlus, HiOutlineTicket } from 'react-icons/hi';
import { MdOutlineAnalytics } from 'react-icons/md';
import cx from 'classnames';

import { Tooltip } from '@/components/antd';
import { useCurrentUserIsAdmin, useCurrentUserIsCustomerService } from '@/leancloud';
import { Feedback } from '../Feedback';
import { CurrentUserSection } from '../CurrentUserSection';
import { RequirePermission } from '@/components/RequirePermission';

function Path({ to, children, title }: { to: string; children: ReactNode; title?: string }) {
  return (
    <Tooltip title={title} placement="right">
      <div>
        <NavLink
          className={({ isActive }) =>
            cx(
              'flex mb-2 w-10 h-10 rounded transition-colors hover:bg-[rgba(255,255,255,0.16)] hover:text-white',
              {
                'bg-[rgba(255,255,255,0.16)] text-white': isActive,
              }
            )
          }
          to={to}
        >
          {children}
        </NavLink>
      </div>
    </Tooltip>
  );
}

export function Sidebar(props: ComponentPropsWithoutRef<'aside'>) {
  const isCustomerService = useCurrentUserIsCustomerService();
  const isAdmin = useCurrentUserIsAdmin();

  return (
    <aside
      {...props}
      className={cx('grid grid-rows-[auto_1fr_auto] w-16 bg-gray-900', props.className)}
    >
      <section className="p-3 text-[rgba(255,255,255,0.72)]">
        {
          <RequirePermission permission="ticketList" limitCSOnly content={null}>
            <Path to="/admin/tickets" title="工单">
              <HiOutlineTicket className="m-auto w-5 h-5" />
            </Path>
          </RequirePermission>
        }
        {
          <RequirePermission permission="view" content={null}>
            <Path to="/admin/views" title="视图">
              <AiOutlineContainer className="m-auto w-5 h-5" />
            </Path>
          </RequirePermission>
        }
        {
          <RequirePermission permission="statistics" content={null}>
            <Path to="/admin/stats" title="统计">
              <MdOutlineAnalytics className="m-auto w-5 h-5" />
            </Path>
          </RequirePermission>
        }
        {isAdmin && (
          <Path to="/admin/settings" title="设置">
            <AiOutlineSetting className="m-auto w-5 h-5" />
          </Path>
        )}
      </section>
      <section />
      <section className="p-3">
        {isCustomerService && (
          <Path to="/admin/tickets/new" title="新建工单">
            <HiOutlinePlus className="m-auto w-5 h-5" />
          </Path>
        )}
        <Feedback />
        <CurrentUserSection />
      </section>
    </aside>
  );
}
