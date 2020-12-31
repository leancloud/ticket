import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Button, HelpBlock} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import translate from '../i18n/translate'
import {getOrganizationRoleName} from '../../lib/common'

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

  handleSubmit(t, e) {
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

    return new AV.Object('Organization', {
      name,
      ACL: {
        [AV.User.current().id]:{write: true}
      }
    }).save()
    .then(organization => {
      const adminRoleName = getOrganizationRoleName(organization, true)
      const memberRoleName = getOrganizationRoleName(organization)
      const acl = {
        ['role:' + adminRoleName]: {write: true},
        ['role:' + memberRoleName]: {read: true},
      }
      const adminRole = new AV.Role(adminRoleName)
      adminRole.getUsers().add(AV.User.current())
      adminRole.setACL(acl)

      const memberRole = new AV.Role(memberRoleName)
      memberRole.getUsers().add(AV.User.current())
      memberRole.setACL(acl)

      return organization.save({
        adminRole,
        memberRole,
        ACL: acl,
      })
      .then(() => {
        memberRole.getRoles().add(adminRole)
        return memberRole.save()
      })
      .then(() => {
        this.setState({isSubmitting: false})
        this.props.joinOrganization(organization)
        this.context.router.push(`/settings/organizations/${organization.id}`)
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
    })
  }

  render() {
    const {t} = this.props
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
          <Button type='button' onClick={() => this.context.router.push('/settings/organizations')}>{t('return')}</Button>
        </form>
      </div>
    )
  }

}

OrganizationNew.propTypes = {
  params: PropTypes.object,
  joinOrganization: PropTypes.func,
  t: PropTypes.func
}

OrganizationNew.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}

export default translate(OrganizationNew)
