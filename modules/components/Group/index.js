import React from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useQuery } from 'react-query'
import { db } from '../../../lib/leancloud'

export const useGroups = () => useQuery('groups', () => db.class('Group').find())

export function GroupLabel({ groupId }) {
  const { data: groups } = useGroups()
  if (groupId === '') return '<unset>'
  const matchedGroup = groups?.find((group) => group.id === groupId)
  return (
    <Link to={`/settings/groups/${groupId}`} className="username">
      {matchedGroup?.data?.name ?? groupId}
    </Link>
  )
}
GroupLabel.displayName = 'GroupLabel'
GroupLabel.propTypes = {
  groupId: PropTypes.string.isRequired,
}
