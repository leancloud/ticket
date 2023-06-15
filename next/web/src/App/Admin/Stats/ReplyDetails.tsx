import { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Button, Modal, Table } from '@/components/antd';

import { useReplyDetails } from '@/api/ticket-stats';

import { useActiveField } from './StatsPage';
import { useStatsParams } from './utils';
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
  const [rows, setRows] = useState<string[]>([]);
  const [queryParams, setQueryParams] = useState<{
    categoryId?: string;
    customerServiceId?: string;
  }>({});
  const [field] = useActiveField();
  const params = useStatsParams();
  const { data, isFetching, isLoading } = useReplyDetails({
    ...params,
    field: fieldMap[field],
    category: queryParams.categoryId || params.category,
    customerService: queryParams.customerServiceId || params.customerService,
    queryOptions: {
      enabled: open && fieldMap[field] !== undefined,
    },
  });
  const close = () => {
    setQueryParams({});
    setOpen(false);
  };
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
        if (v[1].length > 1) {
          return {
            isMaster: true,
            nid: v[0],
            id: v[0],
            replyTime: _.sumBy(v[1], 'replyTime') / v[1].length,
            children: _.orderBy(v[1], 'replyTime', 'desc'),
          };
        } else {
          return {
            isMaster: true,
            nid: v[0],
            id: v[1][0].id,
            replyTime: v[1][0].replyTime,
          };
        }
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
          onExpandedRowsChange: (values) => setRows(values as string[]),
        }}
        columns={[
          {
            title: '工单',
            dataIndex: 'id',
            key: 'id',
            ellipsis: true,
            render: (
              value,
              obj: {
                id: string;
                nid: string;
                replyTime: number;
                isMaster?: boolean;
              }
            ) => {
              const link =
                obj.nid === obj.id ? `/tickets/${obj.nid}` : `/tickets/${obj.nid}#${obj.id}`;
              const title = obj.isMaster ? obj.nid : `${obj.nid}#${obj.id.slice(0, 6)}`;
              return (
                <a href={link} title={link} target={'_blank'}>
                  {title}
                </a>
              );
            },
          },
          {
            title: '回复时间',
            dataIndex: 'replyTime',
            key: 'replyTime',
            render: (value, obj) => {
              if (obj.id === obj.nid && rows.includes(obj.nid)) {
                return null;
              }
              return formatTime(value);
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
