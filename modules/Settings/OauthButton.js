import React from 'react'
import { Form, Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'

export default function OauthButton({ currentUser, lcUserInfos, region, regionText }) {
  const { t } = useTranslation()
  const userInfo = _.find(lcUserInfos, { region })
  if (userInfo) {
    return (
      <Form.Group>
        <Button variant="light" disabled>
          {t('linkedPrefix')} LeanCloud {regionText} {t('region')} {userInfo.email} {t('account')}{' '}
          {t('linkedSuffix')}
        </Button>
      </Form.Group>
    )
  }

  return (
    <Form action="/oauth/login" method="post">
      <input type="hidden" name="sessionToken" value={currentUser.sessionToken} />
      <input type="hidden" name="region" value={region} />
      <Form.Group>
        <Button type="submit">
          LeanCloud {regionText} {t('region')}
        </Button>
      </Form.Group>
    </Form>
  )
}

OauthButton.propTypes = {
  currentUser: PropTypes.object,
  lcUserInfos: PropTypes.array,
  region: PropTypes.string.isRequired,
  regionText: PropTypes.string.isRequired,
}
