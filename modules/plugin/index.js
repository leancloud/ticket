export const plugins = {}

export function usePlugin(key, plugin) {
  if (!plugins[key]) {
    plugins[key] = []
  }
  plugins[key].push(plugin)
}
