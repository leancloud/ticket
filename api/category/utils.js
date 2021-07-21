const AV = require('leancloud-storage')

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
    group: category.get('group'),
    form_id: category.get('form')?.id || '',
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
 * @returns {Promise<{[key: string]: Category}>}
 */
async function fetchCategoryMap() {
  return (await fetchCategories()).reduce((map, category) => {
    map[category.id] = category
    return map
  }, {})
}

/**
 * @param {string} categoryId
 * @returns {Promise<{ objectId: string; name: string; }>}
 */
async function getTinyCategoryInfo(categoryId, categories) {
  const category = categories
    ? categories[categoryId]
    : encodeCategoryObject(await new AV.Query('Category').get(categoryId))
  return {
    objectId: category.id,
    name: category.name,
  }
}

function getCategoryPath(categoryId, categoryById) {
  let current = categoryById[categoryId]
  const path = [current.id]
  while (current.parent_id) {
    current = categoryById[current.parent_id]
    path.unshift(current.id)
  }
  return path
}

module.exports = {
  encodeCategoryObject,
  fetchCategories,
  fetchCategoryMap,
  getTinyCategoryInfo,
  getCategoryPath,
}
