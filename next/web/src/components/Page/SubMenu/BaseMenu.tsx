import { NavLink } from 'react-router-dom';
import cx from 'classnames';
import { MenuDataItem } from '.';

export default function BaseMenu({ data }: { data: MenuDataItem[] }) {
  return <ul className="flex-1">{getNavMenuItems(data)}</ul>;
}

function getNavMenuItems(menusData: MenuDataItem[] = []) {
  return menusData.map((item) => getSubMenuOrItem(item)).filter((item) => item);
}

function getSubMenuOrItem(item: MenuDataItem) {
  const key = item.key || item.path;
  if (Array.isArray(item.children) && item.children.length > 0) {
    return (
      <li key={key}>
        <div className="pb-4 mb-2 border-b text-sm">{item.name}</div>
        <ul className="mb-4">{getNavMenuItems(item.children)}</ul>
      </li>
    );
  }
  return <li key={key}>{getMenuItem(item)}</li>;
}

function getMenuItem(item: MenuDataItem) {
  if (item.path) {
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          cx(
            'block w-full px-[10px] py-[6px] my-0.5 leading-[14px] rounded-[3px] hover:bg-[#f0f0f0]',
            {
              'bg-[#E9EBED]': isActive,
            }
          )
        }
      >
        {item.name}
      </NavLink>
    );
  }
  return <span>{item.name}</span>;
}
