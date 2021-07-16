import { ComponentPropsWithoutRef } from 'react';
import styles from './index.module.css';

function Select(props: ComponentPropsWithoutRef<'select'>) {
  return <select {...props} className={styles.select + (props.className ?? '')} />;
}

function AssigneeSelect() {
  return (
    <Select>
      <option>{'<当前用户>'}</option>
      <option>{'<未指派>'}</option>
    </Select>
  );
}

export function Filter() {
  return (
    <div className="w-72 border-l border-gray-300 p-4 text-gray-700 text-sm">
      <div className="text-sm">过滤</div>
      <div className="mt-6">
        <label className="block mb-1">客服</label>
        <AssigneeSelect />
      </div>
      <div className="mt-4">
        <label className="block mb-1">组</label>
        <Select />
      </div>
      <div className="mt-4">
        <label className="block mb-1">创建时间</label>
        <Select />
      </div>
      <div className="mt-4">
        <label className="block mb-1">分类</label>
        <Select />
      </div>
      <div className="mt-4">
        <label className="block mb-1">状态</label>
        <Select />
      </div>
    </div>
  );
}
