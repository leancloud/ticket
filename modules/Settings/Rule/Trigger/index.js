import React, { useContext, useEffect, useRef, useState } from 'react'
import { Button, ButtonGroup, Form, Table } from 'react-bootstrap'
import { Link, Route, Switch, useHistory, useRouteMatch } from 'react-router-dom'
import { createResourceHook } from '@leancloud/use-resource'
import * as Icon from 'react-bootstrap-icons'
import style from './index.module.scss'
import { AppContext } from '../../../context'
import { fetch } from '../../../../lib/leancloud'
import { useCustomerServices } from '../../../CustomerService'
import { Context } from '../context'
import { useConditions } from '../Condition'
import { useActions } from '../Action'

const useTriggerList = createResourceHook(() => {
  return fetch('/api/1/triggers')
})

const useTriggerData = createResourceHook((id) => {
  return fetch('/api/1/triggers/' + id)
})

function addTrigger(data) {
  return fetch('/api/1/triggers', {
    method: 'POST',
    body: data,
  })
}

function updateTrigger(id, data) {
  return fetch('/api/1/triggers/' + id, {
    method: 'PATCH',
    body: data,
  })
}

function deleteTrigger(id) {
  return fetch('/api/1/triggers/' + id, {
    method: 'DELETE',
  })
}

function reorderTriggers(trigger_ids) {
  return fetch('/api/1/triggers/reorder', {
    method: 'POST',
    body: { trigger_ids },
  })
}

