import React from 'react'
import { Dropdown, DropdownButton } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'

export default function TicketsMoveButton({
  organizations,
  selectedOrgId,
  onTicketsMove,
  ...props
}) {
  const { t } = useTranslation()
  let items
  if (selectedOrgId == '') {
    items = organizations.map((org) => (
      <Dropdown.Item key={org.id} onClick={() => onTicketsMove(org)}>
        {t('organization')} {org.data.name}
      </Dropdown.Item>
    ))
  } else {
    items = _.reject(organizations, { id: selectedOrgId }).map((org) => (
      <Dropdown.Item key={org.id} onClick={() => onTicketsMove(org)}>
        {t('organization')} {org.data.name}
      </Dropdown.Item>
    ))
    items.push(
      <Dropdown.Item key={'author'} onClick={() => onTicketsMove()}>
        {t('itsCreator')}
      </Dropdown.Item>
    )
  }
  return (
    <DropdownButton {...props} title={t('moveTicketTo')} id="tickets-move" variant="light">
      {items}
    </DropdownButton>
  )
}

TicketsMoveButton.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onTicketsMove: PropTypes.func,
}
