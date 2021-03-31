import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Checkbox,
  ControlLabel,
  FormControl,
  FormGroup,
  Label,
  Modal,
  Table,
} from 'react-bootstrap'
import { Link, Route, Switch, useParams, useRouteMatch } from 'react-router-dom'
import PropTypes from 'prop-types'
import { createResourceHook, useTransform } from '@leancloud/use-resource'

import { AppContext } from '../context'
import { fetch } from '../../lib/leancloud'
import { locales } from '../../lib/locale'

const useDynamicContents = createResourceHook(() => {
  return fetch('/api/1/dynamic-contents')
})

const useSubDynamicContents = createResourceHook((name) => {
  return fetch('/api/1/dynamic-contents/' + name)
})

function addDynamicContent(name, locale, content) {
  return fetch('/api/1/dynamic-contents', {
    method: 'POST',
    body: { name, locale, content },
  })
}

function deleteDynamicContent(name) {
  return fetch('/api/1/dynamic-contents/' + name, {
    method: 'DELETE',
  })
}

function addDynamicContentVariant(name, locale, isDefault, content) {
  return fetch(`/api/1/dynamic-contents/${name}/variants`, {
    method: 'POST',
    body: { locale, default: !!isDefault, content },
  })
}

function deleteDynamicContentVariant(name, locale) {
  return fetch(`/api/1/dynamic-contents/${name}/variants/${locale}`, {
    method: 'DELETE',
  })
}

function updateDynamicContentVariant(name, locale, isDefault, content) {
  return fetch(`/api/1/dynamic-contents/${name}/variants/${locale}`, {
    method: 'PATCH',
    body: { default: !!isDefault, content },
  })
}

function LanguageSelect({ value, onChange, disabled }) {
  return (
    <FormControl
      componentClass="select"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      <option value=""></option>
      {Object.entries(locales).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </FormControl>
  )
}
LanguageSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
}

