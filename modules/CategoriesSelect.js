import React from 'react'
import { FormControl } from 'react-bootstrap'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { getNodeIndentString, getCategoryName } from './common'
import { depthFirstSearchMap } from '../lib/common'

export default function CategoriesSelect({
  categoriesTree,
  selected,
  onChange,
  hiddenDisable = true,
}) {
  const options = _.compact(
    depthFirstSearchMap(categoriesTree, (c) => {
      if (hiddenDisable && c.get('deletedAt')) {
        return
      }
      return (
        <option
          key={c.id}
          value={c.id}
          disabled={selected && (selected.id || selected.objectId) == c.id}
        >
          {getNodeIndentString(c) + getCategoryName(c)}
        </option>
      )
    })
  )
  return (
    <FormControl
      as="select"
      value={selected ? selected.id || selected.objectId : ''}
      onChange={onChange}
    >
      <option value=""></option>
      {options}
    </FormControl>
  )
}

CategoriesSelect.displayName = 'CategoriesSelect'

CategoriesSelect.propTypes = {
  categoriesTree: PropTypes.array.isRequired,
  selected: PropTypes.object,
  onChange: PropTypes.func,
  hiddenDisable: PropTypes.bool,
}
