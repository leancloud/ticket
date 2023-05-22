import { Controller, Control, useWatch, useController } from 'react-hook-form';
import moment from 'moment';

import { Checkbox, DatePicker, Form, Input } from '@/components/antd';

export interface ArticleFormProps {
  control: Control<any, any>;
}

export function ArticleForm({ control }: ArticleFormProps) {
  const isPrivate = useWatch({ control, name: 'private' });

  const publishedFrom = useController({ control, name: 'publishedFrom' });
  const publishedTo = useController({ control, name: 'publishedTo' });

  return (
    <>
      <Controller
        control={control}
        name="name"
        rules={{ required: '请填写此字段' }}
        defaultValue=""
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={{ marginBottom: 16 }}
            label="名称"
          >
            <Input {...field} id="name" autoFocus placeholder="名称" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="private"
        render={({ field: { value, onChange } }) => (
          <Form.Item style={{ marginBottom: 16 }}>
            <Checkbox
              checked={!value}
              onChange={(e) => {
                onChange(!e.target.checked);
                if (!e.target.checked) {
                  publishedFrom.field.onChange(null);
                  publishedTo.field.onChange(null);
                }
              }}
              children="发布"
            />
          </Form.Item>
        )}
      />

      {!isPrivate && (
        <Form.Item label="发布时间">
          <DatePicker.RangePicker
            allowClear
            showTime
            allowEmpty={[true, true]}
            value={[
              publishedFrom.field.value && moment(publishedFrom.field.value),
              publishedTo.field.value && moment(publishedTo.field.value),
            ]}
            onChange={(value) => {
              publishedFrom.field.onChange(value?.[0]?.toISOString() ?? null);
              publishedTo.field.onChange(value?.[1]?.toISOString() ?? null);
            }}
          />
        </Form.Item>
      )}
    </>
  );
}
