import React, { useState, useCallback, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useHistory, useParams } from 'react-router-dom'
import { Breadcrumb, Button, Form } from 'react-bootstrap'
import { useObject, db, auth } from '../../lib/leancloud'
import { AppContext } from '../context'
import { UserLabel } from '../UserLabel'
import { useCustomerServices } from '../CustomerService/useCustomerServices'
import { useSet } from 'react-use'
import _ from 'lodash'
import { useQueryClient } from 'react-query'
import { GROUPS_QUERY_KEY } from '../components/Group'

export function Group() {
  const { t } = useTranslation()
  const history = useHistory()

  const { id } = useParams()
  const editMode = id !== '_new'
  const [editing, setEditing] = useState(!editMode)
  const [group, { loading, error, reload }] = useObject(['Group', id], { condition: editMode })
  const { addNotification } = useContext(AppContext)

  const customerServices = useCustomerServices()
  const [members, setMembers] = useState([])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fetchingMembers, setFetchingMembers] = useState(false)
  const [selectedMembers, selectedMemberActions] = useSet()

  useEffect(() => {
    if (!group) return
    setName(group.data.name)
    setDescription(group.data.description)
    setMembers([])
    selectedMemberActions.reset()
    setFetchingMembers(true)
    auth
      .role(group.data.role.id)
      .getUsers()
      .then((users) => {
        const ids = users.map((user) => user.id)
        setMembers(ids)
        ids.forEach(selectedMemberActions.add)
        return
      })
      .catch(addNotification)
      .finally(() => setFetchingMembers(false))
  }, [addNotification, group])

  const save = useCallback(() => {
    if (editMode) {
      const updates = []
      if ((group && name !== group.data.name) || description !== group.data.description) {
        updates.push(
          group.update({
            name,
            description,
          })
        )
      }
      const toRemove = _.difference(members, Array.from(selectedMembers))
      const toAdd = _.difference(Array.from(selectedMembers), members)
      if (toRemove.length) {
        updates.push(auth.role(group.data.role.id).remove(toRemove.map((id) => auth.user(id))))
      }
      if (toAdd.length) {
        updates.push(auth.role(group.data.role.id).add(toAdd.map((id) => auth.user(id))))
      }
      Promise.all(updates)
        .then(() => {
          reload()
          setEditing(false)
          return
        })
        .catch(addNotification)
    }
  }, [editMode, group, name, description, members, selectedMembers, addNotification, reload])

  const queryClient = useQueryClient()
  const create = useCallback(async () => {
    try {
      const newGroup = await db.class('Group').add({
        name,
        description,
      })
      const role = await auth.addRole({
        name: `group_${newGroup.id}`,
        ACL: db.ACL().allow('role:customerService', 'read', 'write').allow('role:staff', 'read'),
        users: selectedMembers.size
          ? Array.from(selectedMembers).map((id) => auth.user(id))
          : undefined,
      })
      await newGroup.update({ role })
      queryClient.invalidateQueries(GROUPS_QUERY_KEY)
      history.push('/settings/groups')
    } catch (error) {
      addNotification(error)
    }
  }, [addNotification, description, history, name, queryClient, selectedMembers])

  const deleteGroup = useCallback(
    (targetGroup) => {
      const result = confirm(`Delete group ${targetGroup.data.name}`)
      if (!result) {
        return
      }

      Promise.all([targetGroup.delete(), targetGroup.data.role.delete()])
        .then(() => history.push('/settings/groups'))
        .catch(addNotification)
    },
    [addNotification, history]
  )

  if (error) {
    addNotification(error)
  }
  if (loading) {
    return 'Loading...'
  }
  if (customerServices.length === 0) {
    return 'Loading customer services...'
  }

  const form = (
    <>
      <Form.Group controlId="nameText">
        <Form.Label>{t('name')}</Form.Label>
        <Form.Control value={name || ''} onChange={(e) => setName(e.target.value)} />
      </Form.Group>
      <Form.Group controlId="descText">
        <Form.Label>{t('description')}</Form.Label>
        <Form.Control value={description || ''} onChange={(e) => setDescription(e.target.value)} />
      </Form.Group>
      <Form.Group>
        <Form.Label>{t('members')}</Form.Label>
        {customerServices?.map((cs) => {
          return (
            <div key={cs.objectId}>
              <Form.Check
                id={cs.objectId}
                checked={selectedMembers.has(cs.objectId)}
                onChange={() => {
                  selectedMemberActions.toggle(cs.objectId)
                }}
                label={<UserLabel user={cs} displayId />}
              />
            </div>
          )
        })}
      </Form.Group>
    </>
  )

  if (group) {
    return (
      <>
        <Breadcrumb>
          <Breadcrumb.Item active>
            <Link to="/settings">Settings</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item active>
            <Link to="/settings/groups">Groups</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item active>{group.data.name}</Breadcrumb.Item>
        </Breadcrumb>

        {editing ? (
          form
        ) : (
          <>
            <h4>{group.data.name}</h4>
            <p className="text-muted">{group.data.description}</p>
            <h6>Members: {!fetchingMembers && <span>({members.length})</span>}</h6>
            <ul>
              {fetchingMembers
                ? 'Loading...'
                : members.map((member) => {
                    const user = customerServices.find(({ objectId }) => objectId === member)
                    if (!user) return <li key={member}>{member} (非客服)</li>
                    return (
                      <li key={member}>
                        <UserLabel user={user} displayId />
                      </li>
                    )
                  })}
            </ul>
          </>
        )}

        <p>
          {editMode && !editing ? (
            <>
              <Button variant="light" onClick={() => setEditing(true)}>
                {t('edit')}
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => deleteGroup(group)}
                className="float-right"
              >
                Delete
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={save}>
              {t('save')}
            </Button>
          )}
        </p>
      </>
    )
  }
  if (!editMode) {
    return (
      <>
        {form}
        <p>
          {' '}
          <Button variant="primary" onClick={create}>
            {t('save')}
          </Button>
        </p>
      </>
    )
  }
  return null
}
