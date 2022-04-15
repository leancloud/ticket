import { useState, useImperativeHandle, forwardRef, useMemo, useCallback, useRef } from 'react';
import { Button, Modal, Table, TableProps } from '@/components/antd';

import { useSearchParams } from '@/utils/useSearchParams';
import { useReplyDetails } from '@/api/ticket-stats';

import { useActiveField } from './StatsPage';
import { useRangePicker } from './utils';
import _ from 'lodash';
import { formatTime } from './StatsDetails';

export interface ModalRef {
  show: (params: { categoryId?: string; customerServiceId?: string }) => void;
}
const fieldMap: Record<string, string> = {
  naturalReplyTimeAVG: 'naturalReplyTime',
  replyTimeAVG: 'replyTime',
  firstReplyTimeAVG: 'firstReplyTime',
};

const ReplyDetails = forwardRef<ModalRef>((props, ref) => {
  const [open, setOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [queryParams, setQueryParams] = useState<{
    categoryId?: string;
    customerServiceId?: string;
  }>({});
  const [field] = useActiveField();
  const [{ from, to }] = useRangePicker();
  const [{ category, customerService }] = useSearchParams();
  const { data, isFetching, isLoading } = useReplyDetails({
    from,
    to,
    field: fieldMap[field],
    category: queryParams.categoryId || category,
    customerService: queryParams.customerServiceId || customerService,
    queryOptions: {
      enabled: open && fieldMap[field] !== undefined,
    },
  });
  const close = useCallback(() => {
    setQueryParams({});
    setOpen(false);
  }, []);
  useImperativeHandle(
    ref,
    () => {
      return {
        show: (params) => {
          if (params.categoryId || params.customerServiceId) {
            setOpen(true);
            setQueryParams(params);
          }
        },
      };
    },
    []
  );

  const displayData = useMemo(() => {
    if (!data) {
      return [];
    }
    return _(data)
      .groupBy('nid')
      .entries()
      .map((v) => {
        return {
          id: v[0],
          replyTime: _.sumBy(v[1], 'replyTime') / v[1].length,
          children: _.orderBy(v[1], 'replyTime', 'desc'),
        };
      })
      .orderBy('replyTime', 'desc')
      .valueOf();
  }, [data]);
  return (
    <Modal
      title="回复详情"
      visible={open}
      onCancel={close}
      footer={[
        <Button key="close" onClick={close}>
          关闭
        </Button>,
      ]}
    >
      <Table
        bordered={false}
        size="small"
        rowKey={(v) => v.id}
        pagination={false}
        loading={isFetching || isLoading}
        dataSource={displayData}
        expandable={{
          expandRowByClick: true,
          onExpandedRowsChange: (rows) => setExpandedRows(rows as string[]),
        }}
        columns={[
          {
            title: '工单',
            dataIndex: 'id',
            key: 'id',
            ellipsis: true,
            render: (
              value: string,
              obj: {
                id: string;
                nid?: string;
                replyTime: number;
              }
            ) => {
              if (obj.nid !== undefined) {
                return (
                  <a href={`/tickets/${obj.nid}#${value}`} target={'_blank'}>
                    {obj.nid}#{value.substring(0, 6)}...
                  </a>
                );
              }
              return (
                <a href={`/tickets/${value}`} target={'_blank'}>
                  {value}
                </a>
              );
            },
          },
          {
            title: '回复时间',
            dataIndex: 'replyTime',
            key: 'replyTime',
            render: (value, obj) => {
              if (obj.nid !== undefined) {
                return formatTime(value);
              } else {
                return expandedRows.includes(obj.id) ? null : formatTime(value);
              }
            },
          },
        ]}
        scroll={{
          y: 400,
        }}
      />
    </Modal>
  );
});

export default ReplyDetails;
