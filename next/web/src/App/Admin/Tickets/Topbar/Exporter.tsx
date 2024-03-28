import React, { useState } from 'react';
import { useLocalStorage } from 'react-use';

import { Button, Form, message, Popover, Radio, Tooltip } from '@/components/antd';
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

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface ContentProps {
  close?: () => void;
}
function ExporterContent({ close }: ContentProps) {
  const [localFilters] = useLocalFilters();
  const { orderKey, orderType } = useOrderBy();

  const [exportType = 'csv', setExportType] = useLocalStorage<'csv' | 'json' | undefined>(
    'TS:exportType'
  );
  const [timeFormat = 'locale', setTimeFormat] = useLocalStorage<'locale' | 'utc' | undefined>(
    'TS:timeFormat'
  );

  const { mutate, isLoading } = useExportTickets({
    onSuccess: () => {
      message.success('导出任务进行中，请在「设置」>「工单」>「导出记录」中查看', 5);
      close?.();
    },
    onError: (error) => {
      message.error(`导出失败：${error.message}`);
      close?.();
    },
  });

  return (
    <Form layout="vertical">
      <Form.Item label="文件格式">
        <Radio.Group
          options={[
            { label: 'CSV', value: 'csv' },
            { label: 'JSON', value: 'json' },
          ]}
          onChange={(e) => setExportType(e.target.value)}
          value={exportType}
          optionType="button"
          size="large"
        />
      </Form.Item>
      <Form.Item label="时间格式">
        <Radio.Group
          options={[
            { label: `本地 (${timeZone})`, value: 'locale' },
            { label: 'UTC', value: 'utc' },
          ]}
          onChange={(e) => setTimeFormat(e.target.value)}
          value={timeFormat}
          optionType="button"
          size="small"
        />
      </Form.Item>
      <Button
        type="primary"
        disabled={isLoading}
        onClick={() => {
          mutate({
            type: exportType,
            utcOffset: timeFormat === 'locale' ? new Date().getTimezoneOffset() : undefined,
            orderKey,
            orderType,
            filters: localFilters,
          });
        }}
      >
        Export
      </Button>
    </Form>
  );
}
