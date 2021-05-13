/**
 * @param {AV.Object} file
 */
function encodeFileObject(file) {
  return {
    id: file.id,
    name: file.get('name'),
    mime: file.get('mime_type'),
    url: file.get('url'),
  }
}

module.exports = { encodeFileObject }
