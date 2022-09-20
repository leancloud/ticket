import { useParams, Link } from 'react-router-dom';

import { CategoryFieldStatsSchema, useCategoryFieldStats } from '@/api/category';
import { Table, Breadcrumb, Tooltip } from 'antd';
import { TicketFieldSchema } from '@/api/ticket-field';
import { TicketFieldType } from '../TicketFields/TicketFieldType';
import { LOCALES } from '@/i18n/locales';

type ArrayType<T extends unknown[] | ReadonlyArray<unknown>> = T extends
  | Array<infer R>
  | ReadonlyArray<infer R>
  ? R
  : never;

export const CategoryFieldStats = () => {
  const { id } = useParams<'id'>();
  const { data, isLoading } = useCategoryFieldStats({ id: id as string });

  const sorter = (key: keyof ArrayType<CategoryFieldStatsSchema['options']>['count']) => (
    a: ArrayType<CategoryFieldStatsSchema['options']>,
    b: ArrayType<CategoryFieldStatsSchema['options']>
  ) => b.count[key] - a.count[key];

  return (
    <div className="p-10">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="..">分类</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{id}</Breadcrumb.Item>
      </Breadcrumb>

      <Table
        loading={isLoading}
        rowKey="id"
        size="small"
        dataSource={data}
        pagination={false}
        expandable={{
          expandedRowRender: ({ options }: CategoryFieldStatsSchema) => (
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
                render={(value: string, record: ArrayType<CategoryFieldStatsSchema['options']>) => (
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
                dataIndex={['count', 'close']}
                title="关闭数量"
                sorter={sorter('close')}
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
