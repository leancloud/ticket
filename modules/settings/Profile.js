import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'

import {Avatar} from '../common'

export default class Profile extends Component {

  constructor(props) {
    super(props)
    this.state = {
      name: this.props.currentUser.get('name'),
      email: this.props.currentUser.get('email'),
    }
  }

  componentDidMount() {
  }

  handleNameChange(e) {
    this.setState({name: e.target.value})
  }

  handleEmailChange(e) {
    this.setState({email: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    return this.props.updateCurrentUser(this.state)
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  render() {
    return <div>
      <div className="row">
        <div className="col-md-8">
          <Form>
            <FormGroup>
              <ControlLabel>用户名</ControlLabel>
              <FormControl type="text" value={this.props.currentUser.get('username')} disabled='true' />
            </FormGroup>
            <FormGroup>
              <ControlLabel>昵称</ControlLabel>
              <FormControl type="text" value={this.state.name} onChange={this.handleNameChange.bind(this)} />
            </FormGroup>
            <FormGroup>
              <ControlLabel>电子邮箱</ControlLabel>
              <FormControl type="text" value={this.state.email} onChange={this.handleEmailChange.bind(this)} />
            </FormGroup>
            <Button type='button' onClick={this.handleSubmit.bind(this)}>保存</Button>
          </Form>
        </div>
        <div className="col-md-4">
          <Form>
            <FormGroup>
              <ControlLabel>头像</ControlLabel>
            </FormGroup>
            <Avatar height="200" width="200" user={this.props.currentUser} />
            <div>
              <span>更改头像请前往 <a href='https://cn.gravatar.com/' target='_blank'>Gravatar</a></span>
            </div>
          </Form>
        </div>
      </div>
    </div>
  }

}

Profile.propTypes = {
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
}

Profile.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}
