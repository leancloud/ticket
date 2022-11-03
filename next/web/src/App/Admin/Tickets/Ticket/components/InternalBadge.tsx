import { Tooltip } from '@/components/antd';

export function InternalBadge() {
  return (
    <Tooltip title="仅员工可见">
      <span className="bg-gray-500 text-white rounded-sm text-sm px-1 ml-1 font-semibold">
        internal
      </span>
    </Tooltip>
  );
}
