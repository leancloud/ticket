const AV = require('leancloud-storage')
const CLASS_NAME = 'Variant'
/**
 * 添加动态配置
 * @param {Array<object>} variants
 * @param {string} variantKey
 * @example  add ([
 *  locale: string, // required
 *  title: string,
 *  options: [{ }], // object array,
 * ],'ticketField')
 * @return {variantKey} uuid
 */
async function add(variants, variantKey) {
  if (!Array.isArray(variants)) {
    throw new Error('Variant must be array')
  }
  const objects = variants.map(
    (v) =>
      new AV.Object(CLASS_NAME, {
        ACL: {},
        locale: v.locale,
        title: v.title,
        options: v.options,
        key: variantKey,
      })
  )
  return AV.Object.saveAll(objects, { useMasterKey: true })
}

/**
 * 
 * @param {Array<[field,command,value]>} conditions
 * @returns 
 */
async function get(conditions) {
  const query = new AV.Query(CLASS_NAME)
  conditions.forEach(([field, command, value]) => {
    query[command](field, value)
  })
  return query.find({ useMasterKey: true })
}


async function update(variants, variantKey) {
   const oldVariants = await get([['key', 'equalTo', variantKey]])
   return Promise.all([AV.Object.destroyAll(oldVariants, { useMasterKey: true }), add(variants,variantKey)])
}

module.exports = {
  add,
  get,
  update,
}
