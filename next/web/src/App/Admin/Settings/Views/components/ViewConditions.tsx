import { Form } from 'antd';

import { ConditionsGroup } from '../../Automations/components/TriggerForm/Conditions';
import { conditions } from '../conditions';

export function ViewConditions() {
  return (
    <Form.Item label="条件">
      <ConditionsGroup config={conditions} name="conditions" />
    </Form.Item>
  );
}
