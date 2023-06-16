import {
  CustomerServicePermissions,
  useCurrentUserIsAdmin,
  useCurrentUserIsCustomerService,
  useCurrentUserPermissions,
} from '@/leancloud';
import { Result } from 'antd';

export interface RequirePermissionProps {
  permission: keyof CustomerServicePermissions;
  limitCSOnly?: boolean;
  content?: JSX.Element | null;
  children: JSX.Element;
}

export const RequirePermission = ({
  permission,
  content,
  limitCSOnly,
  children,
}: RequirePermissionProps) => {
  const isCustomerService = useCurrentUserIsCustomerService();
  const isAdmin = useCurrentUserIsAdmin();
  const userPermissions = useCurrentUserPermissions();

  if (!isAdmin && (!limitCSOnly || isCustomerService) && !userPermissions[permission]) {
    return content !== undefined ? (
      content
    ) : (
      <Result status="403" title="403" subTitle="你没有对应的权限，请联系管理员" />
    );
  }

  return children;
};
