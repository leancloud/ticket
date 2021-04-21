/* global ENABLE_LEANCLOUD_INTEGRATION */
import React, { useEffect, useState } from 'react'
import { Badge, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import LC, { cloud } from '../lib/leancloud'

export default function Tag({ tag, ticket, isCustomerService }) {
  const { t } = useTranslation()
  const [data, setData] = useState()

  // TODO: fix race condition
  useEffect(() => {
    ;(async () => {
      if (ENABLE_LEANCLOUD_INTEGRATION && tag.data.key === 'appId') {
        const appId = tag.data.value
        if (!appId) {
          return
        }
        const app = await cloud.run('getLeanCloudApp', {
          appId,
          username: ticket.data.author.data.username,
        })
        setData({ key: 'application', value: app.app_name })
        if (isCustomerService) {
          const url = await cloud.run('getLeanCloudAppUrl', {
            appId,
            region: app.region,
          })
          if (url) {
            setData((prevData) => ({ ...prevData, url }))
          }
        }
      }
    })()
  }, [tag, ticket, isCustomerService])

  if (!data) {
    return (
      <div className="form-group">
        <Badge variant="secondary">
          {tag.data.key}: {tag.data.value}
        </Badge>
      </div>
    )
  }
  return (
    <Form.Group>
      <Form.Label>{t(data.key)}</Form.Label>
      <Form.Group>
        {data.url ? (
          <Button variant="light" href={data.url} target="_blank">
            {data.value}
          </Button>
        ) : (
          <Button variant="light" disabled>
            {data.value}
          </Button>
        )}
      </Form.Group>
    </Form.Group>
  )
}

Tag.propTypes = {
  tag: PropTypes.instanceOf(LC.LCObject).isRequired,
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
}

Tag.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}
