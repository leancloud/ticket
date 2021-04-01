import React from 'react'
import { Button, Form, InputGroup } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { db, cloud } from '../lib/leancloud'
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
        return db.class('_User').object(user.objectId).get()
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
        <InputGroup>
          <Form.Control
            value={this.state.username}
            onChange={this.handleNameChange.bind(this)}
            placeholder={t('username')}
          />
          <InputGroup.Append>
            <Button type="submit">{t('submit')}</Button>
          </InputGroup.Append>
        </InputGroup>
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
