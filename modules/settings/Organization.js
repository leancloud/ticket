import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, ControlLabel, FormControl, Button, Table, HelpBlock} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {UserForm, UserLabel} from './../common'

export default class Organization extends React.Component {

  componentDidMount() {
    const id = this.props.params.id
    return AV.Object.createWithoutData('Organization', id)
    .fetch({include: 'memberRole,adminRole'})
    .then(organization => {
      return Promise.all([
        AV.Cloud.rpc('getRoleUsers', {roleId: organization.get('adminRole').id}),
        AV.Cloud.rpc('getRoleUsers', {roleId: organization.get('memberRole').id})
      ])
      .then(([admins, members]) => {
        members = _.differenceBy(members, admins, 'id')
        this.setState({
          organization,
          name: organization.get('name'),
          nameValidationState: null,
          nameHelpMessage: '',
          nameChanged: false,
          admins,
          members,
          isAdmin: !!_.find(admins, u => u.id == AV.User.current().id),
        })
        return
      })
    })
  }

  handleNameChange(e) {
    const name = e.target.value
    this.setState({
      name,
      nameChanged: name !== this.state.organization.get('name'),
      nameValidationState: name.trim().length > 0 ? 'success' : 'error',
      nameHelpMessage: '组织名称不能为空。',
    })
  }

  submitNameChange(e) {
    e.preventDefault()

    const name = this.state.name.trim()
    if (name.length == 0) {
      this.setState({
        nameValidationState: 'error',
        nameHelpMessage: '组织名称不能为空。',
      })
      return
    }

    const organization = this.state.organization
    return organization.save({name})
    .then(() => {
      this.setState({
        nameValidationState: 'null',
        nameHelpMessage: '',
      })
      return
    })
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  handleAddUser(user) {
    const memberRole = this.state.organization.get('memberRole')
    memberRole.getUsers().add(user)
    return memberRole.save()
    .then(() => {
      const members = this.state.members
      members.push(user)
      this.setState({members})
      return
    })
    .catch(this.context.addNotification)
  }

  handleRemove() {
    new AV.Query('Ticket')
    .equalTo('organization', this.state.organization)
    .count()
    .then(count => {
      const result = confirm(`确认要删除组织：${this.state.organization.get('name')}
该操作会将 ${count} 个工单重新归属于创建者名下。`)
      if (!result) {
        return
      }

      const organization = this.state.organization
      const adminRole = organization.get('adminRole')
      const memberRole = organization.get('memberRole')
      // Organization afterDelete hook 将会更新相关 Tickets
      return organization.destroy()
      .then(() => {
        return memberRole.destroy()
      })
      .then(() => {
        return adminRole.destroy()
      })
      .then(() => {
        this.props.leaveOrganization(organization)
        this.context.router.push('/settings/organizations')
        return
      })
    })
    .catch(this.context.addNotification)
  }

  handleSubmit(e) {
    e.preventDefault()
    this.setState({isSubmitting: true})

    const organization = this.state.organization

    return organization.save()
    .then(() => {
      this.setState({isSubmitting: false})
      this.context.router.push(`/settings/organizations/${organization.id}`)
      return
    })
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  promote(user) {
    const role = this.state.organization.get('adminRole')
    role.getUsers().add(user)
    role.save()
    .then(() => {
      let {admins, members} = this.state
      admins.push(user)
      members = _.reject(members, user)
      this.setState({admins, members})
      return
    })
    .catch(this.context.addNotification)
  }

  handleDemotion(user) {
    let {admins, members} = this.state
    if (admins.length <= 1) {
      this.context.addNotification(new Error('该组织至少需要一名管理员。'))
      return
    }

    const role = this.state.organization.get('adminRole')
    role.getUsers().remove(user)
    role.save()
    .then(() => {
      admins = _.reject(admins, user)
      members.push(user)
      this.setState({admins, members, isAdmin: user.id !== AV.User.current().id})
      return
    })
    .catch(this.context.addNotification)
  }

  handleRemoveMember(user) {
    const result = confirm(`确认要将用户 ${user.get('name')} 从该组织移除？`) 
    if (result) {
      const memberRole = this.state.organization.get('memberRole')
      memberRole.getUsers().remove(user)
      memberRole.save()
      .then(() => {
        const members = this.state.members
        this.setState({members: _.reject(members, user)})
        return
      })
      .catch(this.context.addNotification)
    }
  }

  render() {
    if (!this.state) {
      return <div>数据读取中……</div>
    }

    return (
      <div>
        {this.state.isAdmin &&
          <Form onSubmit={this.submitNameChange.bind(this)}>
            <FormGroup controlId='nameText' validationState={this.state.nameValidationState}>
              <ControlLabel>组织名称</ControlLabel>
              <FormControl type="text" value={this.state.name} onChange={this.handleNameChange.bind(this)} />
              {this.state.nameValidationState === 'error' && <HelpBlock>{this.state.nameHelpMessage}</HelpBlock>}
              {this.state.nameValidationState !== 'error' && this.state.nameChanged && <Button type='submit' disabled={this.state.isSubmitting}>保存名称</Button>}
            </FormGroup>
          </Form>
          ||
          <h2>{this.state.name}</h2>
        }
        {this.state.isAdmin && <UserForm addUser={this.handleAddUser.bind(this)} />}
        <Table bordered>
          <thead>
            <tr>
              <th>用户</th>
              <th>角色</th>
              {this.state.isAdmin && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {this.state.admins.map(u => {
              return <tr key={u.id}>
                <td><UserLabel user={u} /></td>
                <td>管理员</td>
                {this.state.isAdmin && <td>
                  <Button onClick={() => this.handleDemotion(u)}>降级为成员</Button>{' '}
                </td>}
              </tr>
            })}
            {this.state.members.map(u => {
              return <tr key={u.id}>
                <td><UserLabel user={u} /></td>
                <td>成员</td>
                {this.state.isAdmin && <td>
                  <Button onClick={() => this.promote(u)}>晋升为管理员</Button>{' '}
                  <Button onClick={() => this.handleRemoveMember(u)}>移除</Button>
                </td>}
              </tr>
            })}
          </tbody>
        </Table>
        <Button type='button' onClick={() => this.context.router.push('/settings/organizations')}>返回</Button>{' '}
        {this.state.isAdmin && <Button type='button' onClick={this.handleRemove.bind(this)} bsStyle='danger'>删除组织</Button>}
      </div>
    )
  }

}

Organization.propTypes = {
  params: PropTypes.object.isRequired,
  leaveOrganization: PropTypes.func,
}

Organization.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}
