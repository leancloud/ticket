import AV from 'leancloud-storage';

let customerServiceRole: AV.Role | undefined;

export async function getCustomerServiceRole(): Promise<AV.Role> {
  if (!customerServiceRole) {
    const query = new AV.Query(AV.Role);
    query.equalTo('name', 'customerService');
    customerServiceRole = await query.first();
  }
  if (!customerServiceRole) {
    throw new Error('No customerService role :badbad:');
  }
  return customerServiceRole;
}

export async function isCustomerService(id: string): Promise<boolean> {
  const role = await getCustomerServiceRole();
  const query = role.getUsers().query();
  query.select('objectId');
  query.equalTo('objectId', id);
  const user = await query.first({ useMasterKey: true });
  return !!user;
}
