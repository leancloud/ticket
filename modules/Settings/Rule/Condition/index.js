import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Col, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { CardContainer } from '../components/CardContainer'
import { MapSelect } from '../components/MapSelect'
import { Value } from '../components/Value'
import * as basicFields from './fields'

function Condition({ fields, onChange, initValue }) {
  const [field, setField] = useState(initValue?.field || '')
  const [operator, setOperator] = useState(initValue?.operator || '')
  const $initValueValue = useRef(initValue?.value)

  const handleChange = useCallback(
    (field, operator, value) => {
      $initValueValue.current = undefined
      if (!field || !operator) {
        onChange(undefined)
        return
      }
      if (fields[field].operators[operator].component && value === undefined) {
        onChange(undefined)
        return
      }
      onChange({ field, operator, value })
    },
    [fields, onChange]
  )

  const handleChangeField = (field) => {
    setField(field)
    const operator = Object.keys(fields[field].operators)[0]
    setOperator(operator)
    handleChange(field, operator)
  }

  const handleChangeOperator = (operator) => {
    setOperator(operator)
    handleChange(field, operator)
  }

  const fieldSelect = <MapSelect map={fields} value={field} onChange={handleChangeField} />
  if (!field) {
    return fieldSelect
  }

  const operatorSelect = (
    <MapSelect map={fields[field].operators} value={operator} onChange={handleChangeOperator} />
  )

  let valueElement = null
  if (operator) {
    const component = fields[field].operators[operator].component
    if (component) {
      if (typeof component === 'function') {
        valueElement = React.createElement(component, {
          initValue: $initValueValue.current,
          onChange: (value) => handleChange(field, operator, value),
        })
      } else {
        valueElement = (
          <Value
            component={component}
            initValue={$initValueValue.current}
            onChange={(value) => handleChange(field, operator, value)}
          />
        )
      }
    }
  }

  return (
    <Form.Row>
      <Form.Group className="my-0" as={Col}>
        {fieldSelect}
      </Form.Group>
      <Form.Group className="my-0" as={Col}>
        {operatorSelect}
      </Form.Group>
      {valueElement && (
        <Form.Group className="my-0" as={Col}>
          {valueElement}
        </Form.Group>
      )}
    </Form.Row>
  )
}
Condition.propTypes = {
  fields: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  initValue: PropTypes.object,
}

export function useConditions({ fields = basicFields } = {}) {
  const $fields = useRef(fields)
  const $nextId = useRef(0)
  const [nodes, setNodes] = useState([])
  const [conditionById, setConditionById] = useState({})
  const conditions = useMemo(() => Object.values(conditionById), [conditionById])

  const add = useCallback((initValue) => {
    const id = $nextId.current++
    const handleChange = (value) => {
      setConditionById((current) => ({ ...current, [id]: value }))
    }
    const handleRemove = () => {
      setConditionById((current) => _.omit(current, id))
      setNodes((current) => current.filter((t) => t !== node))
    }
    const node = (
      <CardContainer key={id} onClose={handleRemove}>
        <Condition fields={$fields.current} initValue={initValue} onChange={handleChange} />
      </CardContainer>
    )
    setNodes((current) => [...current, node])
    handleChange(initValue)
  }, [])

  const reset = useCallback(() => {
    setNodes([])
    setConditionById({})
  }, [])

  return { conditions, nodes, add, reset }
}
