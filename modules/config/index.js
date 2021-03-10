const config = {}

export function setConfig(key, value) {
  if (typeof value === 'function') {
    config[key] = value(config[key])
  } else {
    config[key] = value
  }
}

export function getConfig(key, defaultValue) {
  return config[key] ?? defaultValue
}
