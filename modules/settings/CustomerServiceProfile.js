import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, ControlLabel, FormControl, Button, Checkbox, Table} from 'react-bootstrap'
import moment from 'moment'
import DatePicker from 'react-datepicker'
import AV from 'leancloud-storage/live-query'

import {getCustomerServices, getUserDisplayName} from '../common'

export default class CustomerServiceProfile extends Component {

  constructor(props) {
    super(props)
    this.state = {
      wechatUsers: [],
      wechatUserId: AV.User.current().get('wechatEnterpriseUserId'),
      bearychatUrl: AV.User.current().get('bearychatUrl'),
    }
  }

  componentDidMount() {
    AV.Cloud.run('getWechatEnterpriseUsers', {})
    .then((wechatUsers) => {
      this.setState({wechatUsers})
      return
    })
    .catch(this.context.addNotification)
  }

  handleWechatIdChange(e) {
    this.setState({wechatUserId: e.target.value})
  }

  handleBearychatUrlChange(e) {
    this.setState({bearychatUrl: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    const currentUser = AV.User.current()
    currentUser.set('wechatEnterpriseUserId', this.state.wechatUserId)
    currentUser.set('bearychatUrl', this.state.bearychatUrl)
    currentUser.save()
    .catch(this.context.addNotification)
  }

  render() {
    const wechatUserOptions = this.state.wechatUsers.map((user) => {
      return <option key={user.userid} value={user.userid}>{user.name}</option>
    })
    return <div>
      <h2>账号关联</h2>
      <Form>
        <FormGroup>
          <ControlLabel>微信企业号</ControlLabel>
          <FormControl componentClass="select" value={this.state.wechatUserId} onChange={this.handleWechatIdChange.bind(this)}>
            <option key='undefined' value=''>未关联</option>
            {wechatUserOptions}
          </FormControl>
        </FormGroup>
        <FormGroup>
          <ControlLabel>Bearychat 提醒 Hook URL</ControlLabel>
          <FormControl type='text' value={this.state.bearychatUrl} onChange={this.handleBearychatUrlChange.bind(this)} />
        </FormGroup>
        <Button type='button' onClick={this.handleSubmit.bind(this)}>保存</Button>
      </Form>
      <Vacation />
    </div>
  }

}

CustomerServiceProfile.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

class Vacation extends React.Component {

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
    const userOptions = this.state.users.map(user => {
      return <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>
    })

    const vacationTrs = this.state.vacations.map(vacation => {
      const startDate = moment(vacation.get('startDate'))
      const endDate = moment(vacation.get('endDate'))
      return <tr key={vacation.id}>
        <td>{getUserDisplayName(vacation.get('vacationer'))}</td>
        <td>{startDate.format('YYYY-MM-DD') + (startDate.hours() === 12 ? ' 下午' : '')}</td>
        <td>{endDate.format('YYYY-MM-DD') + (endDate.hours() === 12 ? ' 下午' : '')}</td>
        <td>{getUserDisplayName(vacation.get('operator'))}</td>
        <td>{moment(vacation.createdAt).fromNow()}</td>
        <td><Button type='button' onClick={() => this.handleRemove(vacation)}>删除</Button></td>
      </tr>
    })
    return (
      <div>
        <h2>请假</h2>
        <Form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup>
            <ControlLabel>请假人</ControlLabel>
            {' '}
            <FormControl componentClass="select" value={this.state.vacationerId} onChange={this.handleVacationUserChange.bind(this)}>
              {userOptions}
            </FormControl>
          </FormGroup>
          <FormGroup>
            <ControlLabel>请假开始</ControlLabel>
            {' '}
            <DatePicker
                selected={this.state.startDate}
                selectsStart
                startDate={this.state.startDate}
                endDate={this.state.endDate}
                onChange={this.handleChangeStart.bind(this)}
            />
            {' '}
            <Checkbox inline onClick={this.handleStartHalfDayClick.bind(this)}>下午</Checkbox>
          </FormGroup>
          {' '}
          <FormGroup>
            <ControlLabel>工作开始</ControlLabel>
            {' '}
            <DatePicker
                selected={this.state.endDate}
                selectsEnd
                startDate={this.state.startDate}
                endDate={this.state.endDate}
                onChange={this.handleChangeEnd.bind(this)}
            />
            {' '}
            <Checkbox inline onClick={this.handleEndHalfDayClick.bind(this)}>下午</Checkbox>
          </FormGroup>
          <Button type='submit'>请假</Button>
        </Form>
        <Table>
          <thead>
            <tr>
              <th>请假人</th>
              <th>开始请假</th>
              <th>开始上班</th>
              <th>提交人</th>
              <th>提交时间</th>
              <th>操作</th>
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
  addNotification: PropTypes.func.isRequired
}

