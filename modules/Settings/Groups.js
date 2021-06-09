import React from 'react'
import { Link, Route, Switch, useRouteMatch } from 'react-router-dom'
import { Button, Table } from 'react-bootstrap'
import { useObjects } from '../../lib/leancloud'
import { Group } from './Group'
import PropTypes from 'prop-types'
import { useFunction } from '../../lib/leancloud'

function GroupSummary({ group }) {
  const {
    id,
    data: { name, description, role },
  } = group

  const [count, { loading }] = useFunction(['getRoleUsersCount', { roleId: role.id }], {
    deps: [role.id],
  })

  return (
    <tr>
      <td>
        <Link to={`/settings/groups/${id}`}>{name}</Link>
        {!loading && <span className="ml-1">({count})</span>}
      </td>
      <td>{description}</td>
    </tr>
  )
}
GroupSummary.propTypes = {
  group: PropTypes.object,
}

function Groups() {
  const [groups] = useObjects(['Group'])
  return (
    <>
      <Button as={Link} variant="light" to="/settings/groups/_new">
        New group
      </Button>
      <Table hover className="mt-2">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {groups?.map((group) => (
            <GroupSummary group={group} key={group.id} />
          ))}
        </tbody>
      </Table>
    </>
  )
}

export default function GroupsContent() {
  const { path } = useRouteMatch()
  return (
    <Switch>
      <Route path={path} exact>
        <Groups />
      </Route>
      <Route path={`${path}/:id`}>
        <Group />
      </Route>
    </Switch>
  )
}
