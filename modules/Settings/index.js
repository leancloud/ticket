import React from 'react'
import { Card, Col, ListGroup, Row } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { NavLink, Route, Switch, useRouteMatch } from 'react-router-dom'

import Profile from './Profile'
import Organization from './Organization'
import Organizations from './Organizations'
import OrganizationNew from './OrganizationNew'
import Tags from './Tags'
import Tag from './Tag'
import SettingsCSProfile from './CustomerServiceProfile'
import Members from './Members'
import Groups from './Groups'
import FAQs from './FAQs'
import FAQ from './FAQ'
import Categories from './Categories'
import Category from './Category'
import CategorySort from './CategorySort'
import DynamicContent from './DynamicContent'
import Trigger from './Rule/Trigger'
import Automation from './Rule/Automation'
import TicketField from './TicketField'

export default function Settings(props) {
  const { path } = useRouteMatch()
  const { t } = useTranslation()
  const childrenProps = {
    currentUser: props.currentUser,
    updateCurrentUser: props.updateCurrentUser,
    organizations: props.organizations,
    joinOrganization: props.joinOrganization,
    leaveOrganization: props.leaveOrganization,
  }

  return (
    <Row className="my-2">
      <Col md={3}>
        <Card>
          <Card.Header>{t('settings')}</Card.Header>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <NavLink to="/settings/profile">{t('personalSettings')}</NavLink>
            </ListGroup.Item>
            <ListGroup.Item>
              <NavLink to="/settings/organizations">{t('organizationSettings')}</NavLink>
            </ListGroup.Item>
          </ListGroup>
        </Card>
        {props.isCustomerService && (
          <Card>
            <Card.Header>{t('staffSettings')}</Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <NavLink to="/settings/customerServiceProfile">{t('personalSettings')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/members">{t('member')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/groups">{t('group')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/categories">{t('category')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/ticketField">{t('ticketField')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/tags">{t('tag')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/faqs">{t('FAQ')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/dynamicContent">{t('dynamicContent')}</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/triggers">Trigger</NavLink>
              </ListGroup.Item>
              <ListGroup.Item>
                <NavLink to="/settings/automations">Automation</NavLink>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        )}
      </Col>
      <Col md={9}>
        <Switch>
          <Route path={`${path}/profile`}>
            <Profile {...childrenProps} />
          </Route>
          <Route path={`${path}/organizations`} exact>
            <Organizations {...childrenProps} />
          </Route>
          <Route path={`${path}/organizations/new`}>
            <OrganizationNew {...childrenProps} />
          </Route>
          <Route path={`${path}/organizations/:id`}>
            <Organization {...childrenProps} />
          </Route>
          <Route path={`${path}/tags`} exact>
            <Tags {...childrenProps} />
          </Route>
          <Route path={`${path}/tags/:id`}>
            <Tag {...childrenProps} />
          </Route>
          <Route path={`${path}/customerServiceProfile`}>
            <SettingsCSProfile {...childrenProps} />
          </Route>
          <Route path={`${path}/members`}>
            <Members {...childrenProps} />
          </Route>
          <Route path={`${path}/groups`}>
            <Groups {...childrenProps} />
          </Route>
          <Route path={`${path}/faqs`} exact>
            <FAQs {...childrenProps} />
          </Route>
          <Route path={`${path}/faqs/:id`}>
            <FAQ {...childrenProps} />
          </Route>
          <Route path={`${path}/categories`} exact>
            <Categories {...childrenProps} />
          </Route>
          <Route path={`${path}/categories/:id`}>
            <Category {...childrenProps} />
          </Route>
          <Route path={`${path}/categorySort`}>
            <CategorySort {...childrenProps} />
          </Route>
          <Route path={`${path}/dynamicContent`}>
            <DynamicContent />
          </Route>
          <Route path={`${path}/triggers`}>
            <Trigger />
          </Route>
          <Route path={`${path}/automations`}>
            <Automation />
          </Route>
          <Route path={`${path}/ticketField`} component={TicketField} />
        </Switch>
      </Col>
    </Row>
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
}