function TriggerList() {
  const { path } = useRouteMatch()
  const { addNotification } = useContext(AppContext)
  const [localTriggers, setLocalTriggers] = useState([])
  const [triggers, { loading: loadingTriggers }] = useTriggerList()
  const [loading, setLoading] = useState(false)
  const [ordering, setOrdering] = useState(false)

  useEffect(() => {
    if (triggers) {
      setLocalTriggers(triggers)
    }
  }, [triggers])

  if (loadingTriggers && !localTriggers) {
    return 'Loading...'
  }

  const handleChangeActive = async (id, active) => {
    setLoading(true)
    try {
      await updateTrigger(id, { active })
      setLocalTriggers((current) => {
        const next = [...current]
        next.find((t) => t.id === id).active = active
        return next
      })
    } catch (error) {
      addNotification(error)
    } finally {
      setLoading(false)
    }
  }

  const moveUp = (index) => {
    setLocalTriggers((current) => [
      ...current.slice(0, index - 1),
      current[index],
      current[index - 1],
      ...current.slice(index + 1),
    ])
  }
  const moveDown = (index) => {
    setLocalTriggers((current) => [
      ...current.slice(0, index),
      current[index + 1],
      current[index],
      ...current.slice(index + 2),
    ])
  }
  const handleReorder = async () => {
    try {
      setLoading(true)
      await reorderTriggers(localTriggers.map(({ id }) => id))
      setOrdering(false)
    } catch (error) {
      addNotification(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="d-flex justify-content-end">
        {ordering ? (
          <>
            <Button
              variant="link"
              onClick={() => {
                setOrdering(false)
                setLocalTriggers(triggers || [])
              }}
            >
              Cancel
            </Button>
            <Button className="ml-2" disabled={loading} onClick={handleReorder}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button variant="link" onClick={() => setOrdering(true)}>
              Edit order
            </Button>
            <Button className="ml-2" as={Link} to={`${path}/new`} variant="outline-primary">
              Create
            </Button>
          </>
        )}
      </div>
      <Table className="mt-2" size="sm">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Active</th>
            {ordering && <th></th>}
          </tr>
        </thead>
        <tbody>
          {localTriggers.map(({ id, title, description, active }, index) => (
            <tr key={id}>
              <td>{ordering ? title : <Link to={path + '/' + id}>{title}</Link>}</td>
              <td>
                <div className={style.desc}>{description}</div>
              </td>
              <td>
                <Form.Check
                  checked={active}
                  disabled={loading || ordering}
                  onChange={(e) => handleChangeActive(id, e.target.checked)}
                />
              </td>
              {ordering && (
                <td>
                  <ButtonGroup size="sm">
                    <Button
                      className="py-0"
                      variant="light"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                    >
                      <Icon.CaretUpFill />
                    </Button>
                    <Button
                      className="py-0"
                      variant="light"
                      disabled={index === localTriggers.length - 1}
                      onClick={() => moveDown(index)}
                    >
                      <Icon.CaretDownFill />
                    </Button>
                  </ButtonGroup>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}

function NewTrigger() {
  const history = useHistory()
  const { addNotification } = useContext(AppContext)
  const customerServices = useCustomerServices()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const {
    conditions: allConditions,
    nodes: allConditionNodes,
    add: addAllCondition,
  } = useConditions()
  const {
    conditions: anyConditions,
    nodes: anyConditionNodes,
    add: addAnyCondition,
  } = useConditions()
  const { actions, nodes: actionNodes, add: addAction } = useActions()
  const [loading, setLoading] = useState(false)
  const $unmounted = useRef(false)
  useEffect(() => () => ($unmounted.current = true), [])

  const allCondIsValid = allConditions.findIndex((cond) => !cond) === -1
  const anyCondIsValid = anyConditions.findIndex((cond) => !cond) === -1
  const actionsIsValid = actions.length && actions.findIndex((act) => !act) === -1

  const handleAdd = async () => {
    const conditions = {}
    if (allConditions.length) {
      conditions.all = allConditions
    }
    if (anyConditions.length) {
      conditions.any = anyConditions
    }
    const data = {
      title,
      description,
      conditions,
      actions,
    }
    setLoading(true)
    try {
      await addTrigger(data)
      history.push('.')
    } catch (error) {
      addNotification(error)
    } finally {
      if (!$unmounted.current) {
        setLoading(false)
      }
    }
  }

  return (
    <Context.Provider value={{ assignees: customerServices }}>
      <Form.Group controlId="trigger-name">
        <Form.Label>Trigger name</Form.Label>
        <Form.Control
          placeholder="Enter a trigger name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Form.Group>
      <Form.Group controlId="trigger-desc">
        <Form.Label>Description</Form.Label>
        <Form.Control
          placeholder="Enter an optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label>Meet ALL of the following conditions</Form.Label>
        <div>{allConditionNodes}</div>
        <Button variant="outline-primary" size="sm" onClick={() => addAllCondition()}>
          Add condition
        </Button>
      </Form.Group>
      <Form.Group>
        <Form.Label>Meet ANY of the following conditions</Form.Label>
        <div>{anyConditionNodes}</div>
        <Button variant="outline-primary" size="sm" onClick={() => addAnyCondition()}>
          Add condition
        </Button>
      </Form.Group>
      <Form.Group>
        <Form.Label>Actions</Form.Label>
        <div>{actionNodes}</div>
        <Button variant="outline-primary" size="sm" onClick={() => addAction()}>
          Add action
        </Button>
      </Form.Group>
      <div className="d-flex justify-content-end">
        <Button as={Link} variant="outline-primary" to=".">
          Cancel
        </Button>
        <Button
          className="ml-2"
          disabled={!title || !allCondIsValid || !anyCondIsValid || !actionsIsValid || loading}
          onClick={handleAdd}
        >
          Create
        </Button>
      </div>
    </Context.Provider>
  )
}

function TriggerDetail() {
  const history = useHistory()
  const { addNotification } = useContext(AppContext)
  const { params } = useRouteMatch()
  const [triggerData, { error, loading: triggerDataLoading }] = useTriggerData([params.id])
  const customerServices = useCustomerServices()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const {
    conditions: allConditions,
    nodes: allConditionNodes,
    add: addAllCondition,
    reset: resetAllCondition,
  } = useConditions()
  const {
    conditions: anyConditions,
    nodes: anyConditionNodes,
    add: addAnyCondition,
    reset: resetAnyCondition,
  } = useConditions()
  const { actions, nodes: actionNodes, add: addAction, reset: resetActions } = useActions()
  const [loading, setLoading] = useState(false)
  const $unmounted = useRef(false)
  useEffect(() => () => ($unmounted.current = true), [])
  useEffect(() => {
    if (triggerData) {
      const { title, description, conditions, actions } = triggerData
      setTitle(title || '')
      setDescription(description || '')
      resetAllCondition()
      resetAnyCondition()
      resetActions()
      conditions?.all?.forEach(addAllCondition)
      conditions?.any?.forEach(addAnyCondition)
      actions?.forEach(addAction)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerData])

  if (error) {
    // TODO: replace with <APIError />
    return error.message
  }
  if (triggerDataLoading) {
    return 'Loading...'
  }

  const allCondIsValid = allConditions.findIndex((cond) => !cond) === -1
  const anyCondIsValid = anyConditions.findIndex((cond) => !cond) === -1
  const actionsIsValid = actions.length && actions.findIndex((act) => !act) === -1

  const handleSave = async () => {
    const conditions = {}
    if (allConditions.length) {
      conditions.all = allConditions
    }
    if (anyConditions.length) {
      conditions.any = anyConditions
    }
    const data = {
      title,
      description,
      conditions,
      actions,
    }
    setLoading(true)
    try {
      await updateTrigger(params.id, data)
      addNotification()
    } catch (error) {
      addNotification(error)
    } finally {
      if (!$unmounted.current) {
        setLoading(false)
      }
    }
  }

  const handleDelete = async () => {
    if (confirm(`Delete trigger ${params.id} ?`)) {
      try {
        setLoading(true)
        await deleteTrigger(params.id)
        history.push('.')
      } catch (error) {
        addNotification(error)
      } finally {
        if (!$unmounted.current) {
          setLoading(false)
        }
      }
    }
  }

  return (
    <Context.Provider value={{ assignees: customerServices }}>
      <Form.Group controlId="trigger-name">
        <Form.Label>Trigger name</Form.Label>
        <Form.Control
          placeholder="Enter a trigger name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Form.Group>
      <Form.Group controlId="triggers-desc">
        <Form.Label>Description</Form.Label>
        <Form.Control
          placeholder="Enter an optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label>Meet ALL of the following conditions</Form.Label>
        <div>{allConditionNodes}</div>
        <Button variant="outline-primary" size="sm" onClick={() => addAllCondition()}>
          Add condition
        </Button>
      </Form.Group>
      <Form.Group>
        <Form.Label>Meet ANY of the following conditions</Form.Label>
        <div>{anyConditionNodes}</div>
        <Button variant="outline-primary" size="sm" onClick={() => addAnyCondition()}>
          Add condition
        </Button>
      </Form.Group>
      <Form.Group>
        <Form.Label>Actions</Form.Label>
        <div>{actionNodes}</div>
        <Button variant="outline-primary" size="sm" onClick={() => addAction()}>
          Add action
        </Button>
      </Form.Group>
      <div className="mt-4 d-flex justify-content-between">
        <Button variant="danger" onClick={handleDelete} disabled={loading}>
          Delete
        </Button>
        <div>
          <Button as={Link} variant="outline-primary" to=".">
            Cancel
          </Button>
          <Button
            className="ml-2"
            disabled={!title || !allCondIsValid || !anyCondIsValid || !actionsIsValid || loading}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </Context.Provider>
  )
}

export default function Triggers() {
  const { path } = useRouteMatch()
  return (
    <Switch>
      <Route path={path} exact>
        <TriggerList />
      </Route>
      <Route path={`${path}/new`}>
        <NewTrigger />
      </Route>
      <Route path={`${path}/:id`}>
        <TriggerDetail />
      </Route>
    </Switch>
  )
}
