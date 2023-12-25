import { Checkbox, Spin } from 'antd';

import {
  CollaboratorPrivileges,
  useCollaboratorPrivileges,
  useSetCollaboratorPrivileges,
} from '@/api/collaborator';

interface PrivilegeItem {
  key?: keyof CollaboratorPrivileges;
  title: string;
}

export function Privileges() {
  const { data: privileges } = useCollaboratorPrivileges();
  const { mutate, isLoading: isMutating } = useSetCollaboratorPrivileges();

  const privilegeItems: PrivilegeItem[] = [
    {
      title: '查看分配给其的工单',
    },
    {
      title: '创建内部回复',
    },
    {
      key: 'createPublicReply',
      title: '创建公开回复',
    },
  ];

  if (!privileges) {
    return <Spin />;
  }

  return (
    <ul>
      {privilegeItems.map(({ key, title }, index) => {
        const enabled = !!privileges['createPublicReply'];
        return (
          <li key={key || index} className="space-x-1">
            <span className={key && (enabled ? undefined : 'line-through')}>{title}</span>
            {key && (
              <Checkbox
                checked={enabled}
                disabled={isMutating}
                onChange={(e) => mutate({ ...privileges, [key]: e.target.checked })}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
