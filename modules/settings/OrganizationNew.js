import React from 'react'
import { withTranslation } from 'react-i18next'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import { FormGroup, ControlLabel, FormControl, Button, HelpBlock } from 'react-bootstrap'
import {auth, db} from '../../lib/leancloud'

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

    this.setState({isSubmitting: true})
    try {
      const organization = await db.class('Organization').add({
        name,
        ACL: db.ACL().allow(auth.currentUser(), 'write')
      })
      const adminRoleName = getOrganizationRoleName(organization, true)
      const memberRoleName = getOrganizationRoleName(organization)
      const ACL = db.ACL()
        .allow(`role:${adminRoleName}`, 'write')
        .allow(`role:${memberRoleName}`, 'read')
      const adminRole = await auth.addRole({
        ACL,
        name: adminRoleName,
        users: [auth.currentUser()]
      })
      const memberRole = await auth.addRole({
        ACL,
        name: memberRoleName,
        users: [auth.currentUser()],
        roles: [adminRole]
      })
      await organization.update({ACL, adminRole, memberRole})
      this.props.joinOrganization(organization)
      this.props.history.push(`/settings/organizations/${organization.id}`)
      this.context.addNotification('Add organization successful')
    } catch (e) {
      this.context.addNotification(e)
    } finally {
      this.setState({isSubmitting: false})
    }
  }

  render() {
    const { t } = this.props
    return (
      <div>
        <form onSubmit={this.handleSubmit.bind(this, t)}>
          <FormGroup controlId="organizationNameText" validationState={this.state.nameValidationState}>
            <ControlLabel>{t('organizationName')}</ControlLabel>
            <FormControl type="text" value={this.state.name} onChange={this.handleNameChange.bind(this, t)} />
            {this.state.nameValidationState === 'error' && <HelpBlock>{this.state.nameHelpMessage}</HelpBlock>}
          </FormGroup>
          <Button type='submit' disabled={this.state.isSubmitting} bsStyle='success'>{t('save')}</Button>
          {' '}
          <Button type='button' onClick={() => this.props.history.push('/settings/organizations')}>{t('return')}</Button>
        </form>
      </div>
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
