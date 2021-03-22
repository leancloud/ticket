import { useEffect, useState } from 'react'
import { auth } from '../../lib/leancloud'

let getRoleTask
export async function getCustomerServices() {
  if (!getRoleTask) {
    getRoleTask = auth.queryRole().where('name', '==', 'customerService').first()
  }
  const role = await getRoleTask
  const users = await role.queryUser().orderBy('username').find()
  return users.map((u) => u.toJSON())
}

export function useCustomerServices() {
  const [customerServices, setCustomerServices] = useState([])
  useEffect(() => {
    getCustomerServices().then(setCustomerServices).catch(console.error)
  }, [])
  return customerServices
}
