import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Col, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { CardContainer } from '../components/CardContainer'
import { MapSelect } from '../components/MapSelect'
import { Value } from '../components/Value'
import * as basicFields from './fields'

function Condition({ fields, initData, onChange }) {
  const [field, setField] = useState(initData?.field || '')
  const [operator, setOperator] = useState(initData?.operator || '')
  const [value, setValue] = useState()

  const handleChangeField = (field) => {
    setField(field)
    setOperator(Object.keys(fields[field].operators)[0])
    setValue(undefined)
  }

  const handleChangeOperator = (operator) => {
    setOperator(operator)
    setValue(undefined)
  }

  useEffect(() => {
    if (!field || !operator) {
      onChange(undefined)
      return
    }
    if (fields[field].operators[operator].component) {
      if (value !== undefined) {
        onChange({ field, operator, value })
      } else {
        onChange(undefined)
      }
    } else {
      onChange({ field, operator })
    }
  }, [fields, field, operator, value])

  const fieldSelect = <MapSelect map={fields} value={field} onChange={handleChangeField} />
  if (!field) {
    return fieldSelect
  }

  const operatorSelect = (
    <MapSelect map={fields[field].operators} value={operator} onChange={handleChangeOperator} />
  )

  let valueElement = null
  if (field && operator) {
    const component = fields[field].operators[operator].component
    if (component) {
      if (typeof component === 'function') {
        valueElement = React.createElement(component, {
          initValue: initData?.value,
          onChange: setValue,
        })
      } else {
        valueElement = (
          <Value
            key={`${field}.${operator}`}
            component={component}
            initValue={initData?.value}
            onChange={setValue}
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
  initData: PropTypes.object,
  onChange: PropTypes.func.isRequired,
}

export function useConditions({ fields = basicFields } = {}) {
  const [nodes, setNodes] = useState([])
  const $nextId = useRef(0)
  const [conditionById, setConditionById] = useState({})

  const conditions = useMemo(() => Object.values(conditionById), [conditionById])

  const add = useCallback((initData) => {
    const id = $nextId.current++
    const handleChange = (condition) => {
      setConditionById((current) => ({ ...current, [id]: condition }))
    }
    const handleRemove = () => {
      setConditionById((current) => _.omit(current, id))
      setNodes((current) => current.filter((t) => t !== node))
    }
    const node = (
      <CardContainer key={id} onClose={handleRemove}>
        <Condition fields={fields} onChange={handleChange} initData={initData} />
      </CardContainer>
    )
    setNodes((current) => [...current, node])
    handleChange(undefined)
  }, [])

  const reset = useCallback(() => {
    setNodes([])
    setConditionById({})
  }, [])

  return { conditions, nodes, add, reset }
}
