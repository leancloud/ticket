import React, { Component } from 'react'
import { Button, Table } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'

import style from './index.css'
import { auth } from '../../lib/leancloud'
import { UserLabel } from '../UserLabel'
import UserForm from '../UserForm'

class SettingMembers extends Component {
  constructor(props) {
    super(props)
    this.state = {
      customerServiceRole: null,
      customerServices: [],
    }
  }

  componentDidMount() {
    return this.getRoleAndUsers('customerService').then((data) => {
      this.setState({
        customerServiceRole: data.role,
        customerServices: data.users,
      })
      return
    })
  }

  getRoleAndUsers(roleName) {
    return auth
      .queryRole()
      .where('name', '==', roleName)
      .first()
      .then((role) => {
        return role.getUsers().then((users) => {
          return { role, users }
        })
      })
  }

  handleSubmit(user) {
    const role = this.state.customerServiceRole
    return role
      .add(user)
      .then(() => {
        return this.getRoleAndUsers(role.get('name'))
      })
      .then((data) => {
        this.setState({
          customerServiceRole: data.role,
          customerServices: data.users,
        })
        return
      })
  }

  handleRemoveCustomerService(id) {
    const role = this.state.customerServiceRole
    return role
      .remove(auth.user(id))
      .then(() => {
        return this.getRoleAndUsers(role.get('name'))
      })
      .then((data) => {
        this.setState({
          customerServiceRole: data.role,
          customerServices: data.users,
        })
        return
      })
  }

  render() {
    const { t } = this.props
    const customerServices = this.state.customerServices.map((customerService) => {
      const categories = _.map(customerService.get('categories'), (category) => {
        return <span key={category.objectId}>{category.name} </span>
      })
      return (
        <tr key={customerService.id}>
          <td>
            <UserLabel user={customerService.toJSON()} />
          </td>
          <td>{categories}</td>
          <td>
            <Button
              variant="light"
              size="sm"
              onClick={() => this.handleRemoveCustomerService(customerService.id)}
            >
              {t('remove')}
            </Button>
          </td>
        </tr>
      )
    })
    return (
      <div>
        <UserForm addUser={this.handleSubmit.bind(this)} />
        <Table bordered className={`${style.memberTable} mt-2`} size="sm">
          <thead>
            <tr>
              <th>{t('user')}</th>
              <th>{t('assignedCategories')}</th>
              <th>{t('operation')}</th>
            </tr>
          </thead>
          <tbody>{customerServices}</tbody>
        </Table>
      </div>
    )
  }
}

SettingMembers.propTypes = {
  t: PropTypes.func.isRequired,
}

export default withTranslation()(SettingMembers)
