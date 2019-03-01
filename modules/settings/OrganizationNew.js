import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Button, HelpBlock} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {getOrganizationRoleName} from './../common'

export default class OrganizationNew extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      name: '',
      nameValidationState: null,
      nameHelpMessage: '',
    }
  }

  handleNameChange(e) {
    this.setState({
      name: e.target.value,
      nameValidationState: e.target.value.trim().length > 0 ? 'success' : 'error',
      nameHelpMessage: '组织名称不能为空。',
    })
  }

  handleSubmit(e) {
    e.preventDefault()
   
    const name = this.state.name.trim()
    if (name.length == 0) {
      this.setState({
        nameValidationState: 'error',
        nameHelpMessage: '组织名称不能为空。',
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
    return (
      <div>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup controlId="organizationNameText" validationState={this.state.nameValidationState}>
            <ControlLabel>组织名称</ControlLabel>
            <FormControl type="text" value={this.state.name} onChange={this.handleNameChange.bind(this)} />
            {this.state.nameValidationState === 'error' && <HelpBlock>{this.state.nameHelpMessage}</HelpBlock>}
          </FormGroup>
          <Button type='submit' disabled={this.state.isSubmitting} bsStyle='success'>保存</Button>
          {' '}
          <Button type='button' onClick={() => this.context.router.push('/settings/organizations')}>返回</Button>
        </form>
      </div>
    )
  }

}

OrganizationNew.propTypes = {
  params: PropTypes.object,
  joinOrganization: PropTypes.func,
}

OrganizationNew.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}
