const AV = require('leancloud-storage')
const className = 'TicketForm'
const toPointer = (id) => AV.Object.createWithoutData(className, id)

class FormService {
  createQuery(options) {
    const { limit, skip } = options
    const query = new AV.Query(className)
    if (typeof limit === 'number') {
      query.limit(limit)
    }
    if (typeof skip === 'number') {
      query.skip(skip)
    }
    query.addDescending('updatedAt')
    return query
  }
  async list(options) {
    const list = await this.createQuery(options).find({ useMasterKey: true })
    return list.map(this.pick)
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
  async add(formData) {
    const { title, fieldIds } = formData
    const form = new AV.Object(className)
    const data = await form.save(
      {
        ACL: {},
        fieldIds,
        title,
      },
      {
        useMasterKey: true,
      }
    )
    return this.pick(data)
  }
  async update(id, formData) {
    const form = toPointer(id)
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== undefined) {
        form.set(key === 'default_locale' ? 'defaultLocale' : key, formData[key])
      }
    })
    const result = await form.save(null, { useMasterKey: true })
    return {
      id: result.id,
      updatedAt: result.get('updatedAt'),
      ...formData,
    }
  }
  async delete(id) {
    const form = toPointer(id)
    await form.destroy({ useMasterKey: true })
    return { id }
  }
  pick(obj) {
    return {
      id: obj.id,
      title: obj.get('title'),
      fieldIds: obj.get('fieldIds'),
      updatedAt: obj.get('updatedAt'),
      createAt: obj.get('createAt'),
    }
  }
}

const service = new FormService()
module.exports = { service, toPointer }
