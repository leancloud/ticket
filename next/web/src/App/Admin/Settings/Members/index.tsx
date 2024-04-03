import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { groupBy, sortBy } from 'lodash-es';

import {
  CSRole,
  CustomerServiceSchema,
  RoleNameMap,
  UpdateCustomerServiceData,
  useAddCustomerService,
  useAdmins,
  useBatchUpdateCustomerService,
  useCustomerServices,
  useDeleteCustomerService,
  useUpdateCustomerService,
} from '@/api/customer-service';
import {
  Button,
  Modal,
  Popover,
  Table,
  message,
  FormInstance,
  Radio,
  Dropdown,
} from '@/components/antd';
import { Category, Retry, UserSelect } from '@/components/common';
import { UserLabel } from '@/App/Admin/components';
import { RoleCheckboxGroup } from '@/App/Admin/components/RoleCheckboxGroup';
import { CustomerServiceForm, CustomerServiceFormData } from './components/CustomerServiceForm';

function MemberActions({
  id,
  nickname,
  active,
  onEdit,
}: Pick<CustomerServiceSchema, 'id' | 'nickname' | 'active'> & { onEdit?: () => void }) {
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

  const handleToggleActive = () => {
    update({ id, active: !active });
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '移除客服',
      content: `是否将 ${nickname} 从客服中移除？移除可能会导致用户相关数据丢失`,
      okType: 'danger',
      onOk: () => mutate(id),
    });
  };

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

  return (
    <Modal
      visible={visible}
      title="添加客服"
      onOk={() => mutate({ userId: userId!, roles })}
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

interface EditUserModalProps {
  open?: boolean;
  title?: string;
  isLoading?: boolean;
  initData?: CustomerServiceFormData;
  onSave?: (data: CustomerServiceFormData) => void;
  onClose?: () => void;
  batch?: boolean;
}

const EditUserModal = ({
  open,
  title,
  isLoading,
  initData,
  onSave,
  onClose,
  batch,
}: EditUserModalProps) => {
  const formRef = useRef<FormInstance>(null);

  return (
    <Modal
      destroyOnClose
      open={open}
      title={title}
      onOk={() => formRef.current?.submit()}
      confirmLoading={isLoading}
      onCancel={onClose}
      cancelButtonProps={{ disabled: isLoading }}
    >
      <CustomerServiceForm
        ref={formRef}
        initData={initData}
        onSubmit={onSave}
        fields={batch ? { roles: true } : undefined}
      />
    </Modal>
  );
};

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

  const [active, setActive] = useState(true);
  const filteredCustomerServices = useMemo(() => {
    return customerServices.filter((c) => c.active === active);
  }, [customerServices, active]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<CustomerServiceFormData>();

  const queryClient = useQueryClient();

  const { mutate: update, isLoading: isUpdating } = useBatchUpdateCustomerService({
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries('customerServices');
      queryClient.invalidateQueries('admins');
      setSelectedIds([]);
      setEditingIds([]);
      setEditFormData(undefined);
    },
  });

  const handleEdit = (user: CustomerService) => {
    setEditingIds([user.id]);
    setEditFormData({
      nickname: user.nickname,
      email: user.email,
      roles: user.roles,
    });
  };

  const handleBatchEdit = () => {
    if (selectedIds.length === 1) {
      const id = selectedIds[0];
      const user = customerServices.find((u) => u.id === id);
      if (user) {
        handleEdit(user);
      }
    } else if (selectedIds.length > 1) {
      setEditingIds(selectedIds);
      setEditFormData({
        roles: [],
      });
    }
  };

  const handleUpdate = (ids: string[], data: Omit<UpdateCustomerServiceData, 'id'>) => {
    update(ids.map((id) => ({ ...data, id })));
  };

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">客服</h1>

      <div className="flex items-center gap-2">
        <Radio.Group
          optionType="button"
          options={[
            { label: '启用中', value: true },
            { label: '禁用中', value: false },
          ]}
          value={active}
          onChange={(e) => setActive(e.target.value)}
        />
        <div className="grow" />
        {selectedIds.length > 0 && (
          <Dropdown
            disabled={isUpdating}
            trigger={['click']}
            menu={{
              items: [
                { key: 'edit', label: '编辑' },
                { key: 'changeActive', label: active ? '禁用' : '启用' },
              ],
              onClick: ({ key }) => {
                switch (key) {
                  case 'edit':
                    handleBatchEdit();
                    break;
                  case 'changeActive':
                    handleUpdate(selectedIds, { active: !active });
                    break;
                }
              },
            }}
          >
            <Button>批量操作</Button>
          </Dropdown>
        )}
        <Button type="primary" onClick={() => setAddUserModalVisible(true)}>
          添加
        </Button>
      </div>

      <AddUserModal visible={addUserModalVisible} onHide={() => setAddUserModalVisible(false)} />

      <EditUserModal
        title={editingIds.length === 1 ? '编辑客服' : `批量编辑 ${selectedIds.length} 个客服`}
        open={!!editFormData}
        initData={editFormData}
        batch={editingIds.length > 1}
        onClose={() => setEditFormData(undefined)}
        onSave={(data) => handleUpdate(editingIds, data)}
        isLoading={isUpdating}
      />

      {customerServiceResult.error && (
        <Retry
          message="获取客服失败"
          error={customerServiceResult.error}
          onRetry={customerServiceResult.refetch}
        />
      )}

      <Table
        className="mt-5"
        rowKey={(c) => c.id}
        pagination={false}
        loading={customerServiceResult.isLoading}
        dataSource={filteredCustomerServices}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (selectedRowKeys) => setSelectedIds(selectedRowKeys as string[]),
        }}
        scroll={{ x: 'max-content' }}
      >
        <Table.Column
          key="customerService"
          title="客服"
          render={(user) => <UserLabel user={user} />}
        />
        <Table.Column key="email" title="邮箱" render={(user) => user.email || '-'} />
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
                categoryIds.length === 0 ? (
                  '无'
                ) : (
                  <div className="flex flex-wrap gap-1 max-w-[400px]">
                    {categoryIds.map((categoryId) => (
                      <Category
                        key={categoryId}
                        className="text-sm py-0.5 mr-0.5 mb-1"
                        categoryId={categoryId}
                        path
                      />
                    ))}
                  </div>
                )
              }
            >
              {categoryIds.length === 0 ? '-' : categoryIds.length}
            </Popover>
          )}
        />
        <Table.Column
          key="actions"
          title="操作"
          render={(u: CustomerService) => (
            <MemberActions
              id={u.id}
              nickname={u.nickname}
              active={u.active}
              onEdit={() => handleEdit(u)}
            />
          )}
        />
      </Table>
    </div>
  );
}
