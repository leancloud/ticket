import React from 'react'

exports.userLabel = (user) => {
  return (
    <span>{user.username || user.get('username')}</span>
  )
}
