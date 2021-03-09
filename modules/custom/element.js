import React from 'react'
import { app } from '../../lib/leancloud'

const elementsByMountPoint = {}

export function addCustomElement(element) {
  const { mountPoint } = element
  if (!mountPoint) {
    throw new TypeError('Cannot set custom element without mountPoint')
  }
  if (!elementsByMountPoint[mountPoint]) {
    elementsByMountPoint[mountPoint] = []
  }
  elementsByMountPoint[mountPoint].push(element)
}

export function MountCustomElement({ point, props }) {
  const elements = elementsByMountPoint[point]
  if (!elements) {
    return null
  }
  return elements.map((el, key) => React.createElement(el, { ...props, key, app }))
}
