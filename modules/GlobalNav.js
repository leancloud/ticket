import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Link, withRouter } from 'react-router-dom'
import translate from './i18n/translate'

class GlobalNav extends Component {
  handleNewTicketClick() {
    this.props.history.push('/tickets/new')
  }

  handleLanguageSwitch(lang) {
    const currentLocale = window.localStorage.getItem('locale')
    if (currentLocale !== lang) {
      window.localStorage.setItem('locale', lang)
      window.location.reload(false)
    }
  }

  render() {
    const {t} = this.props
    /* eslint-disable i18n/no-chinese-character */
    const langSelector = (
        <li className="dropdown">
          <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">EN/中 <span className="caret"/></a>
          <ul className="dropdown-menu">
            <li><a href="#" onClick={() => this.handleLanguageSwitch('en')}>English</a></li>
            <li><a href="#" onClick={() => this.handleLanguageSwitch('zh')}>中文</a></li>
          </ul>
        </li>
    )
    /* eslint-enable i18n/no-chinese-character */
    let user
    if (this.props.currentUser) {
      user = (
        <li className="dropdown">
          <a
            href="#"
            className="dropdown-toggle"
            data-toggle="dropdown"
            role="button"
            aria-haspopup="true"
            aria-expanded="false"
          >
            {this.props.currentUser.get('name')} <span className="caret"></span>
          </a>
          <ul className="dropdown-menu">
            <li><Link to="/settings">{t('settings')}</Link></li>
            <li><a href="#" onClick={() => this.props.logout()}>{t('logout')}</a></li>
          </ul>
        </li>
      )
    } else {
      user = <li><Link to="/login">{t('login')}</Link></li>
    }

    return (
      <nav className="navbar navbar-default navbar-fixed-top">
        <div className="container">
          <div className="navbar-header">
            <button
              type="button"
              className="navbar-toggle collapsed"
              data-toggle="collapse"
              data-target="#global-navbar-collapse"
              aria-expanded="false"
            >
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <Link className="navbar-brand font-logo" to="/">
              LeanTicket
            </Link>
          </div>
          <div className="collapse navbar-collapse" id="global-navbar-collapse">
            <ul className="nav navbar-nav">
              <li><Link to="/tickets">{t('ticketList')}</Link></li>
              <li><Link to="/about">{t('about')}</Link></li>
            </ul>
            {this.props.isCustomerService &&
              <ul className="nav navbar-nav">
                <li><Link to="/customerService/tickets">{t('customerServiceTickets')}</Link></li>
                <li><Link to="/customerService/stats">{t('statistics')}</Link></li>
              </ul>
            }
            <ul className="nav navbar-nav navbar-right">
              {this.props.currentUser && (
                <li>
                  <button
                    type="submit"
                    className="btn btn-success navbar-btn nav-submit-btn"
                    onClick={this.handleNewTicketClick.bind(this)}
                  >
                    {t('newTicket')}
                  </button>
                </li>
              )}
              {this.props.isCustomerService &&
                <li>
                  <Link to='/notifications'><span className='glyphicon glyphicon-bell' aria-hidden='true'></span></Link>
                </li>
              }
              {langSelector}
              {user}
            </ul>
          </div>
        </div>
      </nav>
    )
  }
}

GlobalNav.propTypes = {
  currentUser: PropTypes.object,
  isCustomerService: PropTypes.bool,
  logout: PropTypes.func.isRequired,
  t: PropTypes.func,
  history: PropTypes.object.isRequired,
}

export default withRouter(translate(GlobalNav))
