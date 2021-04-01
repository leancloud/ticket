/* global INTEGRATIONS */

import React, { Component } from 'react'
import { Button, Form, InputGroup } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { auth, cloud } from '../../lib/leancloud'

import Vacation from './Vacation'

class CustomerServiceProfile extends Component {
  constructor(props) {
    super(props)
    this.state = {
      wechatUsers: [],
      wechatUserId: auth.currentUser.data.wechatEnterpriseUserId,
    }
  }

  componentDidMount() {
    if (INTEGRATIONS.includes('Wechat')) {
      cloud
        .run('getWechatEnterpriseUsers', {})
        .then((wechatUsers) => {
          this.setState({ wechatUsers })
          return
        })
        .catch(this.context.addNotification)
    }
  }

  handleWechatIdChange(e) {
    this.setState({ wechatUserId: e.target.value })
  }

  handleSubmit(e) {
    e.preventDefault()
    auth.currentUser
      .update({
        wechatEnterpriseUserId: this.state.wechatUserId,
      })
      .catch(this.context.addNotification)
  }

  render() {
    const { t } = this.props
    const wechatUserOptions = this.state.wechatUsers.map((user) => (
      <option key={user.userid} value={user.userid}>
        {user.name}
      </option>
    ))
    return (
      <div>
        <h2>{t('associatedAccounts')}</h2>
        {INTEGRATIONS.includes('Wechat') && (
          <Form.Group>
            <Form.Label>{t('weCom')}</Form.Label>
            <InputGroup>
              <Form.Control
                as="select"
                value={this.state.wechatUserId}
                onChange={this.handleWechatIdChange.bind(this)}
              >
                <option key="undefined" value="">
                  {t('unlinked')}
                </option>
                {wechatUserOptions}
              </Form.Control>
              <InputGroup.Append>
                <Button variant="light" onClick={this.handleSubmit.bind(this)}>
                  {t('save')}
                </Button>
              </InputGroup.Append>
            </InputGroup>
          </Form.Group>
        )}
        <Vacation />
      </div>
    )
  }
}

CustomerServiceProfile.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

CustomerServiceProfile.propTypes = {
  t: PropTypes.func.isRequired,
}

export default withTranslation()(CustomerServiceProfile)
