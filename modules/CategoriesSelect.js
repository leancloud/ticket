import React from 'react'
import { FormControl } from 'react-bootstrap'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { getNodeIndentString, getCategoryName } from './common'
import { depthFirstSearchMap } from '../lib/common'

export default function CategoriesSelect({
  categoriesTree,
  selected,
  hiddenDisable = true,
  ...props
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
          disabled={selected && (selected.id || selected.objectId) === c.id}
        >
          {getNodeIndentString(c) + getCategoryName(c)}
        </option>
      )
    })
  )
  return (
    <FormControl {...props} as="select" value={selected ? selected.id || selected.objectId : ''}>
      <option value=""></option>
      {options}
    </FormControl>
  )
}
CategoriesSelect.propTypes = {
  categoriesTree: PropTypes.array.isRequired,
  selected: PropTypes.object,
  hiddenDisable: PropTypes.bool,
}
