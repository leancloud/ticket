import React from 'react'
import { Button, Form } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'

import { auth, db } from '../../lib/leancloud'
import { getOrganizationRoleName } from '../../lib/common'

class OrganizationNew extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      name: '',
      nameValidationState: null,
      nameHelpMessage: '',
    }
  }

  handleNameChange(t, e) {
    this.setState({
      name: e.target.value,
      nameValidationState: e.target.value.trim().length > 0 ? 'success' : 'error',
      nameHelpMessage: t('organizationNameNonempty'),
    })
  }

  async handleSubmit(t, e) {
    e.preventDefault()

    const name = this.state.name.trim()
    if (name.length == 0) {
      this.setState({
        nameValidationState: 'error',
        nameHelpMessage: t('organizationNameNonempty'),
      })
      return
    }

    this.setState({ isSubmitting: true })
    try {
      const organization = await db.class('Organization').add({
        name,
        ACL: db.ACL().allow(auth.currentUser, 'write'),
      })
      const adminRoleName = getOrganizationRoleName(organization, true)
      const memberRoleName = getOrganizationRoleName(organization)
      const ACL = db
        .ACL()
        .allow(`role:${adminRoleName}`, 'write')
        .allow(`role:${memberRoleName}`, 'read')
      const adminRole = await auth.addRole({
        ACL,
        name: adminRoleName,
        users: [auth.currentUser],
      })
      const memberRole = await auth.addRole({
        ACL,
        name: memberRoleName,
        users: [auth.currentUser],
        roles: [adminRole],
      })
      await organization.update({ ACL, adminRole, memberRole })
      Object.assign(organization.data, { name, adminRole, memberRole })
      this.props.joinOrganization(organization)
      this.props.history.push(`/settings/organizations/${organization.id}`)
      this.context.addNotification('Add organization successful')
    } catch (e) {
      this.context.addNotification(e)
    } finally {
      this.setState({ isSubmitting: false })
    }
  }

  render() {
    const { t } = this.props
    return (
      <Form onSubmit={this.handleSubmit.bind(this, t)}>
        <Form.Group controlId="organizationNameText">
          <Form.Label>{t('organizationName')}</Form.Label>
          <Form.Control
            value={this.state.name}
            onChange={this.handleNameChange.bind(this, t)}
            isValid={this.state.nameValidationState === 'success'}
            isInvalid={this.state.nameValidationState === 'error'}
          />
          <Form.Control.Feedback type="invalid">{this.state.nameHelpMessage}</Form.Control.Feedback>
        </Form.Group>
        <Button type="submit" variant="success" disabled={this.state.isSubmitting}>
          {t('save')}
        </Button>{' '}
        <Button variant="light" onClick={() => this.props.history.push('/settings/organizations')}>
          {t('return')}
        </Button>
      </Form>
    )
  }
}

OrganizationNew.propTypes = {
  history: PropTypes.object.isRequired,
  joinOrganization: PropTypes.func,
  t: PropTypes.func.isRequired,
}

OrganizationNew.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(withRouter(OrganizationNew))
