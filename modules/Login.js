/*global ORG_NAME, ENABLE_XD_OAUTH, USE_LC_OAUTH, LEANCLOUD_OAUTH_REGION*/
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { useHistory, useLocation } from 'react-router'
import qs from 'query-string'
import { auth, http } from '../lib/leancloud'
import { isCN } from './common'
import css from './Login.css'
import { AppContext } from './context'

const KEY_PATHNAME = 'LeanTicket:nextPathname'

export default function Login() {
  const { t } = useTranslation()
  const history = useHistory()
  const location = useLocation()
  const { addNotification, setCurrentUser } = useContext(AppContext)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState(false)

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
    const { token } = qs.parse(location.search)
    if (token) {
      ;(async () => {
        try {
          const user = await auth.loginWithSessionToken(token)
          setCurrentUser(user)
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
      const { sessionToken } = await http.post('/api/2/users', {
        type: 'password',
        username,
        password,
      })
      setCurrentUser(await auth.loginWithSessionToken(sessionToken))
      redirect()
    } catch (error) {
      addNotification(error)
    }
  }

  const handleResetPassword = async () => {
    try {
      if (!username) {
        addNotification({ message: t('resetPasswordEmptyEmail'), level: 'error' })
        return
      }
      await auth.requestPasswordReset(username)
      addNotification({ message: t('resetPasswordSent') })
    } catch (error) {
      addNotification(error)
    }
  }

  const staffOAuth = ENABLE_XD_OAUTH ? (
    <>
      <hr />
      <p>
        <a href="/auth/xd-cas">XD 员工账号登录</a>
      </p>
    </>
  ) : null

  if (!USE_LC_OAUTH) {
    return (
      <div className={css.wrap}>
        <h1 onDoubleClick={() => setPasswordLoginEnabled(true)}>{t('login')}</h1>
        {staffOAuth}
        {passwordLoginEnabled && (
          <>
            <hr />
            <Form onSubmit={handleLogin}>
              <Form.Group>
                <Form.Label>Email</Form.Label>
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
                <Button variant="light" onClick={handleResetPassword}>
                  {t('resetPassword')}
                </Button>
              </Form.Group>
            </Form>
          </>
        )}
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
      {staffOAuth}
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
