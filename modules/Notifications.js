import React, { Component } from 'react'
import { Tabs, Tab } from 'react-bootstrap'
import PropTypes from 'prop-types'
import Messages from './Messages'
import Subscriptions from './Subscriptions'

import _ from 'lodash'

const NOTIFICATIONS_PATHNAME_MAP = {
  Messages: '/notifications',
  Subscriptions: '/notifications/subscriptions'
}


export default class Notifications extends Component {
  handleSelect(key) {
    this.context.router.push(NOTIFICATIONS_PATHNAME_MAP[key])
  }

  render() {
    const activeKey = _.invert(NOTIFICATIONS_PATHNAME_MAP)[
      this.props.location.pathname
    ]
    return (
      <Tabs
        defaultActiveKey={activeKey}
        activeKey={activeKey}
        id="uncontrolled-tab-example"
        onSelect={this.handleSelect.bind(this)}
      >
        <Tab eventKey="Messages" title="消息">
          <div style={{ marginTop: 20 }}>
            <Messages />
          </div>
        </Tab>
        <Tab eventKey="Subscriptions" title="订阅工单">
          <Subscriptions location={this.props.location} />
        </Tab>
      </Tabs>
    )
  }
}

Notifications.propTypes = {
  location: PropTypes.object.isRequired
}

Notifications.contextTypes = {
  router: PropTypes.object.isRequired
}
