import React from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useQuery } from 'react-query'
import { db } from '../../../lib/leancloud'
import { FormControl } from 'react-bootstrap'

export const GROUPS_QUERY_KEY = 'groups'
export const useGroups = () =>
  useQuery({
    queryKey: GROUPS_QUERY_KEY,
    queryFn: () => db.class('Group').find(),
    staleTime: 1000 * 60 * 5,
  })

export function GroupLabel({ groupId }) {
  const { data: groups } = useGroups()
  if (groupId === '' || groupId === undefined) return '<unset>'
  const matchedGroup = groups?.find((group) => group.id === groupId)
  return (
    <Link to={`/settings/groups/${groupId}`} className="username">
      {matchedGroup?.data?.name ?? groupId}
    </Link>
  )
}
GroupLabel.displayName = 'GroupLabel'
GroupLabel.propTypes = {
  groupId: PropTypes.string,
}

export function GroupSelect({ value, onChange }) {
  const { data: groups } = useGroups()
  const options = groups?.map((group) => (
    <option key={group.id} value={group.id}>
      {group?.data?.name ?? group.id}
    </option>
  ))
  return (
    <FormControl as="select" value={value ?? ''} onChange={onChange}>
      <option value=""></option>
      {options}
    </FormControl>
  )
}
GroupSelect.displayName = 'GroupSelect'
GroupSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
}
