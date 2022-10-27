import React, { useContext, useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { cloud, db } from '../../lib/leancloud'
import { AppContext } from '../context'

export function LeanCloudApp({ ticketId, authorUserame }) {
  const { t } = useTranslation()
  const { addNotification, isUser } = useContext(AppContext)
  const [appId, setAppId] = useState('')
  const [appName, setAppName] = useState('')
  const [appURL, setAppURL] = useState('')

  useEffect(() => {
    db.class('Tag')
      .where('ticket', '==', db.class('Ticket').object(ticketId))
      .where('key', '==', 'appId')
      .first()
      .then((tag) => {
        if (tag) {
          setAppId(tag.data.value)
        }
        return
      })
      .catch(addNotification)
  }, [ticketId, addNotification])

  useEffect(() => {
    if (!appId) {
      return
    }
    ;(async () => {
      const app = await cloud.run('getLeanCloudApp', {
        appId,
        username: authorUserame,
      })
      setAppName(app.appName)
      if (!isUser) {
        setAppName(`${app.appName}(${app.region})`)
        const url = await cloud.run('getLeanCloudAppUrl', {
          appId,
          region: app.region,
        })
        if (url) {
          setAppURL(url)
        }
      }
    })()
  }, [appId, authorUserame, isUser])

  if (!appId) {
    return null
  }
  return (
    <Form.Group>
      <Form.Label>{t('application')}</Form.Label>
      <Form.Group>
        <Button variant="light" href={appURL} target="_blank" disabled={!appURL}>
          {appName || t('loading') + '...'}
        </Button>
      </Form.Group>
    </Form.Group>
  )
}

LeanCloudApp.propTypes = {
  ticketId: PropTypes.string.isRequired,
  authorUserame: PropTypes.string.isRequired,
}
