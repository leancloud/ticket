export const plugins = {}

export function setupPlugin(key, plugin) {
  if (!plugins[key]) {
    plugins[key] = []
  }
  plugins[key].push(plugin)
}
