import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { AiOutlineSetting } from 'react-icons/ai';
import { HiOutlineTicket } from 'react-icons/hi';
import cx from 'classnames';

function Logo() {
  return (
    <div className="bg-primary w-16 h-16 leading-[64px] font-mono text-5xl text-center text-white cursor-default">
      L
    </div>
  );
}

function Path({ to, children }: { to: string; children: ReactNode }) {
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
        <Path to="/admin/tickets">
          <HiOutlineTicket className="m-auto w-[20px] h-[20px]" />
        </Path>
        <Path to="/admin/settings">
          <AiOutlineSetting className="m-auto w-[20px] h-[20px]" />
        </Path>
      </section>
    </aside>
  );
}
