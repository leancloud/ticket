import i18next from 'i18next'
import { useEffect, useState } from 'react'

import { db } from '../../lib/leancloud'

/**
 * @typedef {{
 *   name: string;
 *   createdAt: Date;
 *   order?: number;
 *   parent?: Category;
 *   children?: Array<Category>;
 * }} Category
 */

/**
 * @param {Category} category
 * @returns {string}
 */
export function getCategoryName(category) {
  let { name } = category
  if (category.deletedAt) {
    name += i18next.t('disabled')
  }
  return name
}

/**
 * Sort categories in place.
 * @param {Array<Category>} categories
 */
function sortCategories(categories) {
  categories.sort((c1, c2) => {
    return (c1.order ?? c1.createdAt.getTime()) - (c2.order ?? c2.createdAt.getTime())
  })
  categories.forEach((c) => {
    if (c.children) {
      sortCategories(c.children)
    }
  })
}

/**
 * @param {Array<Category>} categories
 * @param {Function} callback
 * @param {Array} results
 * @param {number} [depth]
 */
function mapCategories(categories, callback, results, depth = 0) {
  categories.forEach((category) => {
    results.push(callback(category, depth))
    if (category.children) {
      mapCategories(category.children, callback, results, depth + 1)
    }
  })
}

export class CategoryManager {
  /**
   * @param {Array<Category>} categories
   */
  constructor(categories) {
    this.categories = categories
    this.categoryById = {}
    this.categories.forEach((category) => {
      this.categoryById[category.objectId] = category
    })
    this.categories.forEach((category) => {
      if (category.parent) {
        category.parent = this.categoryById[category.parent.objectId]
        if (!category.parent.children) {
          category.parent.children = []
        }
        category.parent.children.push(category)
      }
    })
    this.topLevelCategories = this.categories.filter((category) => !category.parent)
    sortCategories(this.topLevelCategories)
  }

  /**
   * @param {string} id
   * @returns {Array<Category>}
   */
  getNodes(id) {
    const nodes = []
    if (id in this.categoryById) {
      nodes.push(this.categoryById[id])
      while (nodes[0].parent) {
        nodes.unshift(nodes[0].parent)
      }
    }
    return nodes
  }

  /**
   * @param {string} id
   * @returns {Category}
   */
  get(id) {
    return this.categoryById[id]
  }

  /**
   * @param {Function} callback
   * @returns {Array}
   */
  map(callback) {
    const results = []
    mapCategories(this.topLevelCategories, callback, results)
    return results
  }
}

const EMPTY_CATEGORIES = new CategoryManager([])

/**
 * @returns {CategoryManager}
 */
export function useCategories() {
  const [categories, setCategories] = useState(EMPTY_CATEGORIES)
  useEffect(() => {
    db.class('Category')
      .limit(1000)
      .find()
      .then((objects) => setCategories(new CategoryManager(objects.map((o) => o.toJSON()))))
      .catch(console.error)
  }, [])
  return categories
}
