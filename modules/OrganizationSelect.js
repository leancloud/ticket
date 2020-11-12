import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, ControlLabel} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'
import {getUserDisplayName} from './common'
import translate from './i18n/translate'

class OrganizationSelect extends React.Component {

  render() {
    const {t} = this.props
    return <FormGroup controlId='orgSelect'>
        <ControlLabel>{t('belong')}: </ControlLabel>
        <FormControl componentClass='select' value={this.props.selectedOrgId} onChange={this.props.onOrgChange}>
          {this.props.organizations.map(o => <option key={o.id} value={o.id}>{t('organization')}: {o.get('name')}</option>)}
          <option value=''>{t('individual')}: {getUserDisplayName(AV.User.current())}</option>
        </FormControl>
      </FormGroup>
  }
}
  
OrganizationSelect.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onOrgChange: PropTypes.func,
  t: PropTypes.func
}

export default translate(OrganizationSelect)