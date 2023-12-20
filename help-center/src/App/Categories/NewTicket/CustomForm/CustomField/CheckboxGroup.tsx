import { useImperativeHandle, useRef } from 'react';
import { useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CustomFieldProps } from './';
import { Checkbox, Col, Form, Row } from '@/components/antd';
import { Help } from './Help';

export function CheckboxGroup({ id, title, description, options, required }: CustomFieldProps) {
  const [t] = useTranslation();
  const {
    field: { ref, value, onChange },
    fieldState: { error },
  } = useController({
    name: id,
    rules: {
      required: {
        value: !!required,
        message: t('ticket.fill', { value: title }),
      },
    },
  });

  const $group = useRef<HTMLDivElement>(null!);

  useImperativeHandle(ref, () => ({
    focus: () => $group.current.scrollIntoView(),
  }));

  return (
    <Form.Item
      label={title}
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
