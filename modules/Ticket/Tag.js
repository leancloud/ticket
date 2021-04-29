import React, { useEffect, useState } from 'react'
import { Badge, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { cloud } from '../../lib/leancloud'

export default function Tag({ tag, ticket, isCustomerService }) {
  const { t } = useTranslation()
  const [data, setData] = useState()

  // TODO: fix race condition
  useEffect(() => {
    ;(async () => {
      if (window.ENABLE_LEANCLOUD_INTEGRATION && tag.key === 'appId') {
        const appId = tag.value
        if (!appId) {
          return
        }
        const app = await cloud.run('getLeanCloudApp', {
          appId,
          username: ticket.author.username,
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
  }, [tag.key, tag.value, ticket.author.username, isCustomerService])

  if (!data) {
    return (
      <div className="form-group">
        <Badge variant="secondary">
          {tag.key}: {tag.value}
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
  tag: PropTypes.shape({
    key: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }).isRequired,
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
}
