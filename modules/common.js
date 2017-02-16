import React from 'react'

exports.userLabel = (user) => {
  return (
    <span>{user.get('username')}</span>
  )
}
