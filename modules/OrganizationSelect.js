import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, ControlLabel} from 'react-bootstrap'
import {auth} from '../lib/leancloud'
import translate from './i18n/translate'
import {getUserDisplayName} from '../lib/common'

class OrganizationSelect extends React.Component {

  render() {
    const {t} = this.props
    return <FormGroup controlId='orgSelect'>
        <ControlLabel>{t('belong')}: </ControlLabel>
        <FormControl componentClass='select' value={this.props.selectedOrgId} onChange={this.props.onOrgChange}>
          {this.props.organizations.map(o => <option key={o.id} value={o.id}>{t('organization')}: {o.get('name')}</option>)}
          <option value=''>{t('individual')}: {getUserDisplayName(auth.currentUser())}</option>
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