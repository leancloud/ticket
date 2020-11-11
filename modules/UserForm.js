import React from 'react'
import PropTypes from 'prop-types'
import {FormControl, Form, Button} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

class UserForm extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      username: ''
    }
  }
  
  handleNameChange(e) {
    this.setState({username: e.target.value})
  }
  
  handleSubmit(e) {
    e.preventDefault()
    AV.Cloud.run('getUserInfo', {username: this.state.username})
      .then(user => {
        if (!user) {
          throw new Error(`找不到用户名为 ${this.state.username} 的用户`)
        }
        return AV.Object.createWithoutData('_User', user.objectId).fetch()
      })
      .then(user => {
        this.props.addUser(user)
        this.setState({username: ''})
        return
      })
      .catch(this.context.addNotification)
  }
  
  render() {
    return <Form inline onSubmit={this.handleSubmit.bind(this)}>
        <FormControl type='text' value={this.state.username} onChange={this.handleNameChange.bind(this)} placeholder='用户名' />
        {' '}
        <Button type='submit' bsStyle='primary'>添加</Button>
      </Form>
  }
}

UserForm.propTypes = {
  addUser: PropTypes.func,
}
UserForm.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default UserForm
  