import React, { useCallback, useMemo } from 'react'
import { Tabs, Tab } from 'react-bootstrap'
import { useHistory, useLocation } from 'react-router-dom'
import Messages from './Messages'
import Subscriptions from './Subscriptions'

import _ from 'lodash'

const NOTIFICATIONS_PATHNAME_MAP = {
  Messages: '/notifications',
  Subscriptions: '/notifications/subscriptions'
}

export default function Notifications() {
  const history = useHistory()
  const { pathname } = useLocation()

  const handleSelect = useCallback((key) => {
    history.push(NOTIFICATIONS_PATHNAME_MAP[key])
  }, [history])

  const activeKey = useMemo(() => {
    return _.invert(NOTIFICATIONS_PATHNAME_MAP)[pathname]
  }, [pathname])

  return (
    <Tabs mountOnEnter id="tabs-notifications" activeKey={activeKey} onSelect={handleSelect}>
      <Tab eventKey="Messages" title="消息">
        <div style={{ marginTop: 20 }}>
          <Messages />
        </div>
      </Tab>
      <Tab eventKey="Subscriptions" title="订阅工单">
        <Subscriptions />
      </Tab>
    </Tabs>
  )
}
