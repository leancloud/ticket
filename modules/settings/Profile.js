import React from 'react'
import {Form, FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'
import AV from 'leancloud-storage'

export default React.createClass({
  getInitialState() {
    return {
      wechatUsers: [],
      wechatUserId: AV.User.current().get('wechatEnterpriseUserId'),
    }
  },
  componentDidMount() {
    AV.Cloud.run('getWechatEnterpriseUsers', {})
    .then((wechatUsers) => {
      this.setState({wechatUsers})
    })
  },
  handleWechatIdChange(e) {
    this.setState({wechatUserId: e.target.value})
  },
  handleWechatIdSubmit(e) {
    e.preventDefault()
    AV.Cloud.run('saveWechatEnterpriseId', {userId: this.state.wechatUserId})
    .then(() => {
      AV.User.current().fetch()
    })
    .catch((err) => {
      alert(err.error)
    })
  },
  render() {
    const wechatUserOptions = this.state.wechatUsers.map((user) => {
      return <option value={user.userid}>{user.name}</option>
    })
    return <div>
      <Form inline onSubmit={this.handleWechatIdSubmit}>
        <FormGroup>
          <ControlLabel>微信企业号</ControlLabel>
          {' '}
          <FormControl componentClass="select" value={this.state.wechatUserId} onChange={this.handleWechatIdChange}>
            {wechatUserOptions}
          </FormControl>
          {' '}
        </FormGroup>
        <Button type="submit">关联</Button>
      </Form>
    </div>
  }
})
