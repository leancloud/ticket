import { useParams, Link, Navigate } from 'react-router-dom';
import { Table, Breadcrumb, Tooltip, DatePicker } from 'antd';

import { TicketFieldSchema } from '@/api/ticket-field';
import { TicketFieldType } from '../TicketFields/TicketFieldType';
import { LOCALES } from '@/i18n/locales';
import { useRangePicker } from '../../Stats/utils';
import { useTicketFieldCount, TicketFieldCountSchema } from '@/api/ticket-field';
import { ArrayType } from '@/utils/types';

export const CategoryFieldCount = () => {
  const { id } = useParams<'id'>();
  const [range, rangePickerOptions] = useRangePicker();
  const { data, isLoading } = useTicketFieldCount({ categoryId: id, ...range });

  if (!id) {
    return <Navigate to=".." />;
  }

  const sorter = (key: keyof ArrayType<TicketFieldCountSchema['options']>['count']) => (
    a: ArrayType<TicketFieldCountSchema['options']>,
    b: ArrayType<TicketFieldCountSchema['options']>
  ) => b.count[key] - a.count[key];

  return (
    <div className="p-10">
      <div className="flex flex-row justify-between items-end">
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <Link to="..">分类</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{id}</Breadcrumb.Item>
        </Breadcrumb>

        <div className="flex flex-col items-end space-y-1 mb-1">
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>*统计数据每日凌晨两点更新</span>
          <DatePicker.RangePicker {...rangePickerOptions} />
        </div>
      </div>

      <Table
        loading={isLoading}
        rowKey="id"
        size="small"
        dataSource={data}
        pagination={false}
        expandable={{
          expandedRowRender: ({ options }: TicketFieldCountSchema) => (
            <Table
              dataSource={options}
              rowKey="value"
              size="small"
              pagination={false}
              showHeader={true}
            >
              <Table.Column dataIndex="value" title="选项值" />
              <Table.Column
                dataIndex="title"
                title="选项名"
                render={(value: string, record: ArrayType<TicketFieldCountSchema['options']>) => (
                  <Tooltip title={`选项名显示地区: ${LOCALES[record.displayLocale]}`}>
                    {value}
                  </Tooltip>
                )}
              />
              <Table.Column
                dataIndex={['count', 'open']}
                title="开启数量"
                sorter={sorter('open')}
                width="10%"
              />
              <Table.Column
                dataIndex={['count', 'closed']}
                title="关闭数量"
                sorter={sorter('closed')}
                width="10%"
              />
              <Table.Column
                dataIndex={['count', 'total']}
                title="总数量"
                sorter={sorter('total')}
                width="10%"
              />
            </Table>
          ),
        }}
      >
        <Table.Column dataIndex="title" title="字段名称" />
        <Table.Column
          dataIndex="type"
          title="字段类型"
          render={(value: TicketFieldSchema['type']) => <TicketFieldType type={value} />}
        />
      </Table>
    </div>
  );
};
