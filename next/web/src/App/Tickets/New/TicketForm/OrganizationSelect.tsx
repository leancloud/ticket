import { forwardRef } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useCurrentUser } from '@/leancloud';
import { OrganizationSchema } from '@/api/organization';
import { Select, SelectProps } from '@/components/antd';

const { OptGroup, Option } = Select;

export interface OrganizationSelectProps extends Omit<SelectProps<string | undefined>, 'options'> {
  options?: OrganizationSchema[];
}

export const OrganizationSelect = forwardRef<RefSelectProps, OrganizationSelectProps>(
  ({ options, value, onChange, ...props }, ref) => {
    const currentUser = useCurrentUser();

    return (
      <Select
        {...props}
        ref={ref}
        value={value ?? ''}
        onChange={(value, option) => onChange?.(value || undefined, option)}
      >
        {currentUser && (
          <OptGroup label="个人">
            <Option value="">{currentUser.displayName}</Option>
          </OptGroup>
        )}
        {options && (
          <OptGroup label="组织">
            {options?.map(({ id, name }) => (
              <Option key={id} value={id}>
                {name}
              </Option>
            ))}
          </OptGroup>
        )}
      </Select>
    );
  }
);
