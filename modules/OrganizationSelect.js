import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, ControlLabel} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

class OrganizationSelect extends React.Component {

  render() {
    return <FormGroup controlId='orgSelect'>
        <ControlLabel>所属：</ControlLabel>
        <FormControl componentClass='select' value={this.props.selectedOrgId} onChange={this.props.onOrgChange}>
          {this.props.organizations.map(o => <option key={o.id} value={o.id}>组织：{o.get('name')}</option>)}
          <option value=''>个人：{exports.getUserDisplayName(AV.User.current())}</option>
        </FormControl>
      </FormGroup>
  }
}
  
OrganizationSelect.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onOrgChange: PropTypes.func,
}

export default OrganizationSelect