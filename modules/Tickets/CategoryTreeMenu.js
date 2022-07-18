import React, { useMemo } from 'react'
import { Dropdown, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import css from './CategoryTreeMenu.css'

function getIndentString(depth) {
  return depth === 0 ? '' : '　'.repeat(depth) + '└ '
}

export default function CategoryTreeMenu({ className, categoriesTree, value, onChange }) {
  const { t } = useTranslation()

  const items = useMemo(() => {
    const items = []
    const dfs = (categories, depth = 0) => {
      for (const category of categories) {
        if (!category.data.deletedAt) {
          items.push({
            id: category.id,
            name: getIndentString(depth) + category.data.name,
          })
        }
        if (category.children && category.children.length) {
          dfs(category.children, depth + 1)
        }
      }
    }
    if (categoriesTree) {
      dfs(categoriesTree)
    }
    return items
  }, [categoriesTree])

  const currentCategoryName = useMemo(() => {
    if (!value) {
      return t('all')
    }
    if (categoriesTree) {
      const queue = categoriesTree.slice()
      while (queue.length) {
        const category = queue.shift()
        if (category.id === value) {
          return category.data.name
        }
        if (category.children) {
          category.children.forEach((c) => queue.push(c))
        }
      }
    }
    return value
  }, [categoriesTree, value, t])

  return (
    <Form.Group className={className}>
      <Form.Label>{t('category')}:&nbsp;</Form.Label>
      <Dropdown onSelect={onChange}>
        <Dropdown.Toggle variant="light" size="sm">
          {currentCategoryName}
        </Dropdown.Toggle>
        <Dropdown.Menu className={css.menuBody}>
          <Dropdown.Item active={!value}>{t('all')}</Dropdown.Item>
          {items.map(({ id, name }) => (
            <Dropdown.Item key={id} eventKey={id} active={value === id}>
              {name}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </Form.Group>
  )
}
CategoryTreeMenu.propTypes = {
  className: PropTypes.string,
  categoriesTree: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func,
}
