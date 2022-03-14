import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu } from '@/components/antd';
import { MenuDataItem } from '.';
import cx from 'classnames';
// import styles from './index.module.less';

const BaseMenu: React.FC<{
  data: MenuDataItem[];
}> = ({ data }) => {
  return (
    <ul key="baseMenu" className="w-full p-5 pb-2">
      {getNavMenuItems(data)}
    </ul>
  );
};
export default BaseMenu;

function getNavMenuItems(menusData: MenuDataItem[] = [], isChildren = false) {
  return menusData.map((item) => getSubMenuOrItem(item, isChildren)).filter((item) => item);
}

function getSubMenuOrItem(item: MenuDataItem, isChildren: boolean) {
  if (Array.isArray(item.children) && item.children.length > 0) {
    return (
      <li key={item.key || item.path}>
        <div className="pb-4 mb-2 border-b text-sm">{item.name}</div>
        <ul> {getNavMenuItems(item.children, true)}</ul>
      </li>
    );
  }
  return <li>{getMenuItemPath(item)}</li>;
}

function getMenuItemPath(item: MenuDataItem) {
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
