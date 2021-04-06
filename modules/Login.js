/*global ORG_NAME, USE_OAUTH, LEANCLOUD_OAUTH_REGION*/
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { useHistory, useLocation } from 'react-router'
import PropTypes from 'prop-types'
import qs from 'query-string'
import { auth } from '../lib/leancloud'
import { isCN } from './common'
import css from './Login.css'
import { AppContext } from './context'

const KEY_PATHNAME = 'LeanTicket:nextPathname'

export default function Login({ onLogin }) {
  const { t } = useTranslation()
  const history = useHistory()
  const location = useLocation()
  const { addNotification } = useContext(AppContext)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const redirect = useCallback(() => {
    const nextPathname = sessionStorage.getItem(KEY_PATHNAME)
    if (nextPathname) {
      sessionStorage.removeItem(KEY_PATHNAME)
      history.replace(nextPathname)
    } else {
      history.replace('/')
    }
  }, [history])

  useEffect(() => {
    if (auth.currentUser) {
      history.push('/')
      return
    }
    const { token } = qs.parse(location.search)
    if (token) {
      ;(async () => {
        try {
          const user = await auth.loginWithSessionToken(token)
          onLogin(user)
          redirect()
        } catch (error) {
          addNotification(error)
        }
      })()
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const user = await auth.login(username, password)
      onLogin(user)
      redirect()
    } catch (error) {
      addNotification(error)
    }
  }

  const handleSignup = async () => {
    try {
      const user = await auth.signUp({
        username,
        password,
        name: username,
      })
      onLogin(user)
      redirect()
    } catch (error) {
      addNotification(error)
    }
  }

  if (!USE_OAUTH) {
    return (
      <div className={css.wrap}>
        <h1>{t('loginOrSignup')}</h1>
        <hr />
        <Form onSubmit={handleLogin}>
          <Form.Group>
            <Form.Label>{t('username')}</Form.Label>
            <Form.Control value={username} onChange={(e) => setUsername(e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t('password')}</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Button type="submit">{t('login')}</Button>{' '}
            <Button variant="light" onClick={handleSignup}>
              {t('signup')}
            </Button>
          </Form.Group>
        </Form>
      </div>
    )
  }
  return (
    <div className={css.wrap}>
      <h1>{t('welcome')}</h1>
      <hr />
      <p>
        {t('currentlyOnlySupports')} {ORG_NAME} OAuth {t('oauthAuthentication')}
      </p>
      <Form action="/oauth/login" method="post">
        <Form.Control type="hidden" name="region" value={LEANCLOUD_OAUTH_REGION} />
        <Form.Group>
          <Button type="submit">
            {t('goto')} {ORG_NAME} {t('oauthPage')}
          </Button>
        </Form.Group>
      </Form>
      {isCN() && (
        /* eslint-disable i18n/no-chinese-character */
        <div>
          <hr />
          <p>美味书签（北京）信息技术有限公司 版权所有</p>
          <div>
            <a href="https://beian.miit.gov.cn/" target="_blank">
              京ICP备12025059号-10
            </a>
          </div>
        </div>
        /* eslint-enable i18n/no-chinese-character */
      )}
    </div>
  )
}
Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
}
