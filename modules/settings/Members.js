import React, { Component, PropTypes } from 'react'
import _ from 'lodash'
import AV from 'leancloud-storage/live-query'

const {UserLabel} = require('../common')
import UserForm from './UserForm'
import translate from '../i18n/translate'

class SettingMembers extends Component {

  constructor(props) {
    super(props)
    this.state = {
      customerServiceRole: null,
      customerServices: [],
    }
  }

  componentDidMount() {
    this.getRoleAndUsers('customerService')
    .then((data) => {
      this.setState({
        customerServiceRole: data.role,
        customerServices: data.users,
      })
    })
  }

  getRoleAndUsers(role) {
    return new AV.Query(AV.Role)
    .equalTo('name', role)
    .first()
    .then((role) => {
      return role.getUsers().query().find()
      .then((users) => {
        return { role, users }
      })
    })
  }

  handleSubmit(user) {
    const role = this.state.customerServiceRole
    role.getUsers().add(user)
    return role.save()
    .then((role) => {
      return this.getRoleAndUsers(role.get('name'))
    }).then((data) => {
      this.setState({
        customerServiceRole: data.role,
        customerServices: data.users,
      })
      return
    })
  }

  handleRemoveCustomerService(id) {
    this.state.customerServiceRole.getUsers().remove(AV.Object.createWithoutData('_User', id))
    this.state.customerServiceRole.save()
    .then((role) => {
      return this.getRoleAndUsers(role.get('name'))
    }).then((data) => {
      this.setState({
        customerServiceRole: data.role,
        customerServices: data.users,
      })
    })
  }

  render() {
    const {t} = this.props
    const customerServices = this.state.customerServices.map((customerService) => {
      const categories = _.map(customerService.get('categories'), (category) => {
        return <span key={category.objectId}>{category.name} </span>
      })
      return (
        <tr key={customerService.id}>
          <td>
            <UserLabel user={customerService} />
          </td>
          <td>
            {categories}
          </td>
          <td>
            <input type='button' className='btn btn-default' value={t('remove')} onClick={() => this.handleRemoveCustomerService(customerService.id)} />
          </td>
        </tr>
      )
    })
    return (
      <div>
        <UserForm addUser={this.handleSubmit.bind(this)}/>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>{t('username')}</th>
              <th>{t('assignedCategories')}</th>
              <th>{t('operation')}</th>
            </tr>
          </thead>
          <tbody>
            {customerServices}
          </tbody>
        </table>
      </div>
    )
  }
}

SettingMembers.propTypes = {
  t: PropTypes.func
}

export default translate(SettingMembers)
