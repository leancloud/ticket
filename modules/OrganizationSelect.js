import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { FormGroup, FormControl, ControlLabel } from 'react-bootstrap'
import { auth } from '../lib/leancloud'
import { userDisplayName } from '../config.webapp'

export default function OrganizationSelect({ organizations, selectedOrgId, onOrgChange }) {
  const { t } = useTranslation()
  return (
    <FormGroup controlId="orgSelect">
      <ControlLabel>{t('belong')}:&nbsp;</ControlLabel>
      <FormControl componentClass="select" value={selectedOrgId} onChange={onOrgChange}>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {t('organization')}: {o.get('name')}
          </option>
        ))}
        <option value="">
          {t('individual')}: {userDisplayName(auth.currentUser.data)}
        </option>
      </FormControl>
    </FormGroup>
  )
}

OrganizationSelect.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onOrgChange: PropTypes.func,
}
