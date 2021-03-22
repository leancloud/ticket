import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useHistory } from 'react-router-dom'
import i18next from 'i18next'
import PropTypes from 'prop-types'

import { getUserDisplayName } from '../lib/common'
import { getConfig } from './config'
import { AppContext } from './context'

function LanguageSelector({ onChange }) {
  /* eslint-disable i18n/no-chinese-character */
  return (
    <li className="dropdown">
      <a
        className="dropdown-toggle"
        data-toggle="dropdown"
        role="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        EN/中 <span className="caret" />
      </a>
      <ul className="dropdown-menu">
        <li>
          <a onClick={() => onChange('en')}>English</a>
        </li>
        <li>
          <a onClick={() => onChange('zh')}>中文</a>
        </li>
      </ul>
    </li>
  )
  /* eslint-enable i18n/no-chinese-character */
}
LanguageSelector.propTypes = {
  onChange: PropTypes.func.isRequired,
}

function UserDropdown({ user, onLogout }) {
  const { t } = useTranslation()

  if (!user) {
    return (
      <li>
        <Link to="/login">{t('login')}</Link>
      </li>
    )
  }
  return (
    <li className="dropdown">
      <a
        className="dropdown-toggle"
        data-toggle="dropdown"
        role="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        {getUserDisplayName(user)} <span className="caret"></span>
      </a>
      <ul className="dropdown-menu">
        <li>
          <Link to="/settings">{t('settings')}</Link>
        </li>
        <li>
          <a onClick={onLogout}>{t('logout')}</a>
        </li>
      </ul>
    </li>
  )
}
UserDropdown.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
}

export default function GlobalNav({ user, onLogout }) {
  const { t } = useTranslation()
  const history = useHistory()
  const { isCustomerService } = useContext(AppContext)

  const handleChangeLanguage = (lang) => {
    i18next.changeLanguage(lang)
    localStorage.setItem('locale', lang)
  }

  let links = [
    {
      name: 'tickets',
      href: '/tickets',
      title: t('ticketList'),
      priority: 100,
    },
    {
      name: 'about',
      href: '/about',
      title: t('about'),
      priority: 90,
    },
    {
      name: 'customerServiceTickets',
      href: '/customerService/tickets?assignee=me&isOpen=true',
      title: t('customerServiceTickets'),
      priority: 80,
      customerServiceOnly: true,
    },
    {
      name: 'stats',
      href: '/customerService/stats',
      title: t('statistics'),
      priority: 70,
      customerServiceOnly: true,
    },
  ]
  if (!isCustomerService) {
    links = links.filter((link) => !link.customerServiceOnly)
  }
  links.forEach((link) => {
    if (link.priority === undefined) {
      link.priority = getConfig(`nav.${link.name}.priority`, 0)
    }
    link.href = getConfig(`nav.${link.name}.href`, link.href)
  })
  links.sort((link1, link2) => link2.priority - link1.priority)

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
            {links.map(({ name, href, title }) => (
              <li key={name}>
                <Link to={href}>{title}</Link>
              </li>
            ))}
          </ul>

          <ul className="nav navbar-nav navbar-right">
            {user && (
              <li>
                <button
                  className="btn btn-success navbar-btn nav-submit-btn"
                  onClick={() => history.push('/tickets/new')}
                >
                  {t('newTicket')}
                </button>
              </li>
            )}
            {isCustomerService && (
              <li>
                <Link to="/notifications">
                  <span className="glyphicon glyphicon-bell" aria-hidden="true"></span>
                </Link>
              </li>
            )}

            <LanguageSelector onChange={handleChangeLanguage} />
            <UserDropdown user={user} onLogout={onLogout} />
          </ul>
        </div>
      </div>
    </nav>
  )
}
GlobalNav.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
}
