import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import AV from 'leancloud-storage/live-query'
import {Avatar} from './common'
import css from './User.css'
import translate from './i18n/translate'

class User extends Component {

  constructor(props) {
    super(props)
    this.state = {
      user: null,
    }
  }

  componentDidMount() {
    this.refreshUserInfo(this.props)
  }

  componentWillReceiveProps(nextProps) {
    this.refreshUserInfo(nextProps)
  }

  refreshUserInfo(props) {
    const username = props.params.username
    return AV.Cloud.run('getUserInfo', {username})
    .then(user => {
      this.setState({user})
      return
    })
  }

  render() {
    const {t} = this.props
    if (!this.state.user) {
      return <div>{t('loading')}……</div>
    }

    return (
      <div>
        <div className={css.userWrap}>
          <div className={css.avatar}>
            <Avatar height="200" width="200" user={this.state.user} />
          </div>
          <div className={css.info}>
            <h2>{this.state.user.username}</h2>
            <p><Link to={`/customerService/tickets?authorId=${this.state.user.objectId}&page=0&size=10`}>{t('ticketList')}</Link></p>
          </div>
        </div>
      </div>
    )
  }
}

User.propTypes = {
  t: PropTypes.func
}

export default translate(User)