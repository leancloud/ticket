import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from 'react-query';

import {
  CSRole,
  CustomerServiceSchema,
  RoleNameMap,
  UpdateCustomerServiceData,
  useAddCustomerService,
  useAdmins,
  useCustomerServices,
  useDeleteCustomerService,
  useUpdateCustomerService,
} from '@/api/customer-service';
import { Button, Modal, Popover, Table, TableProps, message } from '@/components/antd';
import { Category, Retry, UserSelect } from '@/components/common';
import { UserLabel } from '@/App/Admin/components';
import { groupBy, sortBy } from 'lodash-es';
import { RoleCheckboxGroup } from '../../components/RoleCheckboxGroup';

function MemberActions({
  id,
  nickname,
  active,
  onEdit,
}: CustomerServiceSchema & { onEdit?: () => void }) {
  const queryClient = useQueryClient();

  const { mutate: update, isLoading: isUpdating } = useUpdateCustomerService({
    onSuccess: () => {
      message.success(`${active ? '禁用' : '启用'}成功`);
      queryClient.invalidateQueries('customerServices');
      queryClient.invalidateQueries('admins');
    },
  });

  const { mutate, isLoading } = useDeleteCustomerService({
    onSuccess: () => {
      message.success('移除成功');
      queryClient.invalidateQueries('customerServices');
      queryClient.invalidateQueries('admins');
    },
  });

  const handleToggleActive = useCallback(() => {
    Modal.confirm({
      title: `${active ? '禁用' : '启用'}客服`,
      content: `是否将 ${nickname} ${active ? '禁用' : '启用'}`,
      okType: 'danger',
      onOk: () => update({ id, active: !active }),
    });
  }, [update, id, active, nickname]);

  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '移除客服',
      content: `是否将 ${nickname} 从客服中移除？移除可能会导致用户相关数据丢失`,
      okType: 'danger',
      onOk: () => mutate(id),
    });
  }, [id, mutate, nickname]);

  return (
    <div>
      {onEdit && (
        <Button type="link" size="small" disabled={isUpdating || isLoading} onClick={onEdit}>
          编辑
        </Button>
      )}
      <Button
        type="link"
        size="small"
        disabled={isUpdating || isLoading}
        onClick={handleToggleActive}
      >
        {active ? '禁用' : '启用'}
      </Button>
      <Button
        danger
        type="link"
        size="small"
        disabled={isUpdating || isLoading}
        onClick={handleDelete}
      >
        移除
      </Button>
    </div>
  );
}

interface AddUserModalProps {
  visible: boolean;
  onHide: () => void;
}

function AddUserModal({ visible, onHide }: AddUserModalProps) {
  const [userId, setUserId] = useState<string | undefined>();
  const [roles, setRoles] = useState<CSRole[]>([CSRole.CustomerService]);

  useEffect(() => {
    setUserId(undefined);
  }, [visible]);

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useAddCustomerService({
    onSuccess: () => {
      message.success('添加成功');
      queryClient.invalidateQueries('customerServices');
      queryClient.invalidateQueries('admins');
      onHide();
    },
  });

  const handleAdd = useCallback(() => {
    mutate({ userId: userId!, roles });
  }, [mutate, userId, roles]);

  return (
    <Modal
      visible={visible}
      title="添加客服"
      onOk={handleAdd}
      confirmLoading={isLoading}
      okButtonProps={{ disabled: isLoading || !userId || !roles.length }}
      onCancel={() => onHide()}
      cancelButtonProps={{ disabled: isLoading }}
    >
      <UserSelect className="w-full" autoFocus value={userId} onChange={setUserId as any} />
      {userId && (
        <RoleCheckboxGroup
          value={roles}
          onChange={(v) => setRoles(v as CSRole[])}
          className="!mt-3"
        />
      )}
    </Modal>
  );
}

interface EditUserModalRef {
  open: (id: string, roles: CSRole[]) => void;
}

