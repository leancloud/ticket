import React from 'react'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { FormControl, Form, Button } from 'react-bootstrap'
import { auth, cloud } from '../lib/leancloud'
class UserForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      username: '',
    }
  }

  handleNameChange(e) {
    this.setState({ username: e.target.value })
  }

  handleSubmit(t, e) {
    e.preventDefault()
    cloud
      .run('getUserInfo', { username: this.state.username })
      .then((user) => {
        if (!user) {
          throw new Error(`${t('userNotFound')} ${this.state.username}`)
        }
        return auth.user(user.objectId).get()
      })
      .then((user) => {
        this.props.addUser(user)
        this.setState({ username: '' })
        return
      })
      .catch(this.context.addNotification)
  }

  render() {
    const { t } = this.props
    return (
      <Form inline onSubmit={this.handleSubmit.bind(this, t)}>
        <FormControl
          type="text"
          value={this.state.username}
          onChange={this.handleNameChange.bind(this)}
          placeholder={t('username')}
        />{' '}
        <Button type="submit" bsStyle="primary">
          {t('submit')}
        </Button>
      </Form>
    )
  }
}

UserForm.propTypes = {
  addUser: PropTypes.func,
  t: PropTypes.func,
}
UserForm.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(UserForm)
