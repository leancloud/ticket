const AV = require('leancloud-storage')

const cache = require('../utils/cache')

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   description: string;
 *   parent_id: string;
 *   position: number;
 *   template: string;
 *   faq_ids: string[];
 *   active: boolean;
 *   created_at: Date;
 *   updated_at: Date;
 * }} Category
 */

/**
 * @param {AV.Object} category
 * @returns {Category}
 */
function encodeCategoryObject(category) {
  return {
    id: category.id,
    name: category.get('name'),
    description: category.get('description') || '',
    parent_id: category.get('parent')?.id || '',
    position: category.get('order') ?? category.createdAt.getTime(),
    template: category.get('qTemplate') || '',
    faq_ids: category.get('FAQs')?.map((faq) => faq.id) || [],
    active: !category.get('deletedAt'),
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  }
}

/**
 * @returns {Promise<Category[]>}
 */
async function fetchCategories() {
  const query = new AV.Query('Category')
  const categories = await query.find({ useMasterKey: true })
  return categories.map(encodeCategoryObject)
}

/**
 * @returns {Promise<Category[]>}
 */
function getCategories() {
  return cache.get('categories', fetchCategories, 1000 * 60 * 5)
}

module.exports = {
  encodeCategoryObject,
  fetchCategories,
  getCategories,
}
