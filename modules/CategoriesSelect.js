import React from 'react'
import PropTypes from 'prop-types'
import {FormControl} from 'react-bootstrap'
import _ from 'lodash'
import translate from './i18n/translate'

const CategoriesSelect = ({t, categoriesTree, selected, onChange, hiddenDisable = true}) => {
  const options = _.compact(exports.depthFirstSearchMap(categoriesTree, c => {
    if (hiddenDisable && c.get('deletedAt')) {
      return
    }
    return <option key={c.id} value={c.id} disabled={selected && (selected.id || selected.objectId) == c.id}>{exports.getNodeIndentString(c) + exports.getCategoryName(c, t)}</option>
  }))
  return (
      <FormControl componentClass='select'
        value={selected ? (selected.id || selected.objectId) : ''}
        onChange={onChange}>
        <option value=''></option>
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
  t: PropTypes.func
}

export default translate(CategoriesSelect)
  