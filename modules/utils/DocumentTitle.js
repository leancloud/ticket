import { useTitle } from 'react-use'

export function DocumentTitle({ title }) {
  useTitle(title)
  return null
}
