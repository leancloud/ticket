import { useState } from 'react';
import { Popover } from '@/components/antd';
import _ from 'lodash';
import { TicketStatsRealtimeParams } from '@/api/ticket-stats';
import { PieChartOutlined } from '@ant-design/icons';
import { AssigneeStatsPie, CategoryStatsMultiPie, GroupStatsPie, StatusStatsPie } from './StatsPie';

const ContentMap = {
  status: StatusStatsPie,
  assignee: AssigneeStatsPie,
  group: GroupStatsPie,
  category: CategoryStatsMultiPie,
};

export function StatsPopover({ type }: { type: TicketStatsRealtimeParams['type'] }) {
  const [visible, setVisible] = useState(false);
  const Component = ContentMap[type];
  return (
    <Popover
      onVisibleChange={(v) => setVisible(v)}
      placement="leftBottom"
      title={null}
      content={visible ? <Component /> : null}
      trigger="hover"
    >
      <PieChartOutlined className=" hover:text-primary" />
    </Popover>
  );
}
