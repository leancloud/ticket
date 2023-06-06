import { CSRole, RoleNameMap } from '@/api/customer-service';
import Checkbox, { CheckboxGroupProps } from 'antd/lib/checkbox';
import { useMemo } from 'react';

const DefaultOptions: CSRole[] = [CSRole.Admin, CSRole.CustomerService];

export interface RoleCheckboxGroupProps extends CheckboxGroupProps {
  roles?: CSRole[];
  value?: CSRole[];
}

export const RoleCheckboxGroup = ({ roles, defaultValue, ...props }: RoleCheckboxGroupProps) => {
  const options = useMemo<CheckboxGroupProps['options']>(
    () => (roles ?? DefaultOptions).map((v) => ({ label: RoleNameMap[v], value: v })),
    [roles]
  );

  return <Checkbox.Group options={options} {...props} />;
};
