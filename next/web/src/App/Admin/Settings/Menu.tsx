import { ComponentPropsWithoutRef } from 'react';
import { NavLink } from 'react-router-dom';
import cx from 'classnames';

const routeGroups = [
  {
    name: '管理',
    paths: [
      {
        name: '工单字段',
        path: 'ticket-fields',
      },
      {
        name: '工单表单',
        path: 'ticket-forms',
      },
    ],
  },
  {
    name: '业务规则',
    paths: [
      {
        name: '流转触发器',
        path: 'triggers',
      },
      {
        name: '定时触发器',
        path: 'time-triggers',
      },
    ],
  },
];

function Path({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        cx(
          'block w-full px-[10px] py-[6px] my-0.5 leading-[14px] rounded-[3px] hover:bg-[#f0f0f0]',
          {
            'bg-[#E9EBED]': isActive,
          }
        )
      }
      to={to}
    >
      {children}
    </NavLink>
  );
}

export interface SettingMenuProps extends ComponentPropsWithoutRef<'div'> {}

export function SettingMenu(props: SettingMenuProps) {
  return (
    <div {...props} className={cx(props.className, 'flex flex-col p-5 pb-2 overflow-y-auto')}>
      {routeGroups.map(({ name, paths }, i) => (
        <div key={i}>
          <div className="pb-4 mb-2 border-b text-sm">{name}</div>
          <ul>
            {paths.map(({ name, path }, i) => (
              <li key={i}>
                <Path to={path}>{name}</Path>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex-grow" />
      <a className="block text-center leading-8 hover:bg-[#f0f0f0]" href="/settings">
        前往旧版配置页
      </a>
    </div>
  );
}