const EditUserModal = forwardRef<EditUserModalRef>((_, ref) => {
  const [userId, setUserId] = useState<string | undefined>();
  const [roles, setRoles] = useState<CSRole[] | undefined>();
  const [visible, setVisible] = useState(false);

  const queryClient = useQueryClient();

  const handleOpen = useCallback<EditUserModalRef['open']>((id, roles) => {
    setUserId(id);
    setRoles(roles);
    setVisible(true);
  }, []);

  useImperativeHandle(ref, () => ({ open: handleOpen }), [handleOpen]);

  const { mutate: update, isLoading: isUpdating } = useUpdateCustomerService({
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries('customerServices');
      queryClient.invalidateQueries('admins');
      setVisible(false);
    },
  });

  const handleUpdate = useCallback(() => {
    update({ id: userId!, roles });
  }, [roles, update, userId]);

  const handleCancel = useCallback(() => setVisible(false), []);

  return (
    <Modal
      visible={visible}
      title="更新客服"
      onOk={handleUpdate}
      confirmLoading={isUpdating}
      okButtonProps={{ disabled: isUpdating || !userId || roles?.length === 0 }}
      onCancel={handleCancel}
      cancelButtonProps={{ disabled: isUpdating }}
    >
      <RoleCheckboxGroup value={roles} onChange={(v) => setRoles(v as CSRole[])} />
    </Modal>
  );
});

interface CustomerService extends CustomerServiceSchema {
  roles: CSRole[];
}

const appendRoles = (roles: CSRole[]) => (user: CustomerServiceSchema): CustomerService => ({
  ...user,
  roles: roles,
});

export function Members() {
  const customerServiceResult = useCustomerServices();
  const adminsResult = useAdmins();

  const customerServices = useMemo(() => {
    if (!(customerServiceResult.data && adminsResult.data)) {
      return [];
    }
    const customerServices = groupBy(customerServiceResult.data, (cs) =>
      adminsResult.data.find((admin) => admin.id === cs.id) === undefined ? 'agent' : 'mixed'
    );
    const agents = customerServices['agent']?.map(appendRoles([CSRole.CustomerService])) ?? [];
    const mixed =
      customerServices['mixed']?.map(appendRoles([CSRole.Admin, CSRole.CustomerService])) ?? [];
    const admins = adminsResult.data
      .filter((admin) => mixed.find((user) => user.id === admin.id) === undefined)
      .map(appendRoles([CSRole.Admin]));
    return sortBy([...agents, ...mixed, ...admins], 'email');
  }, [adminsResult.data, customerServiceResult.data]);

  const [addUserModalVisible, setAddUserModalVisible] = useState(false);

  const editUserModalRef = useRef<EditUserModalRef | null>(null);

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">客服</h1>

      <div className="flex flex-row-reverse">
        <Button type="primary" onClick={() => setAddUserModalVisible(true)}>
          添加
        </Button>
      </div>

      <AddUserModal visible={addUserModalVisible} onHide={() => setAddUserModalVisible(false)} />

      <EditUserModal ref={editUserModalRef} />

      {customerServiceResult.error && (
        <Retry
          message="获取客服失败"
          error={customerServiceResult.error}
          onRetry={customerServiceResult.refetch}
        />
      )}

      <Table
        className="mt-5"
        rowKey="id"
        pagination={false}
        loading={customerServiceResult.isLoading}
        dataSource={customerServices}
      >
        <Table.Column
          key="customerService"
          title="客服"
          render={(user) => <UserLabel user={user} />}
        />
        <Table.Column
          dataIndex="roles"
          title="角色"
          render={(roles: CSRole[]) => roles.map((v) => RoleNameMap[v]).join(', ')}
        />
        <Table.Column
          dataIndex="categoryIds"
          title="负责分类"
          render={(categoryIds: string[]) => (
            <Popover
              content={
                categoryIds.length === 0
                  ? '无'
                  : categoryIds.map((categoryId) => (
                      <Category
                        key={categoryId}
                        className="text-sm py-0.5 mr-0.5 mb-1"
                        categoryId={categoryId}
                        path
                      />
                    ))
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {categoryIds.length === 0 ? '-' : categoryIds.length}
              </div>
            </Popover>
          )}
        />
        <Table.Column
          dataIndex="active"
          title="状态"
          render={(active: boolean) => (active ? '🟢 正常' : '⚪️ 已禁用')}
        />
        <Table.Column
          key="actions"
          title="操作"
          render={(_, v: CustomerService) => (
            <MemberActions
              {...v}
              onEdit={() => {
                editUserModalRef.current?.open(v.id, v.roles);
              }}
            />
          )}
        />
      </Table>
    </div>
  );
}
