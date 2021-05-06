import { useQuery } from 'react-query'

import { auth } from '../../lib/leancloud'

/**
 * @returns {Promise<any[]>}
 */
export async function fetchCustomerServices() {
  const role = await auth.queryRole().where('name', '==', 'customerService').first()
  const customerServices = await role.queryUser().orderBy('username').find()
  return customerServices.map((u) => u.toJSON())
}

export function useCustomerServices() {
  return useQuery('customerServices', fetchCustomerServices)
}
