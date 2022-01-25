import { useImperativeHandle, useRef } from 'react';
import { useController } from 'react-hook-form';

import { Col, Form, Radio, Row } from '@/components/antd';
import { Help } from './Help';

export interface RadioGroupProps {
  name: string;
  label: string;
  description?: string;
  options?: { title: string; value: string }[];
  required?: boolean;
}

export function RadioGroup({ name, label, description, options, required }: RadioGroupProps) {
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
      <Radio.Group ref={$group} className="w-full" value={value} onChange={onChange}>
        <Row gutter={[0, 6]}>
          {options?.map(({ title, value }, index) => (
            <Col key={index} xs={24} sm={12}>
              <Radio value={value}>{title}</Radio>
            </Col>
          ))}
        </Row>
      </Radio.Group>
    </Form.Item>
  );
}
