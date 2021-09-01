/* eslint-disable i18n/no-chinese-character */

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Card } from 'react-bootstrap'

import styles from './index.module.scss'

const configKey = 'TapDesk:previewNext'

function getConfig() {
  return JSON.parse(localStorage.getItem(configKey) ?? '{}')
}

function setConfig(hidden) {
  const cfg = getConfig()
  cfg.hidden = hidden
  localStorage.setItem(configKey, JSON.stringify(cfg))
}

export function PreviewTip() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const { hidden } = getConfig()
    if (!hidden) {
      setOpen(true)
    }
  }, [])

  if (!open) {
    return null
  }
  return createPortal(
    <Card className={`${styles.previewTip} m-0`}>
      <button className="close" onClick={() => setOpen(false)}>
        &times;
      </button>

      <Card.Body>
        <Card.Text>体验新版客服界面</Card.Text>
        <div className="d-flex flex-row-reverse">
          <Button size="sm" as="a" href="/next/admin">
            OK
          </Button>
          <Button
            className="mr-1"
            variant="light"
            size="sm"
            onClick={() => {
              setOpen(false)
              setConfig(true)
            }}
          >
            不再提示
          </Button>
        </div>
      </Card.Body>
    </Card>,
    document.body
  )
}
