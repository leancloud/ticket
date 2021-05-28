import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Col, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { CardContainer } from '../components/CardContainer'
import { MapSelect } from '../components/MapSelect'
import { Value } from '../components/Value'
import * as basicTypes from './types'

function Action({ types, onChange, initValue }) {
  const [type, setType] = useState(initValue?.type || '')

  const handleChange = useCallback(
    (type, value) => {
      if (!type || value === undefined) {
        onChange(undefined)
        return
      }
      onChange({ type, value })
    },
    [onChange]
  )

  const typeSelect = <MapSelect map={types} value={type} onChange={setType} />

  let valueElement = null
  if (type) {
    const component = types[type].component
    if (typeof component === 'function') {
      valueElement = React.createElement(component, {
        initValue: initValue?.value,
        onChange: (value) => handleChange(type, value),
      })
    } else {
      valueElement = (
        <Value
          component={component}
          initValue={initValue?.value}
          onChange={(value) => handleChange(type, value)}
        />
      )
    }
  }

  return (
    <Form.Row>
      <Form.Group className="my-0" as={Col}>
        {typeSelect}
      </Form.Group>
      {valueElement && (
        <Form.Group className="my-0" as={Col}>
          {valueElement}
        </Form.Group>
      )}
    </Form.Row>
  )
}
Action.propTypes = {
  types: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  initValue: PropTypes.object,
}

export function useActions({ types = basicTypes } = {}) {
  const $types = useRef(types)
  const $nextId = useRef(0)
  const [nodes, setNodes] = useState([])
  const [actionById, setActionById] = useState({})
  const actions = useMemo(() => Object.values(actionById), [actionById])

  const add = useCallback((initValue) => {
    const id = $nextId.current++
    const handleChange = (value) => {
      setActionById((current) => ({ ...current, [id]: value }))
    }
    const handleRemove = () => {
      setActionById((current) => _.omit(current, id))
      setNodes((current) => current.filter((t) => t !== node))
    }
    const node = (
      <CardContainer key={id} onClose={() => handleRemove(id)}>
        <Action types={$types.current} initValue={initValue} onChange={handleChange} />
      </CardContainer>
    )
    setNodes((current) => [...current, node])
    handleChange(initValue)
  }, [])

  const reset = useCallback(() => {
    setNodes([])
    setActionById({})
  }, [])

  return { actions, nodes, add, reset }
}
