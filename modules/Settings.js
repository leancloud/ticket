import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import translate from './i18n/translate'

function Settings(props) {
  const {t} = props
  return (
    <div>
      <div className="row">
        <div className="col-md-3">
          <div className="panel panel-default">
            <div className="panel-heading">{t('settings')}</div>
            <ul className="list-group">
              <li className="list-group-item"><Link to='/settings/profile'>{t('personalSettings')}</Link></li>
              <li className="list-group-item"><Link to='/settings/organizations'>{t('organizationSettings')}</Link></li>
            </ul>
          </div>
          {props.isCustomerService &&
            <div className="panel panel-default">
              <div className="panel-heading">{t('staffSettings')}</div>
              <ul className="list-group">
                <li className="list-group-item"><Link to='/settings/customerServiceProfile'>{t('personalSettings')}</Link></li>
                <li className="list-group-item"><Link to='/settings/members'>{t('member')}</Link></li>
                <li className="list-group-item"><Link to='/settings/categories'>{t('category')}</Link></li>
                <li className="list-group-item"><Link to='/settings/tags'>{t('tag')}</Link></li>
                <li className="list-group-item"><Link to='/settings/faqs'>{t('FAQ')}</Link></li>
              </ul>
            </div>
          }
        </div> 
        <div className="col-md-9">
          {props.children && React.cloneElement(props.children, {
            currentUser: props.currentUser,
            updateCurrentUser: props.updateCurrentUser,
            organizations: props.organizations,
            joinOrganization: props.joinOrganization,
            leaveOrganization: props.leaveOrganization,
          })}
        </div>
      </div>
    </div>
  )
}

Settings.propTypes = {
  children: PropTypes.object,
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
  isCustomerService: PropTypes.bool,
  organizations: PropTypes.array,
  joinOrganization: PropTypes.func,
  leaveOrganization: PropTypes.func,
  t: PropTypes.func
}

export default translate(Settings)