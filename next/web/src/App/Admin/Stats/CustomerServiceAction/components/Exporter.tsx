import { useRef, useState } from 'react';
import { Alert, Checkbox, Divider, Modal } from 'antd';
import { intersectionWith, keyBy } from 'lodash-es';
import Papa from 'papaparse';
import moment from 'moment';

import { TicketLanguages } from '@/i18n/locales';
import { TicketSchema } from '@/api/ticket';
import { useCategoryContext } from '@/components/common';
import { ActionLogCollector } from '../action-log-collector';
import { renderAction } from '../render';
import { FilterFormData } from './FilterForm';

export interface ExporterProps {
  filters: FilterFormData;
  open?: boolean;
  onCancel?: () => void;
}

interface ExportRow {
  ticket?: TicketSchema;
  categoryName?: string;
  operatorName?: string;
  action: string;
  ts: string;
}

interface ExportColumn {
  title: string;
  render: (row: ExportRow) => string | undefined;
}

const exportColumns: ExportColumn[] = [
  {
    title: '工单ID',
    render: (row) => row.ticket?.nid.toString(),
  },
  {
    title: '工单标题',
    render: (row) => row.ticket?.title,
  },
  {
    title: '用户ID',
    render: (row) => row.ticket?.authorId,
  },
  {
    title: '工单语言',
    render: (row) => row.ticket?.language && TicketLanguages[row.ticket.language],
  },
  {
    title: '工单分类',
    render: (row) => row.categoryName,
  },
  {
    title: '操作时间',
    render: (row) => moment(row.ts).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    title: '客服',
    render: (row) => row.operatorName,
  },
  {
    title: '操作',
    render: (row) => row.action,
  },
];

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function Exporter({ filters, open, onCancel }: ExporterProps) {
  const { getCategoryPath } = useCategoryContext();

  const [selectedFields, setSelectedFields] = useState(exportColumns.map((col) => col.title));
  const [isLoading, setIsLoading] = useState(false);
  const collectorRef = useRef<ActionLogCollector<ExportRow>>();

  const handleExport = () => {
    if (selectedFields.length === 0) {
      return;
    }

    const selectedColumns = intersectionWith(exportColumns, selectedFields, (column, field) => {
      return column.title === field;
    });
    const dateRangeString = filters.dateRange.map((date) => date.format('YYYYMMDD')).join('-');
    const filename = `客服操作记录${dateRangeString}.csv`;

    const collector = new ActionLogCollector<ExportRow>({
      filters,
      transform: ({ logs, tickets, users }) => {
        const ticketById = keyBy(tickets, (t) => t.id);
        const userById = keyBy(users, (u) => u.id);

        return logs.map((log) => {
          const row: ExportRow = {
            ts: log.ts,
            operatorName: userById[log.operatorId]?.nickname,
            action: renderAction(log),
          };
          if (log.ticketId) {
            const ticket = ticketById[log.ticketId];
            if (ticket) {
              row.ticket = ticket;
              row.categoryName = getCategoryPath(ticket.categoryId)
                .map((c) => c.name)
                .join(' / ');
            }
          }
          return row;
        });
      },
    });

    collector.onSuccess = (rows) => {
      setIsLoading(false);
      const content = Papa.unparse({
        fields: selectedColumns.map((col) => col.title),
        data: rows.map((row) => selectedColumns.map((col) => col.render(row))),
      });
      downloadCSV(content, filename);
    };

    collector.onError = () => {
      setIsLoading(false);
    };

    collectorRef.current = collector;
    setIsLoading(true);
    collector.collect();
  };

  const handleCancel = () => {
    if (collectorRef.current) {
      collectorRef.current.abort();
      collectorRef.current = undefined;
    }
    setIsLoading(false);
    onCancel?.();
  };

  return (
    <Modal
      open={open}
      title="导出操作记录"
      okText="导出"
      confirmLoading={isLoading}
      onOk={handleExport}
      onCancel={handleCancel}
    >
      <input type="hidden" />
      <Alert showIcon type="info" message="一次最多导出 10000 条记录" />
      <Divider>导出字段</Divider>
      <Checkbox.Group
        className="!grid grid-cols-4 gap-2"
        options={exportColumns.map((col) => col.title)}
        value={selectedFields}
        onChange={(value) => setSelectedFields(value as string[])}
      />
    </Modal>
  );
}
