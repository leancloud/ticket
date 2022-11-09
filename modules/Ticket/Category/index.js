import React, { useMemo } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import css from './index.css'
import { fetch } from '../../../lib/leancloud'

function AsyncCategory({ block, categoryId }) {
  const { t } = useTranslation()
  const { data: categories, isLoading } = useQuery('categories', () => fetch('/api/2/categories'))
  const categoryPath = useMemo(() => {
    if (!categories) {
      return []
    }
    const path = [categories.find((c) => c.id === categoryId)]
    while (path[0]?.parentId) {
      path.unshift(categories.find((c) => c.id === path[0].parentId))
    }
    return path.map((c) => c.name)
  }, [categories, categoryId])
  return (
    <span className={classNames(css.category, { [css.block]: block })}>
      {isLoading ? `${t('loading')}...` : categoryPath.join(' / ')}
    </span>
  )
}
AsyncCategory.propTypes = {
  categoryId: PropTypes.string.isRequired,
  block: PropTypes.bool,
}

// eslint-disable-next-line react/prop-types
export function Category({ categoryId, block }) {
  return <AsyncCategory block={block} categoryId={categoryId} />
}

/**
 * @param {any[]} categoryTree
 * @param {(any, any) => number} compareFn
 */
function sortCategoryTree(categoryTree, compareFn) {
  categoryTree.forEach((category) => {
    if (category.children) {
      sortCategoryTree(category.children, compareFn)
    }
  })
  return categoryTree.sort(compareFn)
}

/**
 * @param {any[]} categories
 */
function makeCategoryTree(categories) {
  const categoryById = categories.reduce((map, category) => {
    map[category.id] = { ...category }
    return map
  }, {})
  const parents = []
  Object.values(categoryById).forEach((category) => {
    if (category.parentId) {
      const parent = categoryById[category.parentId]
      if (parent) {
        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(category)
      }
    } else {
      parents.push(category)
    }
  })
  return sortCategoryTree(parents, (a, b) => a.position - b.position)
}

function mapCategoryTree(categoryTree, callback, depth = 0, results = []) {
  categoryTree.forEach((category) => {
    results.push(callback(category, depth))
    if (category.children) {
      mapCategoryTree(category.children, callback, depth + 1, results)
    }
  })
  return results
}

export function CategorySelect({ categories, value, onChange, children, ...props }) {
  const { t } = useTranslation()
  const categoryNames = useMemo(() => {
    return mapCategoryTree(makeCategoryTree(categories), (category, depth) => {
      const indent = depth ? '　'.repeat(depth) + '└ ' : ''
      return {
        ...category,
        name: indent + category.name + (category.active ? '' : t('disabled')),
      }
    })
  }, [t, categories])

  return (
    <Form.Control {...props} as="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
      {categoryNames.map(({ id, name }) => (
        <option key={id} value={id} disabled={id === value}>
          {name}
        </option>
      ))}
    </Form.Control>
  )
}
CategorySelect.propTypes = {
  categories: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node,
}
