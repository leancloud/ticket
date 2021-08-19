const AV = require('leancloud-storage')
const { toPointer: ticketFieldToPointer } = require('./fieldService')
const className = 'TicketFieldVariant'
const toPointer = (id) => AV.Object.createWithoutData(className, id)

class VariantService {
  async list(fieldIds) {
    const query = new AV.Query(className)
    query.containedIn('field', fieldIds.map(ticketFieldToPointer))
    const list = await query.find({ useMasterKey: true })
    return list.map(this.pick)
  }
  async add(fieldId, variants) {
    if (!Array.isArray(variants)) {
      throw new Error('Variant must be array')
    }
    const objects = variants.map(
      (variant) =>
        new AV.Object(className, {
          ACL: {},
          locale: variant.locale,
          title: variant.title,
          options: variant.options,
          field: ticketFieldToPointer(fieldId),
        })
    )
    const result = await AV.Object.saveAll(objects, { useMasterKey: true })
    return result.map(this.pick)
  }
  async delete(...fieldIds) {
    const variants = await this.list(fieldIds)
    return AV.Object.destroyAll(
      variants.map(({ id }) => toPointer(id)),
      { useMasterKey: true }
    )
  }
  async update(fieldId, variants) {
    await this.delete(fieldId)
    return this.add(fieldId, variants)
  }
  pick(obj) {
    return {
      id: obj.id,
      locale: obj.get('locale'),
      title: obj.get('title'),
      options: obj.get('options'),
      field_id: obj.get('field').id,
    }
  }
}

const service = new VariantService()
module.exports = { service, toPointer }
