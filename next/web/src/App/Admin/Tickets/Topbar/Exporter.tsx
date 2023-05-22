import React, { useState } from 'react';
import { Button, message, Popover, Tooltip } from '@/components/antd';
import { useExportTickets } from '@/api/ticket';

import { useLocalFilters } from '../Filter';
import { useOrderBy } from './SortDropdown';

interface Props {
  trigger: React.ReactNode;
}
export function Exporter({ trigger }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <Tooltip title="导出工单">
      <Popover
        title="工单保存为"
        destroyTooltipOnHide={true}
        onVisibleChange={(nextStatus) => setVisible(nextStatus)}
        content={<ExporterContent close={() => setVisible(false)} />}
        trigger="click"
        visible={visible}
        placement="bottomRight"
      >
        {trigger}
      </Popover>
    </Tooltip>
  );
}

interface ContentProps {
  close?: () => void;
}
function ExporterContent({ close }: ContentProps) {
  const [localFilters] = useLocalFilters();
  const { orderKey, orderType } = useOrderBy();
  const { mutate, isLoading } = useExportTickets({
    onSuccess: () => {
      message.success('导出任务进行中，导出成功后将发送邮件进行通知，请注意查收邮件进行下载。', 5);
      close?.();
    },
    onError: (error) => {
      message.success(`导出失败：${error.message}`);
      close?.();
    },
  });

  return (
    <div>
      <Button
        disabled={isLoading}
        onClick={() => {
          mutate({
            type: 'json',
            orderKey,
            orderType,
            filters: localFilters,
          });
        }}
      >
        JSON
      </Button>
      <Button
        disabled={isLoading}
        onClick={() => {
          mutate({
            type: 'csv',
            orderKey,
            orderType,
            filters: localFilters,
          });
        }}
        className="ml-2"
      >
        CSV
      </Button>
    </div>
  );
}
