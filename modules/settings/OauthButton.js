import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Form, FormGroup, Button } from 'react-bootstrap'
import _ from 'lodash'

export default function OauthButton({ currentUser, lcUserInfos, region, regionText }) {
  const { t } = useTranslation()
  const userInfo = _.find(lcUserInfos, { region })
  if (userInfo) {
    return (
      <FormGroup>
        <Button disabled>{t('linkedPrefix')} LeanCloud {regionText} {t('region')} {userInfo.email} {t('account')} {t('linkedSuffix')}</Button>
      </FormGroup>
    )
  }

  return (
    <Form action='/oauth/login' method='post'>
      <input type='hidden' name='sessionToken' value={currentUser.sessionToken} />
      <input type='hidden' name='region' value={region} />
      <FormGroup>
        <Button type='submit' bsStyle='primary'>LeanCloud {regionText} {t('region')}</Button>
      </FormGroup>
    </Form>
  )
}

OauthButton.propTypes = {
  currentUser: PropTypes.object,
  lcUserInfos: PropTypes.array,
  region: PropTypes.string.isRequired,
  regionText: PropTypes.string.isRequired,
}
