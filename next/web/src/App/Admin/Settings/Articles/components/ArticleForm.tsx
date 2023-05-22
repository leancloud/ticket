import { useMemo } from 'react';
import { Controller, Control, useController } from 'react-hook-form';
import moment from 'moment';

import { Checkbox, DatePicker, Form, Input } from '@/components/antd';

export interface ArticleFormProps {
  control: Control<any, any>;
}

export function ArticleForm({ control }: ArticleFormProps) {
  const publishedFrom = useController({ control, name: 'publishedFrom' });
  const publishedTo = useController({ control, name: 'publishedTo' });

  const isDummyUnpublished = useMemo(() => {
    return (
      publishedFrom.field.value &&
      publishedTo.field.value &&
      new Date(publishedFrom.field.value).getTime() === 0 &&
      new Date(publishedTo.field.value).getTime() === 0
    );
  }, [publishedFrom.field.value, publishedTo.field.value]);

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

      <Form.Item style={{ marginBottom: 16 }}>
        <Checkbox
          checked={!isDummyUnpublished}
          onChange={(e) => {
            if (e.target.checked) {
              publishedFrom.field.onChange(null);
              publishedTo.field.onChange(null);
            } else {
              publishedFrom.field.onChange(new Date(0).toISOString());
              publishedTo.field.onChange(new Date(0).toISOString());
            }
          }}
          children="发布"
        />
      </Form.Item>

      {!isDummyUnpublished && (
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
