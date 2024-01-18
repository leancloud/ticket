import { Controller } from 'react-hook-form';
import { Form, FormItemProps, Radio, Select } from 'antd';

export function ViewSort(props?: FormItemProps) {
  return (
    <Form.Item label="排序依据" {...props}>
      <div className="flex items-center gap-4">
        <Controller
          name="sortBy"
          defaultValue="createdAt"
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { label: '状态', value: 'status' },
                { label: '创建时间', value: 'createdAt' },
                { label: '更新时间', value: 'updatedAt' },
              ]}
              style={{ width: 200 }}
            />
          )}
        />
        <Controller
          name="sortOrder"
          defaultValue="desc"
          render={({ field: { value, onChange } }) => (
            <Radio.Group value={value} onChange={onChange}>
              <Radio value="asc">正序</Radio>
              <Radio value="desc">倒序</Radio>
            </Radio.Group>
          )}
        />
      </div>
    </Form.Item>
  );
}
