import React, { useContext, useEffect, useRef, useState } from 'react'
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

import { AppContext } from '../context'
import { db } from '../../lib/leancloud'
import { langs } from '../../lib/lang'

function LanguageSelect({ value, onChange, disabled }) {
  return (
    <FormControl
      componentClass="select"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      <option value=""></option>
      {Object.entries(langs).map(([code, name]) => (
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

function AddDynamicContentModal({ show, onHide, onAdd, dcName }) {
  const { addNotification } = useContext(AppContext)
  const [name, setName] = useState(dcName || '')
  const [lang, setLang] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationState, setValidationState] = useState({})

  const validate = () => {
    const state = {}
    if (!name) {
      state.name = 'error'
    }
    if (!lang) {
      state.lang = 'error'
    }
    if (!content) {
      state.content = 'error'
    }
    setValidationState(state)
    return Object.keys(state).length === 0
  }

  const handleAdd = async () => {
    if (!validate()) {
      return
    }
    setLoading(true)
    try {
      await db.class('DynamicContent').add({
        name,
        lang,
        content,
        isDefault: true,
      })
      onAdd?.()
      setName(dcName || '')
      setLang('')
      setIsDefault(false)
      setContent('')
    } catch (error) {
      if (error.code === 137) {
        addNotification(`Dynamic content "${name}" already exists`)
      } else {
        addNotification(error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={() => !loading && onHide?.()}>
      <Modal.Header>
        <Modal.Title>Add dynamic content</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FormGroup validationState={validationState.name}>
          <ControlLabel>Name</ControlLabel>
          <FormControl
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!!dcName}
          />
        </FormGroup>
        <FormGroup validationState={validationState.lang}>
          <ControlLabel>{dcName ? 'Language' : 'Default Language'}</ControlLabel>
          <LanguageSelect value={lang} onChange={setLang} />
        </FormGroup>
        <Checkbox
          checked={dcName ? isDefault : true}
          onChange={() => setIsDefault((v) => !v)}
          disabled={!dcName}
        >
          Is default
        </Checkbox>
        <FormGroup validationState={validationState.content}>
          <ControlLabel>Content</ControlLabel>
          <FormControl
            componentClass="textarea"
            rows="5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </FormGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button disabled={loading} onClick={onHide}>
          Cancel
        </Button>
        <Button bsStyle="primary" disabled={loading} onClick={handleAdd}>
          Add
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
AddDynamicContentModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func,
  onAdd: PropTypes.func,
  dcName: PropTypes.string,
}

function EditDynamicContentModal({ dynamicContent, show, onHide, onEdit }) {
  const { addNotification } = useContext(AppContext)
  const [isDefault, setIsDefault] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (dynamicContent) {
      setIsDefault(!!dynamicContent.isDefault)
      setContent(dynamicContent.content)
    }
  }, [dynamicContent])

  const handleChange = async () => {
    setLoading(true)
    try {
      await db
        .class('DynamicContent')
        .object(dynamicContent.objectId)
        .update({
          content,
          isDefault: dynamicContent.isDefault ? undefined : isDefault,
        })
      onEdit?.()
    } catch (error) {
      addNotification(error)
    } finally {
      setLoading(false)
    }
  }

  if (!dynamicContent) {
    return null
  }
  return (
    <Modal show={show} onHide={() => !loading && onHide?.()}>
      <Modal.Header>
        <Modal.Title>Edit dynamic content</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FormGroup>
          <ControlLabel>Name</ControlLabel>
          <FormControl type="text" value={dynamicContent.name} disabled />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Language</ControlLabel>
          <LanguageSelect value={dynamicContent.lang} disabled />
        </FormGroup>
        <Checkbox
          checked={isDefault}
          onChange={() => setIsDefault((v) => !v)}
          disabled={dynamicContent.isDefault}
        >
          Is default
        </Checkbox>
        <FormGroup>
          <ControlLabel>Content</ControlLabel>
          <FormControl
            componentClass="textarea"
            rows="5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </FormGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button disabled={loading} onClick={onHide}>
          Cancel
        </Button>
        <Button bsStyle="primary" disabled={loading} onClick={handleChange}>
          Change
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
EditDynamicContentModal.propTypes = {
  dynamicContent: PropTypes.object,
  show: PropTypes.bool,
  onHide: PropTypes.func,
  onEdit: PropTypes.func,
}

function DynamicContentList() {
  const { addNotification } = useContext(AppContext)
  const [DCList, setDCList] = useState([])
  const [show, setShow] = useState(false)
  const $unmounted = useRef(false)
  useEffect(
    () => () => {
      $unmounted.current = false
    },
    []
  )

  const reload = async () => {
    if ($unmounted.current) {
      return
    }
    try {
      const objects = await db
        .class('DynamicContent')
        .where('isDefault', '==', true)
        .orderBy('name')
        .find()
      if ($unmounted.current) {
        return
      }
      setDCList(objects.map((o) => o.toJSON()).sort((o1, o2) => o1.name - o2.name))
    } catch (error) {
      addNotification(error)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const handleDelete = (id) => {
    db.class('DynamicContent').object(id).delete().then(reload).catch(addNotification)
  }

  return (
    <>
      <ButtonToolbar>
        <Button onClick={() => setShow(true)}>Add</Button>
      </ButtonToolbar>
      <AddDynamicContentModal
        show={show}
        onHide={() => setShow(false)}
        onAdd={() => {
          reload()
          setShow(false)
        }}
      />
      <Table condensed hover style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Default language</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {DCList.map(({ objectId, name, lang }) => (
            <tr key={objectId}>
              <td>
                <Link to={`/settings/dynamicContent/${name}`}>{name}</Link>
              </td>
              <td>{langs[lang] || lang}</td>
              <td>
                <Button bsSize="xsmall" bsStyle="danger" onClick={() => handleDelete(objectId)}>
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
  const [DCList, setDCList] = useState([])
  const { addNotification } = useContext(AppContext)
  const [editingDC, setEditingDC] = useState()

  const reload = async () => {
    try {
      const objects = await db.class('DynamicContent').where('name', '==', name).find()
      setDCList(
        objects
          .map((o) => {
            const json = o.toJSON()
            json.langName = langs[json.lang] || json.lang
            return json
          })
          .sort((o1, o2) => (o1.langName > o2.langName ? 1 : -1))
      )
    } catch (error) {
      addNotification(error)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleEdit = (id) => {
    const dc = DCList.find((dc) => dc.objectId === id)
    if (dc) {
      setEditingDC(dc)
      setShowEditModal(true)
    }
  }
  const handleDelete = (id) => {
    db.class('DynamicContent').object(id).delete().then(reload).catch(addNotification)
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
        dcName={name}
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAdd={() => {
          reload()
          setShowAddModal(false)
        }}
      />
      <EditDynamicContentModal
        dynamicContent={editingDC}
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onEdit={() => {
          reload()
          setShowEditModal(false)
        }}
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
          {DCList.map(({ objectId, langName, content, isDefault }) => (
            <tr key={objectId}>
              <td>
                {langName} {isDefault && <Label bsStyle="default">Default</Label>}
              </td>
              <td>{content}</td>
              <td>
                <ButtonGroup>
                  <Button
                    bsSize="xsmall"
                    bsStyle="danger"
                    disabled={isDefault}
                    onClick={() => handleDelete(objectId)}
                  >
                    Delete
                  </Button>
                  <Button bsSize="xsmall" onClick={() => handleEdit(objectId)}>
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
      <Route path={`${path}`} exact>
        <DynamicContentList />
      </Route>
      <Route path={`${path}/:name`}>
        <DynamicContentDetail />
      </Route>
    </Switch>
  )
}
