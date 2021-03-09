/* global LEANCLOUD_APP_ENV */

import { addCustomElement } from '../modules/custom/element'

export function useClientPlugin(plugin) {
  if (LEANCLOUD_APP_ENV === 'development') {
    console.log('Using plugin:', plugin.name)
  }
  if (plugin.customElements) {
    plugin.customElements.forEach(addCustomElement)
  }
}
