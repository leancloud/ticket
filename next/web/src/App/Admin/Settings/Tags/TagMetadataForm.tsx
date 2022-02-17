import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  AiFillQuestionCircle,
  AiOutlinePlus,
  AiOutlineDown,
  AiOutlineUp,
  AiOutlineClose,
} from 'react-icons/ai';

import { Button, Checkbox, Radio, Form, Input, Tooltip } from '@/components/antd';
import style from './index.module.css';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

function MyTooltip({ title }: { title: string }) {
  return (
    <Tooltip placement="right" title={title}>
      <AiFillQuestionCircle className="inline-block w-4 h-4" />
    </Tooltip>
  );
}

interface TempFormData {
  key?: string;
  private?: boolean;
  type?: 'select' | 'text';
  values?: { value: string }[];
}

export interface TagMetadataFormData {
  key: string;
  private: boolean;
  type: 'select' | 'text';
  values?: string[];
}

export interface TagMetadataFormProps {
  initData?: Partial<TagMetadataFormData>;
  loading?: boolean;
  onSubmit: (data: TagMetadataFormData) => void;
}

export function TagMetadataForm({ initData, loading, onSubmit }: TagMetadataFormProps) {
  const defaultValues = useMemo(() => {
    if (initData) {
      return {
        ...initData,
        values: initData.values?.map((value) => ({ value })),
      };
    }
  }, []);
  const { control, handleSubmit } = useForm<TempFormData>({ defaultValues });
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'values' });
  const type = useWatch({ control, name: 'type', defaultValue: 'select' });

  const submitHandler = (data: TempFormData) => {
    onSubmit({
      ...(data as Required<TempFormData>),
      values: data.values?.map((t) => t.value),
    });
  };

  return (
    <Form className={style.tagForm} layout="vertical" onFinish={handleSubmit(submitHandler)}>
      <Controller
        control={control}
        name="key"
        rules={{ required: '请填写此字段' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            required
            label="标签名称"
            htmlFor="tag_form_key"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} id="tag_form_key" autoFocus />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="private"
        defaultValue={false}
        render={({ field }) => (
          <Form.Item className={style.privilege} label="权限">
            <Checkbox {...field} checked={field.value}>
              非公开
            </Checkbox>
            <MyTooltip title="该标签用户不可见，只有技术支持人员可见。" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="type"
        defaultValue="select"
        render={({ field }) => (
          <Form.Item label="类型">
            <Radio.Group {...field}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center">
                  <Radio value="select">下拉选择</Radio>
                  <MyTooltip title="用户只能在预设的标签值中选择一个。" />
                </div>
                <div className="flex items-center">
                  <Radio value="text">任意文本</Radio>
                  <MyTooltip title="用户可以输入任意文本作为标签值。" />
                </div>
              </div>
            </Radio.Group>
          </Form.Item>
        )}
      />

      {type === 'select' && (
        <Form.Item label="标签可选值">
          {fields.map(({ id }, index) => (
            <Controller
              key={id}
              control={control}
              name={`values.${index}.value`}
              rules={{ required: '请填写此字段' }}
              render={({ field, fieldState: { error } }) => (
                <div className="flex gap-2 mb-2">
                  <Form.Item
                    style={{ marginBottom: 0, flexGrow: 1 }}
                    validateStatus={error ? 'error' : undefined}
                    help={error?.message}
                  >
                    <Input {...field} />
                  </Form.Item>
                  <Button
                    icon={<AiOutlineUp className="m-auto" />}
                    disabled={index === 0}
                    onClick={() => swap(index, index - 1)}
                  />
                  <Button
                    icon={<AiOutlineDown className="m-auto" />}
                    disabled={index === fields.length - 1}
                    onClick={() => swap(index, index + 1)}
                  />
                  <Button
                    icon={<AiOutlineClose className="m-auto" />}
                    onClick={() => remove(index)}
                  />
                </div>
              )}
            />
          ))}
          <Button
            size="small"
            icon={<AiOutlinePlus className="m-auto" />}
            onClick={() => append({ value: '' })}
          />
        </Form.Item>
      )}

      <div>
        <Button type="primary" htmlType="submit" loading={loading}>
          保存
        </Button>
        <Link className="ml-2" to="..">
          <Button disabled={loading}>返回</Button>
        </Link>
      </div>
    </Form>
  );
}
