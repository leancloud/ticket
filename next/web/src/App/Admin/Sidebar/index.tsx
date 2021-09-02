import { ComponentPropsWithoutRef } from 'react';
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

export function Sidebar(props: ComponentPropsWithoutRef<'aside'>) {
  return (
    <aside {...props} className={cx('w-16 bg-[#12344d]', props.className)}>
      <Logo />

      <section className="p-3 text-[rgba(255,255,255,0.72)]">
        <NavLink
          className="flex w-[40px] h-[40px] rounded transition-colors hover:bg-[rgba(255,255,255,0.16)] hover:text-white"
          activeClassName="bg-[rgba(255,255,255,0.16)] text-white"
          to="/admin/tickets"
        >
          <HiOutlineTicket className="m-auto w-[20px] h-[20px]" />
        </NavLink>
        <a
          className="flex w-[40px] h-[40px] rounded transition-colors hover:bg-[rgba(255,255,255,0.16)] hover:text-white mt-3"
          href="/settings"
        >
          <AiOutlineSetting className="m-auto w-[20px] h-[20px]" />
        </a>
      </section>
    </aside>
  );
}
