import { useTitle } from './hooks'

export function DocumentTitle({ title }) {
  useTitle(title)
  return null
}
