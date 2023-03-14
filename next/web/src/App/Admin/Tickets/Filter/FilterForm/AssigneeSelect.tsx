import { useMemo } from 'react';

import { useCustomerServices } from '@/api/user';
import { Select } from '@/components/antd';
import { useCollaborators } from '@/api/collaborator';

interface UseAssigneeSelectOptionsOptions {
  includeCollaborators?: boolean;
}

function useAssigneeSelectOptions({ includeCollaborators }: UseAssigneeSelectOptionsOptions) {
  const { data: customerServices, isLoading: loadingCustomerServices } = useCustomerServices();
  const { data: collaborators, isLoading: loadingCollaborators } = useCollaborators({
    enabled: includeCollaborators,
  });

  const options = useMemo(() => {
    const options: any[] = [{ label: '(未分配)', value: 'null' }];
    const groups: { label: string; options: any[] }[] = [];

    if (customerServices?.length) {
      groups.push({
        label: '客服',
        options: customerServices.map((user) => ({ label: user.nickname, value: user.id })),
      });
    }

    if (includeCollaborators && collaborators?.length) {
      groups.push({
        label: '协作者',
        options: collaborators.map((user) => ({ label: user.nickname, value: user.id })),
      });
    }

    if (groups.length) {
      if (groups.length === 1) {
        groups[0].options.forEach((option) => options.push(option));
      } else {
        groups.forEach((group) => options.push(group));
      }
    }

    return options;
  }, [customerServices, collaborators, includeCollaborators]);

  const isLoading = loadingCustomerServices || loadingCollaborators;

  return { options, isLoading };
}

export interface AssigneeSelectProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  disabled?: boolean;
  includeCollaborators?: boolean;
}

export function AssigneeSelect({
  value,
  onChange,
  disabled,
  includeCollaborators,
}: AssigneeSelectProps) {
  const { options, isLoading } = useAssigneeSelectOptions({ includeCollaborators });

  return (
    <Select
      className="w-full"
      mode="multiple"
      showArrow
      placeholder={isLoading ? 'Loading...' : '任何'}
      loading={isLoading}
      options={options}
      optionFilterProp="label"
      value={value}
      onChange={(v) => onChange(v.length ? v : undefined)}
      disabled={disabled}
    />
  );
}
