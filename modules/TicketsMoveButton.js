import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { DropdownButton, MenuItem } from 'react-bootstrap'


const TicketsMoveButton = (props) => {
  let items
  if (props.selectedOrgId == '') {
    items = props.organizations.map(org => {
      return <MenuItem key={org.id} onClick={() => props.onTicketsMove(org)}>组织：{org.get('name')}</MenuItem>
    })
  } else {
    items = _.reject(props.organizations, {id: props.selectedOrgId}).map(org => {
      return <MenuItem key={org.id} onClick={() => props.onTicketsMove(org)}>组织：{org.get('name')}</MenuItem>
    })
    items.push(<MenuItem key={'author'} onClick={() => props.onTicketsMove()}>创建者名下</MenuItem>)
  }
  return <DropdownButton title='工单转移到' id='tickets-move'>
      {items}
    </DropdownButton>
}
  
TicketsMoveButton.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onTicketsMove: PropTypes.func,
}

export default TicketsMoveButton