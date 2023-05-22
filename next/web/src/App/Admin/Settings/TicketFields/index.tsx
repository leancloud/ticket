import { useMutation, useQueryClient } from 'react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import cx from 'classnames';

import {
  createTicketField,
  TicketFieldSchema,
  updateTicketField,
  UpdateTicketFieldData,
  useTicketField,
  useTicketFields,
} from '@/api/ticket-field';
import { Button, Spin, Table, TableProps, Tabs, message } from '@/components/antd';
import { usePage, usePageSize } from '@/utils/usePage';
import { useSearchParam } from '@/utils/useSearchParams';
import { TicketFieldType } from './TicketFieldType';
import { TicketFieldForm } from './TicketFieldForm';

export * from './TicketFieldIcon';

const { Column } = Table;
const { TabPane } = Tabs;

interface TicketFieldActionsProps {
  field: TicketFieldSchema;
}

function TicketFieldActions({ field }: TicketFieldActionsProps) {
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: ({ id, ...data }: UpdateTicketFieldData & { id: string }) =>
      updateTicketField(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticketFields']);
    },
  });

  const handleChangeActive = () => {
    mutateAsync({ id: field.id, active: !field.active })
      .then(() => message.success(`字段「${field.title}」已${field.active ? '停用' : '启用'}`))
      .catch((error) => message.error(error.message));
  };

  return (
    <button
      className={cx('text-primary', {
        'text-[#ff4d4f]': field.active,
        'text-gray-300': isLoading,
      })}
      disabled={isLoading}
      onClick={handleChangeActive}
    >
      {field.active ? '停用' : '启用'}
    </button>
  );
}

function TicketFieldTable(props: TableProps<TicketFieldSchema>) {
  return (
    <Table {...props} rowKey="id">
      <Column
        title="标题"
        dataIndex="title"
        render={(title, field: TicketFieldSchema) => <Link to={field.id}>{title}</Link>}
      />
      <Column title="类型" dataIndex="type" render={(type) => <TicketFieldType type={type} />} />
      <Column
        title="修改日期"
        dataIndex="updatedAt"
        render={(value) => new Date(value).toLocaleString()}
      />
      <Column
        title="操作"
        dataIndex="active"
        render={(_, field: TicketFieldSchema) => <TicketFieldActions field={field} />}
      />
    </Table>
  );
}

export function TicketFieldList() {
  const [active = 'true', setActive] = useSearchParam('active');
  const [page, { set: setPage }] = usePage();
  const [pageSize = 20, setPageSize] = usePageSize();
  const { data, totalCount, isLoading } = useTicketFields({
    page,
    pageSize,
    active: active === 'true',
    orderBy: 'updatedAt-desc',
    count: true,
    queryOptions: {
      keepPreviousData: true,
      staleTime: 1000 * 60,
    },
  });

  const handleChangeActive = (value: string) => {
    setPage(1);
    setActive(value, { replace: true });
  };

  return (
    <div className="p-10 pb-0">
      <h1 className="text-[#2f3941] text-[26px] font-normal">工单字段</h1>
      <div className="flex">
        <div className="grow"></div>
        <Link to="new">
          <Button type="primary">新增字段</Button>
        </Link>
      </div>

      <Tabs
        activeKey={active === 'true' ? 'active' : 'inactive'}
        onChange={(key) => handleChangeActive(key === 'active' ? 'true' : 'false')}
      >
        <TabPane tab="启用" key="active" />
        <TabPane tab="停用" key="inactive" />
      </Tabs>

      {isLoading && <div className="h-80 my-40 text-center" children={<Spin />} />}

      {data && (
        <TicketFieldTable
          dataSource={data}
          pagination={{
            pageSize,
            onChange: (page, size) => {
              setPage(page);
              setPageSize(size);
            },
            current: page,
            total: totalCount,
          }}
        />
      )}
    </div>
  );
}

export function NewTicketField() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation({
    mutationFn: createTicketField,
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries(['ticketFields']);
      navigate('..');
    },
  });

  return (
    <TicketFieldForm
      initData={{
        defaultLocale: 'zh-cn',
        variants: [
          {
            locale: 'zh-cn',
            title: '',
            titleForCustomerService: '',
            description: '',
          },
        ],
      }}
      onCancel={() => navigate('..')}
      submitting={isLoading}
      onSubmit={(data) => {
        mutate({
          type: data.type,
          title: data.title,
          visible: data.visible,
          required: data.required,
          defaultLocale: data.defaultLocale,
          meta: data.meta,
          pattern: data.pattern,
          variants: data.variants,
        });
      }}
    />
  );
}

export function TicketFieldDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useTicketField(id!);

  const queryClient = useQueryClient();
  const { mutate, isLoading: isSaving } = useMutation({
    mutationFn: (data: UpdateTicketFieldData) => updateTicketField(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticketFields']);
      queryClient.invalidateQueries(['ticketField', id]);
      message.success('保存成功');
    },
  });

  if (isLoading) {
    return (
      <div className="text-center my-40">
        <Spin />
      </div>
    );
  }
  return (
    <TicketFieldForm
      disableType
      initData={data}
      onCancel={() => navigate('..')}
      submitting={isSaving}
      onSubmit={(data) => {
        mutate({
          title: data.title,
          visible: data.visible,
          required: data.required,
          defaultLocale: data.defaultLocale,
          meta: data.meta ?? null,
          pattern: data.pattern,
          variants: data.variants!,
        });
      }}
    />
  );
}
