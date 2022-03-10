import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { AiOutlineContainer, AiOutlineSetting, AiOutlineSearch } from 'react-icons/ai';
import { HiOutlineTicket } from 'react-icons/hi';
import { MdOutlineAnalytics } from 'react-icons/md';
import cx from 'classnames';

function Logo() {
  return (
    <div className="bg-primary w-16 h-16 leading-[64px] font-mono text-5xl text-center text-white cursor-default">
      L
    </div>
  );
}

function Path({ to, children, title }: { to: string; children: ReactNode; title?: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        cx(
          'flex mb-2 w-[40px] h-[40px] rounded transition-colors hover:bg-[rgba(255,255,255,0.16)] hover:text-white',
          {
            'bg-[rgba(255,255,255,0.16)] text-white': isActive,
          }
        )
      }
      to={to}
      title={title}
    >
      {children}
    </NavLink>
  );
}

export function Sidebar(props: ComponentPropsWithoutRef<'aside'>) {
  return (
    <aside {...props} className={cx('w-16 bg-[#12344d]', props.className)}>
      <Logo />
      <section className="p-3 text-[rgba(255,255,255,0.72)]">
        <Path to="/admin/tickets" title="工单">
          <HiOutlineTicket className="m-auto w-[20px] h-[20px]" />
        </Path>
        <Path to="/admin/views" title="视图">
          <AiOutlineContainer className="m-auto w-[20px] h-[20px]" />
        </Path>
        <Path to="/admin/search" title="搜索">
          <AiOutlineSearch className="m-auto w-[20px] h-[20px]" />
        </Path>
        <Path to="/admin/stats" title="统计">
          <MdOutlineAnalytics className="m-auto w-[20px] h-[20px]" />
        </Path>
        <Path to="/admin/settings" title="设置">
          <AiOutlineSetting className="m-auto w-[20px] h-[20px]" />
        </Path>
      </section>
    </aside>
  );
}
