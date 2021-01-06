import React from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, Button} from 'react-bootstrap'
import _ from 'lodash'

import translate from '../i18n/translate'

const OauthButton = (props) => {
  const {t} = props
  const userInfo = _.find(props.lcUserInfos, {region: props.region})
  if (userInfo) {
    return (
      <FormGroup>
        <Button disabled>{t('linkedPrefix')} LeanCloud {props.regionText} {t('region')} {userInfo.email} {t('account')} {t('linkedSuffix')}</Button>
      </FormGroup>
    )
  }

  return (
    <Form action='/oauth/login' method='post'>
      <input type='hidden' name='sessionToken' value={props.currentUser._sessionToken} />
      <input type='hidden' name='region' value={props.region} />
      <FormGroup>
        <Button type='submit' bsStyle='primary'>LeanCloud {props.regionText} {t('region')}</Button>
      </FormGroup>
    </Form>
  )
}

OauthButton.propTypes = {
  currentUser: PropTypes.object,
  lcUserInfos: PropTypes.array,
  region: PropTypes.string.isRequired,
  regionText: PropTypes.string.isRequired,
  t: PropTypes.func
}

export default translate(OauthButton)