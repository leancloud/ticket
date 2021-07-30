import React from 'react'
import { Link, Route, Switch, useRouteMatch } from 'react-router-dom'
import { Button, Table } from 'react-bootstrap'
import { Group } from './Group'
import PropTypes from 'prop-types'
import { useFunction } from '../../lib/leancloud'
import { useGroups } from '../components/Group'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const { data: groups } = useGroups()
  return (
    <>
      <Button as={Link} variant="light" to="/settings/groups/_new">
        {t('newGroup')}
      </Button>
      <Table hover className="mt-2">
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th>{t('description')}</th>
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
