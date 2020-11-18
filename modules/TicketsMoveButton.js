import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { DropdownButton, MenuItem } from 'react-bootstrap'
import translate from './i18n/translate'

const TicketsMoveButton = (props) => {
  const {t} = props
  let items
  if (props.selectedOrgId == '') {
    items = props.organizations.map(org => {
      return <MenuItem key={org.id} onClick={() => props.onTicketsMove(org)}>{t('organization')} {org.get('name')}</MenuItem>
    })
  } else {
    items = _.reject(props.organizations, {id: props.selectedOrgId}).map(org => {
      return <MenuItem key={org.id} onClick={() => props.onTicketsMove(org)}>{t('organization')} {org.get('name')}</MenuItem>
    })
    items.push(<MenuItem key={'author'} onClick={() => props.onTicketsMove()}>{t('itsCreator')}</MenuItem>)
  }
  return <DropdownButton title={t('moveTicketTo')} id='tickets-move'>
      {items}
    </DropdownButton>
}
  
TicketsMoveButton.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onTicketsMove: PropTypes.func,
  t: PropTypes.func
}

export default translate(TicketsMoveButton)