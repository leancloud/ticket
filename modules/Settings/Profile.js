/* global ENABLE_LEANCLOUD_INTEGRATION */
import React, { Component } from 'react'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { Avatar } from '../Avatar'
import AccountLink from './AccountLink'

class Profile extends Component {
  constructor(props) {
    super(props)
    this.state = {
      name: this.props.currentUser.data.name,
      email: this.props.currentUser.email,
    }
  }

  handleNameChange(e) {
    this.setState({ name: e.target.value })
  }

  handleEmailChange(e) {
    this.setState({ email: e.target.value })
  }

  handleSubmit(e) {
    e.preventDefault()
    return this.props
      .updateCurrentUser(this.state)
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  render() {
    const { t } = this.props
    return (
      <Row>
        <Col md={8}>
          <h2>{t('basicInfo')}</h2>
          <Form className="mb-3">
            <Form.Group>
              <Form.Label>{t('username')}</Form.Label>
              <Form.Control value={this.props.currentUser.username} disabled />
            </Form.Group>
            <Form.Group>
              <Form.Label>{t('nickname')}</Form.Label>
              <Form.Control value={this.state.name} onChange={this.handleNameChange.bind(this)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{t('email')}</Form.Label>
              <Form.Control value={this.state.email} onChange={this.handleEmailChange.bind(this)} />
            </Form.Group>
            <Button variant="light" onClick={this.handleSubmit.bind(this)}>
              {t('save')}
            </Button>
          </Form>
          {ENABLE_LEANCLOUD_INTEGRATION && <AccountLink currentUser={this.props.currentUser} />}
        </Col>
        <Col md={4}>
          <Form>
            <Form.Group>
              <Form.Label>{t('avatar')}</Form.Label>
            </Form.Group>
            <Avatar height="200" width="200" user={this.props.currentUser} />
            <div>
              <span>
                {t('changeAvatar')}{' '}
                <a href={t('gravatarUrl')} target="_blank">
                  Gravatar
                </a>
              </span>
            </div>
          </Form>
        </Col>
      </Row>
    )
  }
}

Profile.propTypes = {
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
  t: PropTypes.func.isRequired,
}

Profile.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(Profile)
