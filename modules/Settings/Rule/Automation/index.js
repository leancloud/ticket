import React, { useContext, useEffect, useRef, useState } from 'react'
import { Button, ButtonGroup, Form, Table } from 'react-bootstrap'
import { Link, Route, Switch, useHistory, useRouteMatch } from 'react-router-dom'
import { createResourceHook } from '@leancloud/use-resource'

import { AppContext } from '../../../context'
import { fetch } from '../../../../lib/leancloud'
import { Context } from '../context'
import { useCustomerServices } from '../../../CustomerService'
import { useConditions } from './condition'
import { useActions } from '../Action'

const useAutomationList = createResourceHook(() => fetch('/api/1/automations'))

const useAutomationData = createResourceHook((id) => fetch('/api/1/automations/' + id))

function addAutomation(data) {
  return fetch('/api/1/automations', { method: 'POST', body: data })
}

function updateAutomation(id, data) {
  return fetch('/api/1/automations/' + id, { method: 'PATCH', body: data })
}

function deleteAutomation(id) {
  return fetch('/api/1/automations/' + id, { method: 'DELETE' })
}

function reorderAutomations(automation_ids) {
  return fetch('/api/1/automations/reorder', { method: 'POST', body: { automation_ids } })
}

function AutomationList() {
  const { path } = useRouteMatch()
  const { addNotification } = useContext(AppContext)
  const [localAutomations, setLocalAutomations] = useState([])
  const [automations, { loading: loadingAutomations }] = useAutomationList()
  const [loading, setLoading] = useState(false)
  const [ordering, setOrdering] = useState(false)

  useEffect(() => {
    if (automations) {
      setLocalAutomations(automations)
    }
  }, [automations])

  if (loadingAutomations && (!localAutomations || localAutomations.length === 0)) {
    return 'Loading...'
  }

  const handleChangeActive = async (id, active) => {
    setLoading(true)
    try {
      await updateAutomation(id, { active })
      setLocalAutomations((current) => {
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
    setLocalAutomations((current) => [
      ...current.slice(0, index - 1),
      current[index],
      current[index - 1],
      ...current.slice(index + 1),
    ])
  }
  const moveDown = (index) => {
    setLocalAutomations((current) => [
      ...current.slice(0, index),
      current[index + 1],
      current[index],
      ...current.slice(index + 2),
    ])
  }
  const handleReorder = async () => {
    try {
      setLoading(true)
      await reorderAutomations(localAutomations.map(({ id }) => id))
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
                setLocalAutomations(automations || [])
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
            <Button variant="outline-primary" as={Link} to={`${path}/new`}>
              Create
            </Button>
          </>
        )}
      </div>
      <Table className="mt-2" size="sm">
        <thead>
          <tr>
            <th>Title</th>
            <th>Active</th>
            {ordering && <th></th>}
          </tr>
        </thead>
        <tbody>
          {localAutomations.map(({ id, title, active }, index) => (
            <tr key={id}>
              <td>{ordering ? title : <Link to={path + '/' + id}>{title}</Link>}</td>
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
                      <i className="bi bi-caret-up-fill"></i>
                    </Button>
                    <Button
                      className="py-0"
                      variant="light"
                      disabled={index === localAutomations.length - 1}
                      onClick={() => moveDown(index)}
                    >
                      <i className="bi bi-caret-down-fill"></i>
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

function NewAutomation() {
  const history = useHistory()
  const { addNotification } = useContext(AppContext)
  const customerServices = useCustomerServices()
  const [title, setTitle] = useState('')
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
    const data = { title, conditions, actions }
    setLoading(true)
    history.push('.')
    try {
      await addAutomation(data)
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
      <Form.Group controlId="automation-title">
        <Form.Label>Automation title</Form.Label>
        <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} />
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

function AutomationDetail() {
  const history = useHistory()
  const { addNotification } = useContext(AppContext)
  const { params } = useRouteMatch()
  const [automationData, { error, loading: automationDataLoading }] = useAutomationData([params.id])
  const customerServices = useCustomerServices()
  const [title, setTitle] = useState('')
  const {
    conditions: allConditions,
    nodes: allConditionNodes,
    add: addAllCondition,
    reset: resetAllConditions,
  } = useConditions()
  const {
    conditions: anyConditions,
    nodes: anyConditionNodes,
    add: addAnyCondition,
    reset: resetAnyConditions,
  } = useConditions()
  const { actions, nodes: actionNodes, add: addAction, reset: resetActions } = useActions()
  const [loading, setLoading] = useState(false)
  const $unmounted = useRef(false)
  useEffect(() => () => ($unmounted.current = true), [])
  useEffect(() => {
    if (automationData) {
      const { title, conditions, actions } = automationData
      setTitle(title)
      resetAllConditions()
      resetAnyConditions()
      resetActions()
      if (conditions) {
        conditions.all?.forEach(addAllCondition)
        conditions.any?.forEach(addAnyCondition)
      }
      actions?.forEach(addAction)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationData])

  if (error) {
    // TODO: replace with <APIError />
    return error.message
  }
  if (automationDataLoading) {
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
      conditions,
      actions,
    }
    setLoading(true)
    try {
      await updateAutomation(params.id, data)
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
    if (confirm(`Delete automation ${params.id} ?`)) {
      try {
        setLoading(true)
        await deleteAutomation(params.id)
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
      <Form.Group controlId="automation-title">
        <Form.Label>Automation title</Form.Label>
        <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} />
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

export default function Automations() {
  const { path } = useRouteMatch()
  return (
    <Switch>
      <Route path={path} exact>
        <AutomationList />
      </Route>
      <Route path={`${path}/new`}>
        <NewAutomation />
      </Route>
      <Route path={`${path}/:id`}>
        <AutomationDetail />
      </Route>
    </Switch>
  )
}
