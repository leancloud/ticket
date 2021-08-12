import AV from 'leancloud-storage';

export async function getCustomerServiceRole(): Promise<AV.Role> {
  const query = new AV.Query<AV.Role>('_Role');
  query.equalTo('name', 'customerService');
  const role = await query.first();
  if (!role) {
    throw new Error('The customer service role is not exists');
  }
  return role;
}
