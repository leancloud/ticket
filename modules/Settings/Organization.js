import React from 'react'
import { Button, Form, Table } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { auth, cloud, db } from '../../lib/leancloud'
import { UserLabel } from '../UserLabel'
import UserForm from '../UserForm'
class Organization extends React.Component {
  componentDidMount() {
    const { id } = this.props.match.params
    return db
      .class('Organization')
      .object(id)
      .get({ include: ['memberRole', 'adminRole'] })
      .then((organization) => {
        return Promise.all([
          cloud.rpc('getRoleUsers', { roleId: organization.get('adminRole').id }),
          cloud.rpc('getRoleUsers', { roleId: organization.get('memberRole').id }),
        ]).then(([admins, members]) => {
          members = _.differenceBy(members, admins, 'id')
          this.setState({
            organization,
            name: organization.get('name'),
            nameValidationState: null,
            nameHelpMessage: '',
            nameChanged: false,
            admins,
            members,
            isAdmin: !!_.find(admins, (u) => u.id === auth.currentUser.id),
          })
          return
        })
      })
  }

  handleNameChange(t, e) {
    const name = e.target.value
    this.setState({
      name,
      nameChanged: name !== this.state.organization.get('name'),
      nameValidationState: name.trim().length > 0 ? 'success' : 'error',
      nameHelpMessage: t('organizationNameNonempty'),
    })
  }

  submitNameChange(t, e) {
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
    const organization = this.state.organization
    return organization
      .update({ name })
      .then(() => {
        this.setState({
          nameValidationState: null,
          nameHelpMessage: '',
          isSubmitting: false,
        })
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  handleAddUser(user) {
    const memberRole = this.state.organization.get('memberRole')
    return auth
      .role(memberRole.id)
      .add(user)
      .then(() => {
        const members = this.state.members
        members.push(user)
        this.setState({ members })
        return
      })
      .catch(this.context.addNotification)
  }

  handleRemove(t) {
    db.class('Ticket')
      .where('organization', '==', this.state.organization)
      .count()
      .then((count) => {
        const result = confirm(`${t('confirmDeleteOrganization')} ${this.state.organization.get(
          'name'
        )}.
${count} ${t('deleteOrganizationConsequence')}`)
        if (!result) {
          return
        }

        const organization = this.state.organization
        const adminRole = organization.get('adminRole')
        const memberRole = organization.get('memberRole')
        // Organization afterDelete hook 将会更新相关 Tickets
        return organization
          .delete()
          .then(() => {
            return memberRole.delete()
          })
          .then(() => {
            return adminRole.delete()
          })
          .then(() => {
            this.props.leaveOrganization(organization)
            this.props.history.push('/settings/organizations')
            return
          })
      })
      .catch(this.context.addNotification)
  }

  promote(user) {
    const role = this.state.organization.get('adminRole')
    auth
      .role(role.id)
      .add(user)
      .then(() => {
        let { admins, members } = this.state
        admins.push(user)
        members = _.reject(members, user)
        this.setState({ admins, members })
        return
      })
      .catch(this.context.addNotification)
  }

  handleDemotion(user, t) {
    let { admins, members } = this.state
    if (admins.length <= 1) {
      this.context.addNotification(new Error(t('demoteToMemberError')))
      return
    }

    const role = this.state.organization.get('adminRole')
    auth
      .role(role.id)
      .remove(user)
      .then(() => {
        admins = _.reject(admins, user)
        members.push(user)
        this.setState({ admins, members, isAdmin: user.id !== auth.currentUser.id })
        return
      })
      .catch(this.context.addNotification)
  }

  handleRemoveMember(user, t) {
    const result = confirm(`${t('confirmRemoveMember')} ${user.get('name')}`)
    if (result) {
      const memberRole = this.state.organization.get('memberRole')
      auth
        .role(memberRole.id)
        .remove(user)
        .then(() => {
          const members = this.state.members
          this.setState({ members: _.reject(members, user) })
          return
        })
        .catch(this.context.addNotification)
    }
  }

  render() {
    const { t } = this.props
    if (!this.state) {
      return <div>{t('loading')}……</div>
    }

    return (
      <div>
        {(this.state.isAdmin && (
          <Form onSubmit={this.submitNameChange.bind(this, t)}>
            <Form.Group controlId="nameText">
              <Form.Label>{t('organizationName')}</Form.Label>
              <Form.Control
                value={this.state.name}
                onChange={this.handleNameChange.bind(this, t)}
                isValid={this.state.nameValidationState === 'success'}
                isInvalid={this.state.nameValidationState === 'error'}
              />
              <Form.Control.Feedback type="invalid">
                {this.state.nameHelpMessage}
              </Form.Control.Feedback>
            </Form.Group>
            <Button
              variant="light"
              type="submit"
              disabled={
                this.state.isSubmitting ||
                this.state.nameValidationState === 'error' ||
                !this.state.nameChanged
              }
            >
              {t('save')}
            </Button>
          </Form>
        )) || <h2>{this.state.name}</h2>}
        {this.state.isAdmin && (
          <div className="mt-2 mb-1">
            <UserForm addUser={this.handleAddUser.bind(this)} />
          </div>
        )}
        <Table bordered>
          <thead>
            <tr>
              <th>{t('user')}</th>
              <th>{t('role')}</th>
              {this.state.isAdmin && <th>{t('operation')}</th>}
            </tr>
          </thead>
          <tbody>
            {this.state.admins.map((u) => (
              <tr key={u.id}>
                <td>
                  <UserLabel user={u.data} />
                </td>
                <td>{t('admin')}</td>
                {this.state.isAdmin && (
                  <td>
                    <Button variant="light" onClick={() => this.handleDemotion(u, t)}>
                      {t('demoteToMember')}
                    </Button>{' '}
                  </td>
                )}
              </tr>
            ))}
            {this.state.members.map((u) => (
              <tr key={u.id}>
                <td>
                  <UserLabel user={u.data} />
                </td>
                <td>{t('member')}</td>
                {this.state.isAdmin && (
                  <td>
                    <Button variant="light" onClick={() => this.promote(u)}>
                      {t('promoteToAdmin')}
                    </Button>{' '}
                    <Button variant="light" onClick={() => this.handleRemoveMember(u, t)}>
                      {t('remove')}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
        <Button variant="light" onClick={() => this.props.history.push('/settings/organizations')}>
          {t('return')}
        </Button>{' '}
        {this.state.isAdmin && (
          <Button onClick={this.handleRemove.bind(this, t)} variant="danger">
            {t('deleteOrganization')}
          </Button>
        )}
      </div>
    )
  }
}

Organization.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  leaveOrganization: PropTypes.func,
  t: PropTypes.func,
}

Organization.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(withRouter(Organization))
