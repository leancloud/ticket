import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, ControlLabel, FormControl, Button, Checkbox, Table} from 'react-bootstrap'
import moment from 'moment'
import DatePicker from 'react-datepicker'
import AV from 'leancloud-storage/live-query'

import {getCustomerServices, getUserDisplayName} from '../common'
import translate from '../i18n/translate'

class Vacation extends Component {

  constructor(props) {
    super(props)
    this.state = {
      users: [],
      vacations: [],
      vacationerId: AV.User.current().id,
      startDate: moment().startOf('day'),
      isStartHalfDay: false,
      endDate: moment().add(1, 'days').startOf('day'),
      isEndHalfDay: false,
    }
  }
  
  componentDidMount() {
    Promise.all([
      getCustomerServices(),
      AV.Query.or(
          new AV.Query('Vacation').equalTo('operator', AV.User.current()),
          new AV.Query('Vacation').equalTo('vacationer', AV.User.current())
        )
        .include('vacationer')
        .include('operator')
        .descending('createdAt')
        .find(),
    ])
      .then(([users, vacations]) => {
        this.setState({users, vacations})
      })
  }
  
  handleVacationUserChange(e) {
    this.setState({vacationerId: e.target.value})
  }
  
  handleChangeStart(startDate) {
    this.setState({startDate})
  }
  
  handleStartHalfDayClick(e) {
    this.setState({isStartHalfDay: e.target.checked})
  }
  
  handleChangeEnd(endDate) {
    this.setState({endDate})
  }
  
  handleEndHalfDayClick(e) {
    this.setState({isEndHalfDay: e.target.checked})
  }
  
  handleSubmit(e) {
    e.preventDefault()
    return new AV.Object('Vacation')
      .save({
        vacationer: AV.Object.createWithoutData('_User', this.state.vacationerId),
        startDate: this.state.startDate.add(this.state.isStartHalfDay ? 12 : 0, 'hours').toDate(),
        endDate: this.state.endDate.add(this.state.isEndHalfDay ? 12 : 0, 'hours').toDate(),
      })
      .then(vacation => {
        return vacation.fetch({include: 'vacationer,operator'})
      })
      .then(vacation => {
        const vacations = this.state.vacations
        vacations.unshift(vacation)
        this.setState({vacations})
      })
  }
  
  handleRemove(vacation) {
    vacation.destroy()
      .then(() => {
        this.setState({vacations: this.state.vacations.filter(v => v.id !== vacation.id)})
      })
  }
  
  render() {
    const {t} = this.props
    const userOptions = this.state.users.map(user => {
      return <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>
    })
  
    const vacationTrs = this.state.vacations.map(vacation => {
      const startDate = moment(vacation.get('startDate'))
      const endDate = moment(vacation.get('endDate'))
      return <tr key={vacation.id}>
          <td>{getUserDisplayName(vacation.get('vacationer'))}</td>
          <td>{startDate.format('YYYY-MM-DD') + (startDate.hours() === 12 ? t('pm') : '')}</td>
          <td>{endDate.format('YYYY-MM-DD') + (endDate.hours() === 12 ? t('pm') : '')}</td>
          <td>{getUserDisplayName(vacation.get('operator'))}</td>
          <td>{moment(vacation.createdAt).fromNow()}</td>
          <td><Button type='button' onClick={() => this.handleRemove(vacation)}>{t('delete')}</Button></td>
        </tr>
    })
    return (
        <div>
          <h2>{t('vacation')}</h2>
          <Form onSubmit={this.handleSubmit.bind(this)}>
            <FormGroup>
              <ControlLabel>{t('username')}</ControlLabel>
              {' '}
              <FormControl componentClass="select" value={this.state.vacationerId} onChange={this.handleVacationUserChange.bind(this)}>
                {userOptions}
              </FormControl>
            </FormGroup>
            <FormGroup>
              <ControlLabel>{t('vacationStart')}</ControlLabel>
              {' '}
              <DatePicker
                  selected={this.state.startDate}
                  selectsStart
                  startDate={this.state.startDate}
                  endDate={this.state.endDate}
                  onChange={this.handleChangeStart.bind(this)}
              />
              {' '}
              <Checkbox inline onClick={this.handleStartHalfDayClick.bind(this)}>{t('pm')}</Checkbox>
            </FormGroup>
            {' '}
            <FormGroup>
              <ControlLabel>{t('backToWork')}</ControlLabel>
              {' '}
              <DatePicker
                  selected={this.state.endDate}
                  selectsEnd
                  startDate={this.state.startDate}
                  endDate={this.state.endDate}
                  onChange={this.handleChangeEnd.bind(this)}
              />
              {' '}
              <Checkbox inline onClick={this.handleEndHalfDayClick.bind(this)}>{t('pm')}</Checkbox>
            </FormGroup>
            <Button type='submit'>{t('submit')}</Button>
          </Form>
          <Table>
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
            <tbody>
              {vacationTrs}
            </tbody>
          </Table>
        </div>
    )
  }
}
  
Vacation.propTypes = {
  addNotification: PropTypes.func.isRequired,
  t: PropTypes.func
}

export default translate(Vacation)



