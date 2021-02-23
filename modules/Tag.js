/*global ENABLE_LEANCLOUD_INTERGRATION */
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Label } from 'react-bootstrap'
import LC, { cloud } from '../lib/leancloud'

export default function Tag({ tag, ticket, isCustomerService }) {
  const { t } = useTranslation()
  const [data, setData] = useState()

  // TODO: fix race condition
  useEffect(() => {
    (async () => {
      if (ENABLE_LEANCLOUD_INTERGRATION && tag.data.key === 'appId') {
        const appId = tag.data.value
        if (!appId) {
          return
        }
        const app = await cloud.run('getLeanCloudApp', {
          appId,
          username: ticket.data.author.data.username,
        })
        setData({key: 'application', value: app.app_name})
        if (isCustomerService) {
          const url = await cloud.run('getLeanCloudAppUrl', {
            appId,
            region: app.region,
          })
          if (url) {
            setData(prevData => ({...prevData, url}))
          }
        }
      }
    })()
  }, [tag, ticket, isCustomerService])

  if (!data) {
    return (
      <div className="form-group">
        <Label bsStyle="default">{tag.data.key}: {tag.data.value}</Label>
      </div>
    )
  }
  return (
    <div>
      <label className="control-label">
        {t(data.key)}
      </label>
      <div className="form-group">
        {data.url ? (
          <a className="btn btn-default" href={data.url} target='_blank'>
            {data.value}
          </a>
        ) : (
          <a className="btn btn-default disabled">
            {data.value}
          </a>
        )}
      </div>
    </div>
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
