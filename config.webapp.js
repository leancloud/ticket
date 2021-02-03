/* eslint-disable no-unused-vars */

export function userDisplayName(user, inCustomerServiceView = false) {
  return user.data.name || user.data.username
}

export function customerServiceDisplayName(user) {
  return userDisplayName(user)
}
