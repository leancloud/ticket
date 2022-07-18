import React from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { auth } from '../lib/leancloud'
import { getUserDisplayName } from '../lib/common'

export default function OrganizationSelect({ organizations, selectedOrgId, onOrgChange, size }) {
  const { t } = useTranslation()
  return (
    <Form.Group controlId="orgSelect">
      <Form.Label>{t('belong')}:&nbsp;</Form.Label>
      <Form.Control as="select" value={selectedOrgId} onChange={onOrgChange} size={size}>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {t('organization')}: {o.get('name')}
          </option>
        ))}
        <option value="">
          {t('individual')}: {getUserDisplayName(auth.currentUser)}
        </option>
      </Form.Control>
    </Form.Group>
  )
}

OrganizationSelect.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onOrgChange: PropTypes.func,
  size: PropTypes.string,
}
