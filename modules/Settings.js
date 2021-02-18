import React from 'react'
import PropTypes from 'prop-types'
import { Link, Route, Switch, useRouteMatch } from 'react-router-dom'
import translate from './i18n/translate'

import Profile from './settings/Profile'
import Organization from './settings/Organization'
import Organizations from './settings/Organizations'
import OrganizationNew from './settings/OrganizationNew'
import Tags from './settings/Tags'
import Tag from './settings/Tag'
import SettingsCSProfile from './settings/CustomerServiceProfile'
import Members from './settings/Members'
import FAQs from './settings/FAQs'
import FAQ from './settings/FAQ'
import Categories from './settings/Categories'
import Category from './settings/Category'
import CategorySort from './settings/CategorySort'

function Settings(props) {
  const { path } = useRouteMatch()
  const { t } = props
  const childrenProps = {
    currentUser: props.currentUser,
    updateCurrentUser: props.updateCurrentUser,
    organizations: props.organizations,
    joinOrganization: props.joinOrganization,
    leaveOrganization: props.leaveOrganization,
  }

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
          <Switch>
            <Route path={`${path}/profile`}><Profile {...childrenProps} /></Route>
            <Route path={`${path}/organizations`} exact><Organizations {...childrenProps} /></Route>
            <Route path={`${path}/organizations/new`}><OrganizationNew {...childrenProps} /></Route>
            <Route path={`${path}/organizations/:id`}><Organization {...childrenProps} /></Route>
            <Route path={`${path}/tags`} exact><Tags {...childrenProps} /></Route>
            <Route path={`${path}/tags/:id`}><Tag {...childrenProps} /></Route>
            <Route path={`${path}/customerServiceProfile`}><SettingsCSProfile {...childrenProps} /></Route>
            <Route path={`${path}/members`}><Members {...childrenProps} /></Route>
            <Route path={`${path}/faqs`} exact><FAQs {...childrenProps} /></Route>
            <Route path={`${path}/faqs/:id`}><FAQ {...childrenProps} /></Route>
            <Route path={`${path}/categories`} exact><Categories {...childrenProps} /></Route>
            <Route path={`${path}/categories/:id`}><Category {...childrenProps} /></Route>
            <Route path={`${path}/categorySort`}><CategorySort {...childrenProps} /></Route>
          </Switch>
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
