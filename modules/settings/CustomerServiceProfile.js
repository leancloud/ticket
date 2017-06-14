import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

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
    })
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
    .catch(this.props.addNotification)
  }

  render() {
    const wechatUserOptions = this.state.wechatUsers.map((user) => {
      return <option key={user.userid} value={user.userid}>{user.name}</option>
    })
    return <div>
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
    </div>
  }

}

CustomerServiceProfile.propTypes = {
  addNotification: PropTypes.func.isRequired,
}
