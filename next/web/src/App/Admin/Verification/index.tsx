import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { Button, DatePicker, Popover, Table, Tabs } from 'antd';
import moment, { Moment } from 'moment';
import { isEmpty } from 'lodash-es';

import { http } from '@/leancloud';
import { CustomerServiceSelect } from '@/components/common';
import { TicketLink } from '@/App/Admin/components/TicketLink';

const { RangePicker } = DatePicker;

interface SearchParams {
  userId?: string;
  from?: Moment;
  to?: Moment;
}

interface SearchFormProps {
  value: SearchParams;
  onChange: (params: SearchParams) => void;
}

function SearchForm({ value, onChange }: SearchFormProps) {
  const [tempValue, setTempValue] = useState(value);
  const [errors, setErrors] = useState<Partial<Record<keyof SearchParams, 'error'>>>({});

  useEffect(() => {
    setTempValue(value);
    setErrors({});
  }, [value]);

  const handleChange = () => {
    const tempErrors: typeof errors = {};
    (['userId', 'from', 'to'] as const).forEach((key) => {
      if (!tempValue[key]) {
        tempErrors[key] = 'error';
      }
    });
    setErrors(tempErrors);
    if (!isEmpty(tempErrors)) {
      return;
    }
    onChange(tempValue);
  };

  return (
    <div className="space-x-2 mb-2">
      <CustomerServiceSelect
        placeholder="选择客服"
        value={tempValue.userId}
        onChange={(id) => setTempValue({ ...tempValue, userId: id as string })}
        status={errors.userId}
        style={{ width: 200 }}
      />

      <RangePicker
        allowClear={false}
        value={[tempValue.from ?? null, tempValue.to ?? null]}
        onChange={(value) => {
          setTempValue({
            ...tempValue,
            from: value?.[0] ?? undefined,
            to: value?.[1] ?? undefined,
          });
        }}
        status={errors.from || errors.to}
      />

      <Button type="primary" onClick={handleChange}>
        搜索
      </Button>
    </div>
  );
}

function renderContent(content?: string) {
  if (!content) {
    return '-';
  }
  return (
    <Popover
      placement="bottom"
      content={<div className="max-w-[300px] whitespace-pre-wrap break-all">{content}</div>}
    >
      <div className="max-w-[300px] truncate">{content}</div>
    </Popover>
  );
}

function renderDate(date?: string) {
  if (!date) {
    return '-';
  }
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
}

interface VerificationProps {
  params: SearchParams;
  active: boolean;
}

interface ReplyVerificationSchema {
  id: string;
  content: string;
  createdAt: string;
  ticket?: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  };
}

function ReplyVerification({ params, active }: VerificationProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState<number>();

  const { data: replies, isLoading } = useQuery<ReplyVerificationSchema[]>({
    enabled: active && !isEmpty(params),
    queryKey: ['ReplyVerification', params, page, pageSize],
    queryFn: async () => {
      const res = await http.get('/api/2/verification/reply', {
        params: {
          userId: params.userId,
          from: params.from?.startOf('day').toISOString(),
          to: params.to?.endOf('day').toISOString(),
          page,
          pageSize,
        },
      });
      setTotal(parseInt(res.headers['x-total-count']));
      return res.data;
    },
  });

  return (
    <Table
      loading={isLoading}
      dataSource={replies}
      scroll={{ x: 'max-content' }}
      pagination={{
        pageSize,
        total,
        current: page,
        onChange: (page, pageSize) => {
          setPage(page);
          setPageSize(pageSize);
        },
      }}
      columns={[
        {
          key: 'ticket',
          title: '工单',
          render: ({ ticket }) =>
            ticket ? <TicketLink className="max-w-[300px]" ticket={ticket} /> : '-',
        },
        {
          dataIndex: ['ticket', 'content'],
          title: '工单内容',
          render: renderContent,
        },
        {
          dataIndex: ['ticket', 'createdAt'],
          title: '创建时间',
          render: renderDate,
        },
        {
          dataIndex: 'createdAt',
          title: '回复时间',
          render: renderDate,
        },
        {
          dataIndex: 'content',
          title: '回复内容',
          render: renderContent,
        },
      ]}
    />
  );
}

interface OperationVerificationSchema {
  id: string;
  action: string;
  createdAt: string;
  ticket?: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  };
}

const ACTION_MAP: Record<string, string> = {
  changeAssignee: '修改负责人',
  changeGroup: '修改客服组',
  changeCategory: '修改分类',
  changeFields: '修改字段',
  replyWithNoContent: '点击无需回复',
  replySoon: '点击稍后回复',
  resolve: '点击已解决',
  close: '关闭工单',
  reopen: '重新打开工单',
};

function OperationVerification({ params, active }: VerificationProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState<number>();

  const { data: operations, isFetching } = useQuery<OperationVerificationSchema[]>({
    enabled: active && !isEmpty(params),
    queryKey: ['OperationVerification', params, page, pageSize],
    queryFn: async () => {
      const res = await http.get('/api/2/verification/operation', {
        params: {
          userId: params.userId,
          from: params.from?.startOf('day').toISOString(),
          to: params.to?.endOf('day').toISOString(),
          page,
          pageSize,
        },
      });
      setTotal(parseInt(res.headers['x-total-count']));
      return res.data;
    },
  });

  return (
    <Table
      loading={isFetching}
      dataSource={operations}
      scroll={{ x: 'max-content' }}
      pagination={{
        pageSize,
        total,
        current: page,
        onChange: (page, pageSize) => {
          setPage(page);
          setPageSize(pageSize);
        },
      }}
      columns={[
        {
          key: 'ticket',
          title: '工单',
          render: ({ ticket }) =>
            ticket ? <TicketLink className="max-w-[300px]" ticket={ticket} /> : '-',
        },
        {
          dataIndex: ['ticket', 'content'],
          title: '工单内容',
          render: renderContent,
        },
        {
          dataIndex: ['ticket', 'createdAt'],
          title: '创建时间',
          render: renderDate,
        },
        {
          dataIndex: 'createdAt',
          title: '操作时间',
          render: renderDate,
        },
        {
          dataIndex: 'action',
          title: '操作',
          render: (action) => ACTION_MAP[action] || action,
        },
      ]}
    />
  );
}

export function Verification() {
  const [tabKey, setTabKey] = useState('reply');
  const [params, setParams] = useState<SearchParams>({});

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="p-6 bg-white min-h-full">
        <SearchForm value={params} onChange={setParams} />

        <Tabs
          activeKey={tabKey}
          onChange={setTabKey}
          items={[
            {
              label: '回复',
              key: 'reply',
              children: <ReplyVerification params={params} active={tabKey === 'reply'} />,
            },
            {
              label: '操作',
              key: 'operation',
              children: <OperationVerification params={params} active={tabKey === 'operation'} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
