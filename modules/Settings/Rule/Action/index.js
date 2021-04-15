import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Col, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { CardContainer } from '../components/CardContainer'
import { MapSelect } from '../components/MapSelect'
import { Value } from '../components/Value'
import basicTypes from './types'

function Action({ types, initData, onChange }) {
  const [type, setType] = useState(initData?.type || '')
  const [value, setValue] = useState()

  const handleChangeType = useCallback((type) => {
    setType(type)
    setValue(undefined)
  }, [])

  useEffect(() => {
    if (!type || value === undefined) {
      onChange(undefined)
      return
    }
    onChange({ type, value })
  }, [type, value])

  const typeSelect = <MapSelect map={types} value={type} onChange={handleChangeType} />

  let valueElement = null
  if (type) {
    const component = types[type].component
    if (typeof component === 'function') {
      valueElement = React.createElement(component, {
        initValue: initData?.value,
        onChange: setValue,
      })
    } else {
      valueElement = <Value component={component} initValue={initData?.value} onChange={setValue} />
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
  initData: PropTypes.object,
  onChange: PropTypes.func.isRequired,
}

export function useActions({ types = basicTypes } = {}) {
  const [nodes, setNodes] = useState([])
  const $nextId = useRef(0)
  const [actionById, setActionById] = useState({})

  const actions = useMemo(() => Object.values(actionById), [actionById])

  const add = useCallback((initData) => {
    const id = $nextId.current++
    const handleChange = (action) => {
      setActionById((current) => ({ ...current, [id]: action }))
    }
    const handleRemove = () => {
      setActionById((current) => _.omit(current, id))
      setNodes((current) => current.filter((t) => t !== node))
    }
    const node = (
      <CardContainer key={id} onClose={handleRemove}>
        <Action types={types} onChange={handleChange} initData={initData} />
      </CardContainer>
    )
    setNodes((current) => [...current, node])
    handleChange(undefined)
  }, [])

  const reset = useCallback(() => {
    setNodes([])
    setActionById({})
  }, [])

  return { actions, nodes, add, reset }
}
