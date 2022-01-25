import { useImperativeHandle, useRef } from 'react';
import { useController } from 'react-hook-form';

import { Checkbox, Col, Form, Row } from '@/components/antd';
import { Help } from './Help';

export interface CheckboxGroupProps {
  name: string;
  label: string;
  description?: string;
  options?: { title: string; value: string }[];
  required?: boolean;
}

export function CheckboxGroup({ name, label, description, options, required }: CheckboxGroupProps) {
  const {
    field: { ref, value, onChange },
    fieldState: { error },
  } = useController({
    name,
    rules: {
      required: {
        value: !!required,
        message: `请选择${label}`,
      },
    },
  });

  const $group = useRef<HTMLDivElement>(null!);

  useImperativeHandle(ref, () => ({
    focus: () => $group.current.scrollIntoView(),
  }));

  return (
    <Form.Item
      label={label}
      required={required}
      help={error?.message || <Help content={description} />}
      validateStatus={error ? 'error' : undefined}
    >
      <Checkbox.Group
        ref={$group}
        className="w-full"
        value={value}
        onChange={(value) => onChange(value.length ? value : undefined)}
      >
        <Row gutter={[0, 6]}>
          {options?.map(({ title, value }, index) => (
            <Col key={index} xs={24} sm={12}>
              <Checkbox value={value}>{title}</Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
    </Form.Item>
  );
}
