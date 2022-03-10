import { forwardRef, useEffect, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { TextAreaRef } from 'antd/lib/input/TextArea';

import { Form, Input, Select } from '@/components/antd';

const { TextArea } = Input;
const { Option } = Select;

interface JSONInputProps {
  value: string;
  onChange: (value: string) => void;
}

const JSONInput = forwardRef<TextAreaRef, JSONInputProps>(({ value, onChange }, ref) => {
  const [tempValue, setTempValue] = useState(() => {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  });
  const $onChange = useRef(onChange);
  $onChange.current = onChange;

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        $onChange.current(JSON.parse(tempValue));
      } catch {
        $onChange.current('');
      }
    }, 500);
    return () => {
      clearTimeout(id);
    };
  }, [tempValue]);

  return (
    <TextArea
      ref={ref}
      placeholder="请填写 JSON 字符串"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
    />
  );
});

export function MetaData({ path }: { path: string }) {
  return (
    <>
      <Controller
        name={`${path}.path`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <Input {...field} placeholder="path" style={{ width: 200 }} />
          </Form.Item>
        )}
      />

      <Controller
        name={`${path}.op`}
        rules={{ required: true }}
        defaultValue="is"
        render={({ field }) => (
          <Select {...field} style={{ width: 200 }}>
            <Option value="is">是</Option>
          </Select>
        )}
      />

      <Controller
        name={`${path}.value`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item className="w-full" validateStatus={error ? 'error' : undefined}>
            <JSONInput {...field} />
          </Form.Item>
        )}
      />
    </>
  );
}
