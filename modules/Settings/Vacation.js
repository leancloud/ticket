import React, { Component } from 'react'
import { Button, Form, Table } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import moment from 'moment'

import { auth, db } from '../../lib/leancloud'
import { getCustomerServices } from '../common'
import { UserLabel } from '../UserLabel'
import { getUserDisplayName } from '../../lib/common'

class Vacation extends Component {
  constructor(props) {
    super(props)
    this.state = {
      users: [],
      vacations: [],
      vacationerId: auth.currentUser.id,
      startDate: moment().startOf('day'),
      isStartHalfDay: false,
      endDate: moment().add(1, 'days').startOf('day'),
      isEndHalfDay: false,
    }
  }

  componentDidMount() {
    return Promise.all([
      getCustomerServices(),
      db
        .class('Vacation')
        .where([
          {
            operator: auth.currentUser,
          },
          {
            vacationer: auth.currentUser,
          },
        ])
        .include('vacationer', 'operator')
        .orderBy('createdAt', 'desc')
        .find(),
    ]).then(([users, vacations]) => {
      this.setState({ users, vacations })
      return
    })
  }

  handleVacationUserChange(e) {
    this.setState({ vacationerId: e.target.value })
  }

  handleChangeStart(startDate) {
    this.setState({ startDate })
  }

  handleStartHalfDayClick(e) {
    this.setState({ isStartHalfDay: e.target.checked })
  }

  handleChangeEnd(endDate) {
    this.setState({ endDate })
  }

  handleEndHalfDayClick(e) {
    this.setState({ isEndHalfDay: e.target.checked })
  }

  handleSubmit(e) {
    e.preventDefault()
    return db
      .class('Vacation')
      .add({
        vacationer: db.class('_User').object(this.state.vacationerId),
        startDate: this.state.startDate.add(this.state.isStartHalfDay ? 12 : 0, 'hours').toDate(),
        endDate: this.state.endDate.add(this.state.isEndHalfDay ? 12 : 0, 'hours').toDate(),
      })
      .then((vacation) => {
        return vacation.get({ include: ['vacationer', 'operator'] })
      })
      .then((vacation) => {
        const vacations = this.state.vacations
        vacations.unshift(vacation)
        this.setState({ vacations })
        return
      })
  }

  handleRemove(vacation) {
    return vacation.delete().then(() => {
      this.setState({ vacations: this.state.vacations.filter((v) => v.id !== vacation.id) })
      return
    })
  }

  render() {
    const { t } = this.props
    const userOptions = this.state.users.map((user) => {
      return (
        <option key={user.id} value={user.id}>
          {getUserDisplayName(user)}
        </option>
      )
    })

    const vacationTrs = this.state.vacations.map((vacation) => {
      const startDate = moment(vacation.get('startDate'))
      const endDate = moment(vacation.get('endDate'))
      return (
        <tr key={vacation.id}>
          <td>
            <UserLabel user={vacation.data.vacationer.data} simple />
          </td>
          <td>{startDate.format('YYYY-MM-DD') + (startDate.hours() === 12 ? t('pm') : '')}</td>
          <td>{endDate.format('YYYY-MM-DD') + (endDate.hours() === 12 ? t('pm') : '')}</td>
          <td>
            <UserLabel user={vacation.data.operator.data} simple />
          </td>
          <td>{moment(vacation.createdAt).fromNow()}</td>
          <td>
            <Button variant="light" size="sm" onClick={() => this.handleRemove(vacation)}>
              {t('delete')}
            </Button>
          </td>
        </tr>
      )
    })
    return (
      <div>
        <h2>{t('vacation')}</h2>
        <Form onSubmit={this.handleSubmit.bind(this)}>
          <Form.Group>
            <Form.Label>{t('username')}</Form.Label>
            <Form.Control
              as="select"
              value={this.state.vacationerId}
              onChange={this.handleVacationUserChange.bind(this)}
            >
              {userOptions}
            </Form.Control>
          </Form.Group>
          <Form.Group>
            <Form.Label>{t('vacationStart')}</Form.Label>{' '}
            {/* <DatePicker
              selected={this.state.startDate}
              selectsStart
              startDate={this.state.startDate}
              endDate={this.state.endDate}
              onChange={this.handleChangeStart.bind(this)}
            /> */}{' '}
            <Form.Check inline label={t('pm')} onClick={this.handleStartHalfDayClick.bind(this)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t('backToWork')}</Form.Label>{' '}
            {/* <DatePicker
              selected={this.state.endDate}
              selectsEnd
              startDate={this.state.startDate}
              endDate={this.state.endDate}
              onChange={this.handleChangeEnd.bind(this)}
            /> */}{' '}
            <Form.Check inline label={t('pm')} onClick={this.handleEndHalfDayClick.bind(this)} />
          </Form.Group>
          <Button type="submit" variant="light">
            {t('submit')}
          </Button>
        </Form>
        <Table className="mt-2">
          <thead>
            <tr>
              <th>{t('username')}</th>
              <th>{t('vacationStart')}</th>
              <th>{t('backToWork')}</th>
              <th>{t('submitter')}</th>
              <th>{t('submitTime')}</th>
              <th>{t('operation')}</th>
            </tr>
          </thead>
          <tbody>{vacationTrs}</tbody>
        </Table>
      </div>
    )
  }
}

Vacation.propTypes = {
  t: PropTypes.func.isRequired,
}

export default withTranslation()(Vacation)
