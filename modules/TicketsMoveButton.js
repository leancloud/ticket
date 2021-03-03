import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { DropdownButton, MenuItem } from 'react-bootstrap'

export default function TicketsMoveButton({ organizations, selectedOrgId, onTicketsMove }) {
  const { t } = useTranslation()
  let items
  if (selectedOrgId == '') {
    items = organizations.map((org) => (
      <MenuItem key={org.id} onClick={() => onTicketsMove(org)}>
        {t('organization')} {org.data.name}
      </MenuItem>
    ))
  } else {
    items = _.reject(organizations, { id: selectedOrgId }).map((org) => (
      <MenuItem key={org.id} onClick={() => onTicketsMove(org)}>
        {t('organization')} {org.data.name}
      </MenuItem>
    ))
    items.push(
      <MenuItem key={'author'} onClick={() => onTicketsMove()}>
        {t('itsCreator')}
      </MenuItem>
    )
  }
  return (
    <DropdownButton title={t('moveTicketTo')} id="tickets-move">
      {items}
    </DropdownButton>
  )
}

TicketsMoveButton.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onTicketsMove: PropTypes.func,
}
