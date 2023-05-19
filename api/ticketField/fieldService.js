const AV = require('leancloud-storage')
const className = 'TicketField'
const toPointer = (id) => AV.Object.createWithoutData(className, id)

class FieldService {
  createQuery(options) {
    const { limit, skip, search, ids } = options
    const query = new AV.Query(className)
    if (typeof limit === 'number') {
      query.limit(limit)
    }
    if (typeof skip === 'number') {
      query.skip(skip)
    }
    if (search) {
      query.contains('title', search)
    }
    if (ids && ids.length > 0) {
      query.containedIn('objectId', ids)
    }
    query.equalTo('active', true)
    query.addDescending('updatedAt')
    return query
  }
  async list(options, asStaff) {
    const list = await this.createQuery(options).find({ useMasterKey: true })
    return list.map((field) => this.pick(field, asStaff))
  }
  count(options) {
    return this.createQuery(options).count({
      useMasterKey: true,
    })
  }
  async get(id) {
    const data = await new AV.Query(className).get(id, { useMasterKey: true })
    return this.pick(data)
  }
  async add(fieldData) {
    const { title, type, required, default_locale } = fieldData
    const field = new AV.Object(className)
    const data = await field.save(
      {
        ACL: {},
        title,
        type,
        required,
        active: true,
        defaultLocale: default_locale,
      },
      {
        useMasterKey: true,
      }
    )
    return this.pick(data)
  }
  async update(id, fieldData) {
    const field = toPointer(id)
    Object.keys(fieldData).forEach((key) => {
      if (fieldData[key] !== undefined) {
        field.set(key === 'default_locale' ? 'defaultLocale' : key, fieldData[key])
      }
    })
    const result = await field.save(null, { useMasterKey: true })
    return {
      id: result.id,
      updatedAt: result.get('updatedAt'),
      ...fieldData,
    }
  }
  pick(obj, asStaff) {
    return {
      id: obj.id,
      title: obj.get('title'),
      type: obj.get('type'),
      default_locale: obj.get('defaultLocale'),
      active: !!obj.get('active'),
      required: !!obj.get('required'),
      updatedAt: obj.get('updatedAt'),
      createAt: obj.get('createAt'),
      meta: obj.get('meta'),
      preview_template: asStaff ? obj.get('previewTemplate') : undefined,
    }
  }
}
const service = new FieldService()
module.exports = { service, toPointer }
