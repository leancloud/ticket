import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, ControlLabel} from 'react-bootstrap'
import {auth} from '../lib/leancloud'
import translate from './i18n/translate'
import {userDisplayName} from '../config.webapp'

class OrganizationSelect extends React.Component {

  render() {
    const {t} = this.props
    return (
      <FormGroup controlId='orgSelect'>
        <ControlLabel>{t('belong')}:&nbsp;</ControlLabel>
        <FormControl componentClass='select' value={this.props.selectedOrgId} onChange={this.props.onOrgChange}>
          {this.props.organizations.map(o => <option key={o.id} value={o.id}>{t('organization')}: {o.get('name')}</option>)}
          <option value=''>{t('individual')}: {userDisplayName(auth.currentUser().data)}</option>
        </FormControl>
      </FormGroup>
    )
  }
}

OrganizationSelect.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onOrgChange: PropTypes.func,
  t: PropTypes.func
}

export default translate(OrganizationSelect)
