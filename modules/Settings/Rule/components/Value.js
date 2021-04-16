import React from 'react'
import PropTypes from 'prop-types'

import { Select } from './Select'
import { TextInput } from './TextInput'

export function Value({ component, initValue, onChange }) {
  const { type } = component
  switch (type) {
    case 'select':
      return <Select options={component.options} initValue={initValue} onChange={onChange} />
    case 'text':
      return <TextInput initValue={initValue} onChange={onChange} />
  }
  return null
}
Value.propTypes = {
  component: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
  initValue: PropTypes.any,
  onChange: PropTypes.func.isRequired,
}