function AddDynamicContentModal({ show, onHide, onCreated, name }) {
  const { addNotification } = useContext(AppContext)
  const [data, setData] = useState({})
  const [validationState, setValidationState] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const $unmounted = useRef(false)

  useEffect(() => {
    if (show) {
      setData({})
      setValidationState({})
    }
  }, [show])

  useEffect(
    () => () => {
      $unmounted.current = true
    },
    []
  )

  const handleHideModal = () => {
    if (!submitting) {
      onHide?.()
    }
  }

  const handleSubmit = async () => {
    const newValidationState = {}
    if (!name && !data.name) {
      newValidationState.name = 'error'
    }
    if (!data.locale) {
      newValidationState.locale = 'error'
    }
    if (!data.content) {
      newValidationState.content = 'error'
    }
    if (Object.keys(newValidationState).length) {
      setValidationState(newValidationState)
      return
    }
    setSubmitting(true)
    try {
      if (name) {
        await addDynamicContentVariant(name, data.locale, data.default, data.content)
      } else {
        await addDynamicContent(data.name, data.locale, data.content)
      }
      onCreated?.()
      onHide?.()
    } catch (error) {
      addNotification(error)
    } finally {
      if (!$unmounted.current) {
        setSubmitting(false)
      }
    }
  }

  return (
    <Modal show={show} onHide={handleHideModal}>
      <Modal.Header>
        <Modal.Title>Add dynamic content</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FormGroup validationState={validationState.name}>
          <ControlLabel>Name</ControlLabel>
          <FormControl
            disabled={!!name}
            type="text"
            value={name || data.name || ''}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        </FormGroup>
        <FormGroup validationState={validationState.locale}>
          <ControlLabel>{name ? 'Language' : 'Default language'}</ControlLabel>
          <LanguageSelect
            value={data.locale || ''}
            onChange={(locale) => setData({ ...data, locale })}
          />
        </FormGroup>
        {name && (
          <Checkbox
            checked={!!data.default}
            onChange={() => setData({ ...data, default: !data.default })}
          >
            Is default
          </Checkbox>
        )}
        <FormGroup validationState={validationState.content}>
          <ControlLabel>Content</ControlLabel>
          <FormControl
            componentClass="textarea"
            rows="5"
            value={data.content || ''}
            onChange={(e) => setData({ ...data, content: e.target.value })}
          />
        </FormGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button disabled={submitting} onClick={onHide}>
          Cancel
        </Button>
        <Button bsStyle="primary" disabled={submitting} onClick={handleSubmit}>
          Add
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
AddDynamicContentModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func,
  onCreated: PropTypes.func,
  name: PropTypes.string,
}

function EditDynamicContentModal({ show, onHide, initData, onUpdated }) {
  const { addNotification } = useContext(AppContext)
  const [data, setData] = useState({})
  const [validationState, setValidationState] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const $unmounted = useRef(false)

  useEffect(() => {
    if (show) {
      setData({ ...initData })
      setValidationState({})
    }
  }, [show])

  useEffect(
    () => () => {
      $unmounted.current = true
    },
    []
  )

  const handleHideModal = () => {
    if (!submitting) {
      onHide?.()
    }
  }

  const handleSubmit = async () => {
    const newValidationState = {}
    if (!data.name) {
      newValidationState.name = 'error'
    }
    if (!data.locale) {
      newValidationState.locale = 'error'
    }
    if (!data.content) {
      newValidationState.content = 'error'
    }
    if (Object.keys(newValidationState).length) {
      setValidationState(newValidationState)
      return
    }
    setSubmitting(true)
    try {
      await updateDynamicContentVariant(data.name, data.locale, !!data.default, data.content)
      onUpdated?.()
      onHide?.()
    } catch (error) {
      addNotification(error)
    } finally {
      if (!$unmounted.current) {
        setSubmitting(false)
      }
    }
  }

  return (
    <Modal show={show} onHide={handleHideModal}>
      <Modal.Header>
        <Modal.Title>Edit dynamic content</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FormGroup validationState={validationState.name}>
          <ControlLabel>Name</ControlLabel>
          <FormControl
            disabled
            type="text"
            value={data.name || ''}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        </FormGroup>
        <FormGroup validationState={validationState.locale}>
          <ControlLabel>Language</ControlLabel>
          <LanguageSelect
            disabled
            value={data.locale || ''}
            onChange={(locale) => setData({ ...data, locale })}
          />
        </FormGroup>
        <Checkbox
          disabled={!!initData.default}
          checked={!!data.default}
          onChange={() => setData({ ...data, default: !data.default })}
        >
          Is default
        </Checkbox>
        <FormGroup validationState={validationState.content}>
          <ControlLabel>Content</ControlLabel>
          <FormControl
            componentClass="textarea"
            rows="5"
            value={data.content || ''}
            onChange={(e) => setData({ ...data, content: e.target.value })}
          />
        </FormGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button disabled={submitting} onClick={onHide}>
          Cancel
        </Button>
        <Button bsStyle="primary" disabled={submitting} onClick={handleSubmit}>
          Update
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
EditDynamicContentModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func,
  onUpdated: PropTypes.func,
  initData: PropTypes.object,
}

function DynamicContentList() {
  const { addNotification } = useContext(AppContext)
  const [dynamicContents, { loading, reload, error }] = useDynamicContents()
  const [show, setShow] = useState(false)

  if (error) {
    addNotification(error)
  }
  if (loading) {
    return 'Loading...'
  }

  const handleDelete = (name) => {
    deleteDynamicContent(name).then(reload).catch(addNotification)
  }

  return (
    <>
      <ButtonToolbar>
        <Button disabled={loading} onClick={() => setShow(true)}>
          Add
        </Button>
      </ButtonToolbar>

      <AddDynamicContentModal show={show} onHide={() => setShow(false)} onCreated={reload} />

      <Table condensed hover style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Default language</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dynamicContents.map(({ name, variants }) => (
            <tr key={variants[0].locale}>
              <td>
                <Link to={`/settings/dynamicContent/${name}`}>{name}</Link>
              </td>
              <td>{locales[variants[0].locale] || variants[0].locale}</td>
              <td>
                <Button bsSize="xsmall" bsStyle="danger" onClick={() => handleDelete(name)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}

function DynamicContentDetail() {
  const { name } = useParams()
  const { addNotification } = useContext(AppContext)
  const [editingData, setEditingData] = useState({})
  const [dynamicContents, { loading, reload, error }] = useTransform(
    useSubDynamicContents([name]),
    useCallback((dcs) => {
      return dcs?.variants
        .map((dc) => ({
          ...dc,
          name,
          localeName: locales[dc.locale] || dc.locale,
        }))
        .sort((o1, o2) => (o1.localeName > o2.localeName ? 1 : -1))
    }, [])
  )
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleDelete = (locale) => {
    deleteDynamicContentVariant(name, locale).then(reload).catch(addNotification)
  }
  const handleEdit = (locale) => {
    const data = dynamicContents.find((dc) => dc.locale === locale)
    if (data) {
      setEditingData(data)
      setShowEditModal(true)
    }
  }

  if (error) {
    addNotification(error)
  }
  if (loading) {
    return 'Loading...'
  }
  return (
    <>
      <div>
        <strong>Placeholder:</strong> {`{{ dc.${name} }}`}
      </div>

      <ButtonToolbar style={{ marginTop: 10 }}>
        <Button onClick={() => setShowAddModal(true)}>Add</Button>
      </ButtonToolbar>

      <AddDynamicContentModal
        name={name}
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onCreated={reload}
      />
      <EditDynamicContentModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        initData={editingData}
        onUpdated={reload}
      />

      <Table responsive condensed hover style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Language</th>
            <th>Content</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dynamicContents.map(({ locale, localeName, content, default: isDefault }) => (
            <tr key={locale}>
              <td>
                {localeName} {isDefault && <Label bsStyle="default">Default</Label>}
              </td>
              <td>{content}</td>
              <td>
                <ButtonGroup>
                  <Button
                    bsSize="xsmall"
                    bsStyle="danger"
                    disabled={isDefault}
                    onClick={() => handleDelete(locale)}
                  >
                    Delete
                  </Button>
                  <Button bsSize="xsmall" onClick={() => handleEdit(locale)}>
                    Edit
                  </Button>
                </ButtonGroup>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}

export default function DynamicContent() {
  const { path } = useRouteMatch()
  return (
    <Switch>
      <Route path={path} exact>
        <DynamicContentList />
      </Route>
      <Route path={`${path}/:name`}>
        <DynamicContentDetail />
      </Route>
    </Switch>
  )
}
